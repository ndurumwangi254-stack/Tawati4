from app.models.user import gen_uuid
from app.extensions import db

THERAPEUTIC_CATEGORIES = [
    "Antibiotics", "Analgesics & Pain", "Antimalarials", "Respiratory",
    "Gastrointestinal", "Cardiovascular & Diabetes", "Dermatology & Topicals",
    "Vitamins & OTC",
]

STORE_DEPARTMENTS = [
    "Personal Care & Toiletries", "Baby Care & Mother", "Cosmetics & Skincare",
    "First Aid & Devices", "Hygiene & Sanitary", "Beverages & Health Snacks",
]

DOSAGE_FORMS = [
    "Tablets", "Capsules", "Syrup/Suspension", "Inhaler",
    "Ointment/Cream", "Drops", "Injectable",
]

PACKAGING_UNIT_TYPES = [
    "Piece/Unit", "Bottle/Pack", "Tube/Bar", "Box/Packet", "Roll/Sachet", "Can/Tin",
]


class Category(db.Model):
    """
    One table for both category sets, distinguished by `kind`:
    kind='therapeutic' -> used by medications
    kind='department'  -> used by shop/retail items
    """
    __tablename__ = "categories"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(120), nullable=False)
    kind = db.Column(db.String(20), nullable=False)  # 'therapeutic' | 'department'

    __table_args__ = (
        db.UniqueConstraint("name", "kind", name="uq_category_name_kind"),
    )

    def to_dict(self):
        return {"id": self.id, "name": self.name, "kind": self.kind}
