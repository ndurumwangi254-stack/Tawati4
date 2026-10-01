from app.models.user import gen_uuid
from app.extensions import db


class PharmacySettings(db.Model):
    """Single-row table with pharmacy header info used on receipts and the status bar."""
    __tablename__ = "pharmacy_settings"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    pharmacy_name = db.Column(db.String(150), default="Tawati Chemist")
    address = db.Column(db.String(255))
    phone = db.Column(db.String(30))
    ppb_license_no = db.Column(db.String(60))
    kra_pin = db.Column(db.String(30))
    currency = db.Column(db.String(10), default="KES")

    def to_dict(self):
        return {
            "pharmacy_name": self.pharmacy_name,
            "address": self.address,
            "phone": self.phone,
            "ppb_license_no": self.ppb_license_no,
            "kra_pin": self.kra_pin,
            "currency": self.currency,
        }
