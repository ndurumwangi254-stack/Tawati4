from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.category import Category
from app.utils.decorators import owner_required

categories_bp = Blueprint("categories", __name__)


@categories_bp.get("")
@jwt_required()
def list_categories():
    kind = request.args.get("kind")  # 'therapeutic' | 'department'
    query = Category.query
    if kind:
        query = query.filter_by(kind=kind)
    return jsonify(categories=[c.to_dict() for c in query.order_by(Category.name).all()])


@categories_bp.post("")
@owner_required
def create_category():
    payload = request.get_json(silent=True) or {}
    if not payload.get("name") or payload.get("kind") not in ("therapeutic", "department"):
        return jsonify(error="name and a valid kind are required"), 400
    cat = Category(name=payload["name"], kind=payload["kind"])
    db.session.add(cat)
    db.session.commit()
    return jsonify(category=cat.to_dict()), 201
