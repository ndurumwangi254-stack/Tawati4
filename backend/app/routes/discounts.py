from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.discount import Discount
from app.utils.decorators import owner_required

discounts_bp = Blueprint("discounts", __name__)


@discounts_bp.get("")
@jwt_required()
def list_discounts():
    """Both roles can list active discounts to select at POS."""
    active_only = request.args.get("active_only", "true") == "true"
    query = Discount.query
    if active_only:
        query = query.filter_by(is_active=True)
    return jsonify(discounts=[d.to_dict() for d in query.order_by(Discount.name).all()])


@discounts_bp.post("")
@owner_required
def create_discount():
    """Only the owner may create/preset a discount — Dispenser can only select one at POS."""
    payload = request.get_json(silent=True) or {}
    if not payload.get("name") or payload.get("discount_type") not in ("percentage", "fixed_amount"):
        return jsonify(error="name and a valid discount_type are required"), 400

    discount = Discount(
        name=payload["name"],
        discount_type=payload["discount_type"],
        value=payload.get("value", 0),
        created_by=get_jwt_identity(),
    )
    db.session.add(discount)
    db.session.commit()
    return jsonify(discount=discount.to_dict()), 201


@discounts_bp.patch("/<discount_id>")
@owner_required
def update_discount(discount_id):
    discount = Discount.query.get_or_404(discount_id)
    payload = request.get_json(silent=True) or {}
    for field in ("name", "discount_type", "value", "is_active"):
        if field in payload:
            setattr(discount, field, payload[field])
    db.session.commit()
    return jsonify(discount=discount.to_dict())
