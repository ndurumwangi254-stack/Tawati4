from datetime import datetime

from app.models.user import gen_uuid
from app.extensions import db


class Discount(db.Model):
    """
    Preset by the owner only. A dispenser may SELECT one of these at POS
    but can never create a custom discount value.
    """
    __tablename__ = "discounts"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(80), nullable=False)          # e.g. "Senior Citizen 10%"
    discount_type = db.Column(db.String(20), nullable=False)  # 'percentage' | 'fixed_amount'
    value = db.Column(db.Numeric(10, 2), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.String(36), db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "discount_type": self.discount_type,
            "value": float(self.value),
            "is_active": self.is_active,
        }
