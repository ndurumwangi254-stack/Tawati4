from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.user import User
from app.utils.decorators import owner_required

users_bp = Blueprint("users", __name__)


@users_bp.get("")
@owner_required
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify(users=[u.to_dict() for u in users])


@users_bp.post("")
@owner_required
def create_user():
    """Only the owner may create employee (Dispenser) accounts."""
    payload = request.get_json(silent=True) or {}
    required = ["name", "username", "password"]
    if not all(payload.get(f) for f in required):
        return jsonify(error="name, username and password are required"), 400

    if User.query.filter_by(username=payload["username"]).first():
        return jsonify(error="That username is already taken"), 409

    user = User(
        name=payload["name"],
        username=payload["username"],
        role=payload.get("role", "dispenser"),  # owner can also seed another owner if truly needed
        phone=payload.get("phone"),
        created_by=get_jwt_identity(),
    )
    user.set_password(payload["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify(user=user.to_dict()), 201


@users_bp.patch("/<user_id>/deactivate")
@owner_required
def deactivate_user(user_id):
    from datetime import datetime

    user = User.query.get_or_404(user_id)
    user.is_active = False
    user.deactivated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(user=user.to_dict())


@users_bp.patch("/<user_id>/reactivate")
@owner_required
def reactivate_user(user_id):
    user = User.query.get_or_404(user_id)
    user.is_active = True
    user.deactivated_at = None
    db.session.commit()
    return jsonify(user=user.to_dict())
