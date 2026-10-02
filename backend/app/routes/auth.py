from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt

from app.extensions import db
from app.models.user import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = payload.get("username", "").strip()
    password = payload.get("password", "")

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify(error="Invalid username or password"), 401
    if not user.is_active:
        return jsonify(error="This account has been deactivated. Contact the owner."), 403

    token = create_access_token(
        identity=user.id,
        additional_claims={"role": user.role, "name": user.name},
    )
    return jsonify(access_token=token, user=user.to_dict())


@auth_bp.get("/me")
@jwt_required()
def me():
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify(error="User not found"), 404
    return jsonify(user=user.to_dict())

@auth_bp.post("/change-password")
@jwt_required()
def change_password():
    """Any logged-in user (owner or dispenser) can change their own
    password — they just have to prove they know the current one first."""
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify(error="User not found"), 404

    payload = request.get_json(silent=True) or {}
    current_password = payload.get("current_password", "")
    new_password = payload.get("new_password", "")

    if not user.check_password(current_password):
        return jsonify(error="Current password is incorrect"), 400
    if len(new_password) < 8:
        return jsonify(error="New password must be at least 8 characters"), 400
    if new_password == current_password:
        return jsonify(error="New password must be different from the current one"), 400

    user.set_password(new_password)
    user.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(message="Password updated successfully")