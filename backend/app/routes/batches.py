from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.product import Product
from app.models.audit_log import AuditLog
from app.utils.decorators import owner_required

batches_bp = Blueprint("batches", __name__)


def _parse_date(value):
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()


@batches_bp.post("/<product_id>/restock")
@owner_required
def restock(product_id):
    """Owner-only: 'Restock Medication' — receive incoming stock from a distributor.

    Matches the Restock modal: quantity to add, optionally updated batch/lot
    number, expiry date, cost price, retail selling price, distributor, and
    a supplier invoice / delivery note reference.
    """
    product = Product.query.get_or_404(product_id)
    payload = request.get_json(silent=True) or {}
    quantity = int(payload.get("quantity", 0))
    if quantity <= 0:
        return jsonify(error="quantity must be a positive integer"), 400

    balance_before = product.stock_quantity
    product.stock_quantity += quantity

    if payload.get("batch_number"):
        product.batch_number = payload["batch_number"]
    if payload.get("expiry_date"):
        product.expiry_date = _parse_date(payload["expiry_date"])
    if payload.get("cost_price") is not None:
        product.cost_price = payload["cost_price"]
    if payload.get("selling_price") is not None:
        product.selling_price = payload["selling_price"]
    if payload.get("supplier_id"):
        product.supplier_id = payload["supplier_id"]
    product.updated_at = datetime.utcnow()

    log = AuditLog(
        product_id=product.id,
        user_id=get_jwt_identity(),
        movement_type="restocked",
        quantity_delta=quantity,
        balance_before=balance_before,
        balance_after=product.stock_quantity,
        reference_code=payload.get("reference_code"),  # supplier invoice / delivery note #
        reason=payload.get("reason", "Weekly replenishment shipment"),
    )
    db.session.add(log)
    db.session.commit()
    return jsonify(product=product.to_dict(role="owner"))


@batches_bp.post("/<product_id>/adjust")
@owner_required
def adjust(product_id):
    """Owner-only: manual correction (damaged, expired write-off, stock count fix)."""
    product = Product.query.get_or_404(product_id)
    payload = request.get_json(silent=True) or {}
    quantity_delta = int(payload.get("quantity_delta", 0))
    reason = payload.get("reason")
    if quantity_delta == 0 or not reason:
        return jsonify(error="quantity_delta (non-zero) and reason are required"), 400

    balance_before = product.stock_quantity
    product.stock_quantity = max(0, product.stock_quantity + quantity_delta)

    log = AuditLog(
        product_id=product.id,
        user_id=get_jwt_identity(),
        movement_type="adjusted",
        quantity_delta=quantity_delta,
        balance_before=balance_before,
        balance_after=product.stock_quantity,
        reference_code=payload.get("reference_code"),
        reason=reason,
    )
    db.session.add(log)
    db.session.commit()
    return jsonify(product=product.to_dict(role="owner"))
