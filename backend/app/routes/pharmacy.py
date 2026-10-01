from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.pharmacy_settings import PharmacySettings
from app.utils.decorators import owner_required

pharmacy_bp = Blueprint("pharmacy", __name__)


def _get_or_create_settings():
    settings = PharmacySettings.query.first()
    if not settings:
        settings = PharmacySettings()
        db.session.add(settings)
        db.session.commit()
    return settings


@pharmacy_bp.get("/settings")
@jwt_required()
def get_settings():
    return jsonify(settings=_get_or_create_settings().to_dict())


@pharmacy_bp.put("/settings")
@owner_required
def update_settings():
    settings = _get_or_create_settings()
    payload = request.get_json(silent=True) or {}
    for field in ("pharmacy_name", "address", "phone", "ppb_license_no", "kra_pin", "currency"):
        if field in payload:
            setattr(settings, field, payload[field])
    db.session.commit()
    return jsonify(settings=settings.to_dict())
