from flask import Blueprint, request, jsonify
from sqlalchemy import func

from app.extensions import db
from app.models.product import Product
from app.models.supplier import Supplier, SUPPLIER_CATEGORIES, PAYMENT_TERMS
from app.utils.decorators import owner_required

suppliers_bp = Blueprint("suppliers", __name__)

TEXT_FIELDS = ("contact_person", "phone", "email", "address", "notes")


def _clean(payload):
    """Validate + normalise the fields shared by create and update."""
    errors = []
    data = {}
    for f in TEXT_FIELDS:
        if f in payload:
            data[f] = (payload.get(f) or "").strip() or None
    if "kra_pin" in payload:
        data["kra_pin"] = (payload.get("kra_pin") or "").strip().upper() or None
    if "category" in payload:
        if payload["category"] not in SUPPLIER_CATEGORIES:
            errors.append("category must be 'pharmaceuticals' or 'consumer'")
        else:
            data["category"] = payload["category"]
    if "payment_terms" in payload:
        terms = (payload.get("payment_terms") or "").strip() or None
        if terms and terms not in PAYMENT_TERMS:
            errors.append("Unknown payment terms")
        else:
            data["payment_terms"] = terms
    if data.get("email") and "@" not in data["email"]:
        errors.append("Email address doesn't look valid")
    return data, errors


def _find_by_name(name, exclude_id=None):
    q = Supplier.query.filter(func.lower(Supplier.name) == name.lower())
    if exclude_id:
        q = q.filter(Supplier.id != exclude_id)
    return q.first()


@suppliers_bp.get("")
@owner_required
def list_suppliers():
    """Owner-only — suppliers are cost-side information, same rule as cost
    price: never exposed to the Dispenser."""
    counts = dict(
        db.session.query(Product.supplier_id, func.count(Product.id))
        .filter(Product.supplier_id.isnot(None))
        .group_by(Product.supplier_id)
        .all()
    )
    suppliers = Supplier.query.order_by(Supplier.name).all()
    return jsonify(suppliers=[s.to_dict(items_count=counts.get(s.id, 0)) for s in suppliers])


@suppliers_bp.post("")
@owner_required
def create_supplier():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return jsonify(error="Supplier / company name is required"), 400

    # Same name (any capitalisation) -> hand back the existing one instead of
    # creating a duplicate. The Restock quick-add relies on this; the
    # Suppliers page uses `already_exists` to tell the owner.
    existing = _find_by_name(name)
    if existing:
        return jsonify(supplier=existing.to_dict(), already_exists=True), 200

    data, errors = _clean(payload)
    if errors:
        return jsonify(error="; ".join(errors)), 400

    supplier = Supplier(name=name, **data)
    db.session.add(supplier)
    db.session.commit()
    return jsonify(supplier=supplier.to_dict(items_count=0)), 201


@suppliers_bp.put("/<supplier_id>")
@owner_required
def update_supplier(supplier_id):
    supplier = Supplier.query.get_or_404(supplier_id)
    payload = request.get_json(silent=True) or {}

    if "name" in payload:
        name = (payload.get("name") or "").strip()
        if not name:
            return jsonify(error="Supplier / company name is required"), 400
        if _find_by_name(name, exclude_id=supplier.id):
            return jsonify(error="Another supplier already has that name"), 409
        supplier.name = name

    data, errors = _clean(payload)
    if errors:
        return jsonify(error="; ".join(errors)), 400
    for k, v in data.items():
        setattr(supplier, k, v)

    db.session.commit()
    return jsonify(supplier=supplier.to_dict())