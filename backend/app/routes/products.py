from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.product import Product
from app.models.audit_log import AuditLog
from app.models.sale import SaleItem, SalePrescription
from app.utils.decorators import owner_required, current_role

products_bp = Blueprint("products", __name__)

PRODUCT_FIELDS = [
    "product_type", "name", "variant_description", "category_id", "barcode",
    "batch_number", "stock_quantity", "min_reorder_level", "cost_price",
    "selling_price", "supplier_id", "shelf_location", "storage_notes",
    "dosage_form", "strength_dosage", "requires_prescription",
    "units_per_pack", "pack_description", "packaging_unit_type",
    "pack_size_volume", "wholesale_unit_price", "min_wholesale_qty",
    "wholesale_bulk_packaging",
]


def _parse_date(value):
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()


@products_bp.get("")
@jwt_required()
def list_products():
    role = current_role()
    product_type = request.args.get("product_type")  # 'medication' | 'retail_item'
    search = request.args.get("search")
    category_id = request.args.get("category_id")
    low_stock = request.args.get("low_stock")
    expiry_watch = request.args.get("expiry_watch")

    query = Product.query
    if product_type:
        query = query.filter_by(product_type=product_type)
    if category_id:
        query = query.filter_by(category_id=category_id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(Product.name.ilike(like), Product.barcode.ilike(like),
                   Product.batch_number.ilike(like), Product.shelf_location.ilike(like))
        )

    products = query.order_by(Product.name).all()

    if low_stock == "true":
        products = [p for p in products if p.is_low_stock]
    if expiry_watch == "true":
        products = [p for p in products if p.days_to_expiry is not None and p.days_to_expiry <= 30]

    return jsonify(products=[p.to_dict(role=role) for p in products])


@products_bp.get("/<product_id>")
@jwt_required()
def get_product(product_id):
    role = current_role()
    product = Product.query.get_or_404(product_id)
    return jsonify(product=product.to_dict(role=role))


@products_bp.post("")
@owner_required
def create_product():
    """Add Item — owner-only."""
    payload = request.get_json(silent=True) or {}
    if not payload.get("name") or not payload.get("product_type"):
        return jsonify(error="name and product_type are required"), 400

    product = Product(**{k: payload.get(k) for k in PRODUCT_FIELDS if k in payload})
    product.expiry_date = _parse_date(payload.get("expiry_date"))
    db.session.add(product)
    db.session.flush()  # get product.id before commit

    # Initial Intake audit entry
    log = AuditLog(
        product_id=product.id,
        user_id=get_jwt_identity(),
        movement_type="initial_intake",
        quantity_delta=product.stock_quantity,
        balance_before=0,
        balance_after=product.stock_quantity,
        reference_code=None,
        reason="Initial stock intake",
    )
    db.session.add(log)
    db.session.commit()
    return jsonify(product=product.to_dict(role="owner")), 201


@products_bp.put("/<product_id>")
@owner_required
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    payload = request.get_json(silent=True) or {}
    stock_before = product.stock_quantity
    for field in PRODUCT_FIELDS:
        if field in payload:
            setattr(product, field, payload[field])
    if "expiry_date" in payload:
        product.expiry_date = _parse_date(payload["expiry_date"])
    product.updated_at = datetime.utcnow()

    # A stock figure changed through the Edit form (e.g. a typo fixed during
    # stocktaking) must still show up in the audit ledger.
    stock_after = product.stock_quantity
    if stock_after != stock_before:
        db.session.add(AuditLog(
            product_id=product.id,
            user_id=get_jwt_identity(),
            movement_type="adjusted",
            quantity_delta=stock_after - stock_before,
            balance_before=stock_before,
            balance_after=stock_after,
            reference_code=None,
            reason="Stock corrected via Edit Details (inventory-taking correction)",
        ))
    db.session.commit()
    return jsonify(product=product.to_dict(role="owner"))


@products_bp.delete("/<product_id>")
@owner_required
def delete_product(product_id):
    """Owner-only. Only allowed for items with no real history (e.g. added by mistake).

    Anything that has been sold, restocked or adjusted is part of the audit
    trail and must stay; for those the owner should write the remaining stock
    off with a Stock Adjustment instead.
    """
    product = Product.query.get_or_404(product_id)

    has_sales = (
        SaleItem.query.filter_by(product_id=product.id).first() is not None
        or SalePrescription.query.filter_by(product_id=product.id).first() is not None
    )
    other_movements = AuditLog.query.filter(
        AuditLog.product_id == product.id,
        AuditLog.movement_type != "initial_intake",
    ).first() is not None

    if has_sales or other_movements:
        return jsonify(
            error=(
                f"{product.name} has sales or stock-movement history, so it can't be deleted "
                "without breaking the audit trail. Use Stock Adjustment / Write-off to clear "
                "the remaining stock instead."
            )
        ), 409

    # Only the initial-intake entry exists — remove it together with the item.
    AuditLog.query.filter_by(product_id=product.id).delete()
    db.session.delete(product)
    db.session.commit()
    return jsonify(message="Product deleted"), 200
