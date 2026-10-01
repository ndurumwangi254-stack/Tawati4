from flask import Blueprint, request, jsonify

from app.models.audit_log import AuditLog
from app.utils.decorators import owner_required

audit_bp = Blueprint("audit_log", __name__)


@audit_bp.get("")
@owner_required
def list_audit_log():
    movement_type = request.args.get("movement_type")  # initial_intake|dispensed|restocked|adjusted
    search = request.args.get("search")

    query = AuditLog.query
    if movement_type:
        query = query.filter_by(movement_type=movement_type)

    logs = query.order_by(AuditLog.created_at.desc()).all()

    if search:
        s = search.lower()
        logs = [
            l for l in logs
            if s in (l.product.name.lower() if l.product else "")
            or s in (l.reference_code or "").lower()
            or s in (l.user.name.lower() if l.user else "")
        ]

    return jsonify(audit_log=[l.to_dict() for l in logs])
