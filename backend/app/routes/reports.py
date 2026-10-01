from flask import Blueprint, jsonify

from app.models.sale import Sale
from app.models.product import Product
from app.utils.decorators import owner_required

reports_bp = Blueprint("reports", __name__)


@reports_bp.get("/summary")
@owner_required
def summary():
    """Owner-only financial rollup: gross sales, COGS, gross profit, basket size."""
    sales = Sale.query.all()
    gross_sales = sum(float(s.total_amount) for s in sales)
    cogs = sum(float(s.cogs_total) for s in sales)
    gross_profit = gross_sales - cogs
    items_dispensed = sum(sum(i.quantity for i in s.items) for s in sales)
    avg_basket = round(gross_sales / len(sales), 2) if sales else 0

    retail_sales = [s for s in sales if s.sale_channel == "retail"]
    wholesale_sales = [s for s in sales if s.sale_channel == "wholesale"]

    return jsonify(
        gross_sales_revenue=gross_sales,
        cost_of_goods_sold=cogs,
        total_gross_profit=gross_profit,
        margin_pct=round(gross_profit / gross_sales * 100, 1) if gross_sales else 0,
        items_dispensed=items_dispensed,
        transactions=len(sales),
        average_basket_size=avg_basket,
        counter_retail_sales=sum(float(s.total_amount) for s in retail_sales),
        wholesale_institutional_sales=sum(float(s.total_amount) for s in wholesale_sales),
    )


@reports_bp.get("/inventory-valuation")
@owner_required
def inventory_valuation():
    """Owner-only: Inventory Asset Valuation & Working Capital Health."""
    products = Product.query.all()
    stock_at_cost = sum(float(p.cost_price) * p.stock_quantity for p in products)
    expected_retail = sum(float(p.selling_price) * p.stock_quantity for p in products)
    at_risk_expiry = sum(
        float(p.cost_price) * p.stock_quantity for p in products
        if p.days_to_expiry is not None and p.days_to_expiry <= 30
    )
    reorder_capital = sum(
        float(p.cost_price) * max(0, p.min_reorder_level - p.stock_quantity)
        for p in products if p.is_low_stock
    )
    return jsonify(
        stock_at_wholesale_cost=stock_at_cost,
        expected_retail_value=expected_retail,
        projected_stock_profit=expected_retail - stock_at_cost,
        at_risk_expiry_capital=at_risk_expiry,
        reorder_capital_needed=reorder_capital,
        catalog_skus_tracked=len(products),
    )


@reports_bp.get("/top-products")
@owner_required
def top_products():
    """Owner-only: Top Dispensed Medications & Margin."""
    from collections import defaultdict

    agg = defaultdict(lambda: {"units": 0, "revenue": 0.0, "cogs": 0.0, "name": ""})
    for sale in Sale.query.all():
        for item in sale.items:
            key = item.product_id
            agg[key]["units"] += item.quantity
            agg[key]["revenue"] += float(item.subtotal)
            agg[key]["cogs"] += float(item.unit_cost) * item.quantity
            agg[key]["name"] = item.product.name if item.product else "Unknown"

    rows = []
    for data in agg.values():
        profit = data["revenue"] - data["cogs"]
        rows.append({
            "name": data["name"],
            "units": data["units"],
            "revenue": round(data["revenue"], 2),
            "profit": round(profit, 2),
            "margin_pct": round(profit / data["revenue"] * 100, 1) if data["revenue"] else 0,
        })
    rows.sort(key=lambda r: r["revenue"], reverse=True)
    return jsonify(top_products=rows)
