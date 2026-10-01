from flask import Blueprint, request, jsonify

from app.extensions import db
from app.models.supplier import Supplier
from app.utils.decorators import owner_required

suppliers_bp = Blueprint("suppliers", __name__)


@suppliers_bp.get("")
@owner_required
def list_suppliers():
    suppliers = Supplier.query.order_by(Supplier.name).all()
    return jsonify(suppliers=[s.to_dict() for s in suppliers])


@suppliers_bp.post("")
@owner_required
def create_supplier():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return jsonify(error="Supplier name is required"), 400
    existing = Supplier.query.filter(db.func.lower(Supplier.name) == name.lower()).first()
    if existing:
        return jsonify(supplier=existing.to_dict()), 200
    supplier = Supplier(
        name=name,
        contact_person=payload.get("contact_person"),
        phone=payload.get("phone"),
        email=payload.get("email"),
        address=payload.get("address"),
    )
    db.session.add(supplier)
    db.session.commit()
    return jsonify(supplier=supplier.to_dict()), 201
