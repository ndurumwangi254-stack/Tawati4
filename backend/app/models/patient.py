from datetime import datetime

from app.models.user import gen_uuid
from app.extensions import db


class Patient(db.Model):
    __tablename__ = "patients"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    patient_code = db.Column(db.String(30), unique=True)  # e.g. TC-PAT-1001
    full_name = db.Column(db.String(150), nullable=False)
    blood_group = db.Column(db.String(5))
    phone = db.Column(db.String(30))
    gender = db.Column(db.String(10))
    age = db.Column(db.Integer)
    address = db.Column(db.String(255))
    id_or_insurance_number = db.Column(db.String(60))

    created_by = db.Column(db.String(36), db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    allergies = db.relationship("PatientAllergy", backref="patient", cascade="all, delete-orphan")
    conditions = db.relationship("PatientCondition", backref="patient", cascade="all, delete-orphan")

    def to_dict(self, include_stats=None):
        data = {
            "id": self.id,
            "patient_code": self.patient_code,
            "full_name": self.full_name,
            "blood_group": self.blood_group,
            "phone": self.phone,
            "gender": self.gender,
            "age": self.age,
            "address": self.address,
            "id_or_insurance_number": self.id_or_insurance_number,
            "allergies": [a.allergen_name for a in self.allergies] or ["NKDA"],
            "conditions": [c.condition_name for c in self.conditions],
        }
        if include_stats:
            data.update(include_stats)
        return data


class PatientAllergy(db.Model):
    __tablename__ = "patient_allergies"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    patient_id = db.Column(db.String(36), db.ForeignKey("patients.id"), nullable=False)
    allergen_name = db.Column(db.String(120), nullable=False)


class PatientCondition(db.Model):
    __tablename__ = "patient_conditions"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    patient_id = db.Column(db.String(36), db.ForeignKey("patients.id"), nullable=False)
    condition_name = db.Column(db.String(120), nullable=False)
