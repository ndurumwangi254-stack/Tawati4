from app.models.user import gen_uuid
from app.extensions import db

SUPPLIER_CATEGORIES = ("pharmaceuticals", "consumer")
PAYMENT_TERMS = ("Cash on Delivery", "7 Days Credit", "14 Days Credit", "30 Days Net", "60 Days Net")


class Supplier(db.Model):
    __tablename__ = "suppliers"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(150), nullable=False)
    contact_person = db.Column(db.String(120))
    phone = db.Column(db.String(30))
    email = db.Column(db.String(120))
    address = db.Column(db.String(255))  # depot / physical location

    # 'pharmaceuticals' (Rx & OTC meds) or 'consumer' (toiletries, front-shop goods)
    category = db.Column(db.String(30), nullable=False, default="pharmaceuticals", server_default="pharmaceuticals")
    payment_terms = db.Column(db.String(30))   # one of PAYMENT_TERMS
    kra_pin = db.Column(db.String(20))
    notes = db.Column(db.Text)                 # ordering info, delivery days, minimum order…

    def to_dict(self, items_count=None):
        data = {
            "id": self.id,
            "name": self.name,
            "contact_person": self.contact_person,
            "phone": self.phone,
            "email": self.email,
            "address": self.address,
            "category": self.category,
            "payment_terms": self.payment_terms,
            "kra_pin": self.kra_pin,
            "notes": self.notes,
        }
        if items_count is not None:
            data["items_count"] = items_count
        return data