from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.wholesale import WholesaleCustomer
from app.models.audit_log import AuditLog
from app.utils.decorators import owner_required
from app.routes.sales import _next_receipt_number

wholesale_bp = Blueprint("wholesale", __name__)


@wholesale_bp.get("/customers")
@owner_required
def list_customers():
    customers = WholesaleCustomer.query.order_by(WholesaleCustomer.business_name).all()
    return jsonify(customers=[c.to_dict() for c in customers])


@wholesale_bp.post("/customers")
@owner_required
def create_customer():
    payload = request.get_json(silent=True) or {}
    if not payload.get("business_name"):
        return jsonify(error="business_name is required"), 400
    customer = WholesaleCustomer(
        business_name=payload["business_name"],
        contact_person=payload.get("contact_person"),
        phone=payload.get("phone"),
        kra_pin=payload.get("kra_pin"),
        ppb_health_license=payload.get("ppb_health_license"),
        delivery_address=payload.get("delivery_address"),
    )
    db.session.add(customer)
    db.session.commit()
    return jsonify(customer=customer.to_dict()), 201


@wholesale_bp.post("/orders")
@owner_required
def create_wholesale_order():
    """
    Owner-only: B2B bulk order at wholesale pricing (auto-applied once MOQ is met).
    """
    payload = request.get_json(silent=True) or {}
    items_payload = payload.get("items", [])
    if not items_payload:
        return jsonify(error="At least one item is required"), 400

    payment_method = payload.get("payment_method")
    if payment_method not in ("cash", "mpesa"):
        return jsonify(error="payment_method must be 'cash' or 'mpesa'"), 400

    customer_id = payload.get("wholesale_customer_id")
    if not customer_id or not WholesaleCustomer.query.get(customer_id):
        return jsonify(error="A valid wholesale_customer_id is required"), 400

    sale = Sale(
        receipt_number=_next_receipt_number("TC-WS"),
        sale_channel="wholesale",
        user_id=get_jwt_identity(),
        wholesale_customer_id=customer_id,
        payment_method=payment_method,
    )
    db.session.add(sale)
    db.session.flush()

    subtotal, cogs_total = 0.0, 0.0

    for line in items_payload:
        product = Product.query.get(line["product_id"])
        if not product:
            db.session.rollback()
            return jsonify(error=f"Product {line['product_id']} not found"), 404

        quantity = int(line["quantity"])
        if product.stock_quantity < quantity:
            db.session.rollback()
            return jsonify(error=f"Insufficient stock for {product.name}"), 409

        meets_moq = product.min_wholesale_qty and quantity >= product.min_wholesale_qty
        unit_price = float(product.wholesale_unit_price) if meets_moq and product.wholesale_unit_price else float(product.selling_price)
        line_subtotal = round(unit_price * quantity, 2)
        subtotal += line_subtotal
        cogs_total += float(product.cost_price) * quantity

        balance_before = product.stock_quantity
        product.stock_quantity -= quantity

        db.session.add(SaleItem(
            sale_id=sale.id, product_id=product.id, quantity=quantity,
            unit_price=unit_price, unit_cost=product.cost_price, subtotal=line_subtotal,
        ))
        db.session.add(AuditLog(
            product_id=product.id, user_id=get_jwt_identity(), movement_type="dispensed",
            quantity_delta=-quantity, balance_before=balance_before, balance_after=product.stock_quantity,
            reference_code=sale.receipt_number, reason="Wholesale/B2B order",
        ))

    sale.subtotal = subtotal
    sale.total_amount = subtotal
    sale.amount_paid = subtotal
    sale.cogs_total = cogs_total

    db.session.commit()
    return jsonify(sale=sale.to_dict(role="owner")), 201
