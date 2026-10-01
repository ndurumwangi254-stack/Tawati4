import uuid
from datetime import datetime

from app.extensions import db, bcrypt


def gen_uuid():
    return str(uuid.uuid4())


class User(db.Model):
    """
    Owner and Dispenser (employee) accounts.
    Only the owner may create or deactivate other users (enforced in routes).
    """
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(120), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="dispenser")  # 'owner' | 'dispenser'
    phone = db.Column(db.String(30))
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    created_by = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    deactivated_at = db.Column(db.DateTime, nullable=True)

    def set_password(self, raw_password):
        self.password_hash = bcrypt.generate_password_hash(raw_password).decode("utf-8")

    def check_password(self, raw_password):
        return bcrypt.check_password_hash(self.password_hash, raw_password)

    @property
    def is_owner(self):
        return self.role == "owner"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "username": self.username,
            "role": self.role,
            "phone": self.phone,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "deactivated_at": self.deactivated_at.isoformat() if self.deactivated_at else None,
        }
