from datetime import datetime

from app.models.user import gen_uuid
from app.extensions import db


class WholesaleCustomer(db.Model):
    """Institutional buyers for B2B sales — owner-only feature."""
    __tablename__ = "wholesale_customers"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    business_name = db.Column(db.String(200), nullable=False)
    contact_person = db.Column(db.String(120))
    phone = db.Column(db.String(30))
    kra_pin = db.Column(db.String(30))
    ppb_health_license = db.Column(db.String(60))
    delivery_address = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "business_name": self.business_name,
            "contact_person": self.contact_person,
            "phone": self.phone,
            "kra_pin": self.kra_pin,
            "ppb_health_license": self.ppb_health_license,
            "delivery_address": self.delivery_address,
        }
