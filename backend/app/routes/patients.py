import itertools

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.patient import Patient, PatientAllergy, PatientCondition
from app.models.sale import Sale
from app.utils.decorators import owner_required

patients_bp = Blueprint("patients", __name__)

_code_counter = itertools.count(1001)


def _next_patient_code():
    last = Patient.query.order_by(Patient.created_at.desc()).first()
    n = 1001
    if last and last.patient_code and "-" in last.patient_code:
        try:
            n = int(last.patient_code.rsplit("-", 1)[-1]) + 1
        except ValueError:
            pass
    return f"TC-PAT-{n}"


def _patient_stats(patient_id):
    sales = Sale.query.filter_by(patient_id=patient_id).all()
    visits = len(sales)
    amount_spent = sum(float(s.total_amount) for s in sales)
    last_visit = max((s.created_at for s in sales), default=None)
    return {
        "visits": visits,
        "amount_spent": amount_spent,
        "last_visit": last_visit.isoformat() if last_visit else None,
    }


@patients_bp.get("")
@jwt_required()
def list_patients():
    search = request.args.get("search")
    query = Patient.query
    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(Patient.full_name.ilike(like), Patient.phone.ilike(like),
                   Patient.patient_code.ilike(like))
        )
    patients = query.order_by(Patient.created_at.desc()).all()
    return jsonify(patients=[p.to_dict(include_stats=_patient_stats(p.id)) for p in patients])


@patients_bp.get("/<patient_id>")
@jwt_required()
def get_patient(patient_id):
    patient = Patient.query.get_or_404(patient_id)
    return jsonify(patient=patient.to_dict(include_stats=_patient_stats(patient.id)))


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

    for field in ("full_name", "blood_group", "phone", "gender", "age",
                  "address", "id_or_insurance_number"):
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
