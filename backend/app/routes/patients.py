from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.patient import Patient, PatientAllergy, PatientCondition
from app.models.sale import Sale
from app.utils.decorators import owner_required

patients_bp = Blueprint("patients", __name__)


def _next_patient_code():
    last = Patient.query.order_by(Patient.created_at.desc()).first()
    n = 1001
    if last and last.patient_code and "-" in last.patient_code:
        try:
            n = int(last.patient_code.rsplit("-", 1)[-1]) + 1
        except ValueError:
            pass
    return f"TC-PAT-{n}"


def _empty_stats():
    return {"visits": 0, "amount_spent": 0.0, "last_visit": None}


def _patient_stats_bulk(patient_ids):
    """Return {patient_id: stats} using a single query for all patients."""
    stats = {pid: _empty_stats() for pid in patient_ids}
    if not patient_ids:
        return stats

    sales = Sale.query.filter(
        Sale.patient_id.in_(patient_ids),
        Sale.status == "completed",
    ).all()

    last_visits = {}
    for s in sales:
        entry = stats[s.patient_id]
        entry["visits"] += 1
        entry["amount_spent"] += float(s.total_amount or 0)
        if s.created_at and (
            s.patient_id not in last_visits or s.created_at > last_visits[s.patient_id]
        ):
            last_visits[s.patient_id] = s.created_at

    for pid, dt in last_visits.items():
        stats[pid]["last_visit"] = dt.isoformat()

    return stats


def _patient_stats(patient_id):
    return _patient_stats_bulk([patient_id])[patient_id]


@patients_bp.get("")
@jwt_required()
def list_patients():
    search = request.args.get("search")
    query = Patient.query
    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(
                Patient.full_name.ilike(like),
                Patient.phone.ilike(like),
                Patient.patient_code.ilike(like),
            )
        )
    patients = query.order_by(Patient.created_at.desc()).all()
    stats = _patient_stats_bulk([p.id for p in patients])
    return jsonify(patients=[p.to_dict(include_stats=stats[p.id]) for p in patients])


@patients_bp.get("/<patient_id>")
@jwt_required()
def get_patient(patient_id):
    patient = Patient.query.get_or_404(patient_id)
    return jsonify(patient=patient.to_dict(include_stats=_patient_stats(patient.id)))


@patients_bp.get("/<patient_id>/history")
@jwt_required()
def patient_dispensing_history(patient_id):
    """Date dispensed, drugs dispensed, and refill-due date (if any) for
    every visit - this is what the Dispenser sees on a patient's record."""
    Patient.query.get_or_404(patient_id)  # 404 if the patient doesn't exist
    sales = (
        Sale.query.filter_by(patient_id=patient_id)
        .order_by(Sale.created_at.desc())
        .all()
    )
    history = [
        {
            "sale_id": s.id,
            "receipt_number": s.receipt_number,
            "date_dispensed": s.created_at.isoformat() if s.created_at else None,
            "dispensed_by": s.dispenser.name if s.dispenser else None,
            "drugs_dispensed": [
                {"name": i.product.name if i.product else "Unknown", "quantity": i.quantity}
                for i in s.items
            ],
            "prescription_ref": s.prescription_ref,
            "days_of_supply": s.days_of_supply,
            "refill_due_date": s.refill_due_date.isoformat() if s.refill_due_date else None,
            "status": s.status,
            "void_reason": s.void_reason,
        }
        for s in sales
    ]
    return jsonify(history=history)


@patients_bp.post("")
@jwt_required()
def create_patient():
    """Both owner and Dispenser can register a new patient."""
    payload = request.get_json(silent=True) or {}
    if not payload.get("full_name"):
        return jsonify(error="full_name is required"), 400

    patient = Patient(
        patient_code=_next_patient_code(),
        full_name=payload["full_name"],
        blood_group=payload.get("blood_group"),
        phone=payload.get("phone"),
        gender=payload.get("gender"),
        age=payload.get("age"),
        address=payload.get("address"),
        id_or_insurance_number=payload.get("id_or_insurance_number"),
        created_by=get_jwt_identity(),
    )
    db.session.add(patient)
    db.session.flush()

    for allergen in payload.get("allergies", []):
        db.session.add(PatientAllergy(patient_id=patient.id, allergen_name=allergen))
    for condition in payload.get("conditions", []):
        db.session.add(PatientCondition(patient_id=patient.id, condition_name=condition))

    db.session.commit()
    return jsonify(patient=patient.to_dict(include_stats=_patient_stats(patient.id))), 201


@patients_bp.put("/<patient_id>")
@jwt_required()
def update_patient(patient_id):
    """Both owner and Dispenser can edit patient details."""
    patient = Patient.query.get_or_404(patient_id)
    payload = request.get_json(silent=True) or {}

    for field in (
        "full_name", "blood_group", "phone", "gender", "age",
        "address", "id_or_insurance_number",
    ):
        if field in payload:
            setattr(patient, field, payload[field])

    if "allergies" in payload:
        PatientAllergy.query.filter_by(patient_id=patient.id).delete()
        for allergen in payload["allergies"]:
            db.session.add(PatientAllergy(patient_id=patient.id, allergen_name=allergen))

    if "conditions" in payload:
        PatientCondition.query.filter_by(patient_id=patient.id).delete()
        for condition in payload["conditions"]:
            db.session.add(PatientCondition(patient_id=patient.id, condition_name=condition))

    db.session.commit()
    return jsonify(patient=patient.to_dict(include_stats=_patient_stats(patient.id)))


@patients_bp.delete("/<patient_id>")
@owner_required
def delete_patient(patient_id):
    """Deleting a patient record is owner-only."""
    patient = Patient.query.get_or_404(patient_id)
    db.session.delete(patient)
    db.session.commit()
    return jsonify(message="Patient deleted")