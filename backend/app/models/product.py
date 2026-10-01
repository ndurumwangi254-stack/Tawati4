from datetime import datetime

from app.models.user import gen_uuid
from app.extensions import db

# Fields that must NEVER be sent to a dispenser role.
OWNER_ONLY_PRODUCT_FIELDS = {
    "cost_price",
    "wholesale_unit_price",
    "min_wholesale_qty",
    "wholesale_bulk_packaging",
    "supplier_id",
}


class Product(db.Model):
    """
    Unified product table for both classifications:
      product_type = 'medication' | 'retail_item'

    Stock, reorder level and all prices for medications are tracked
    PER TABLET/CAPSULE (or per base unit for liquids/inhalers etc.);
    `units_per_pack` is only a display/packaging convenience.
    """
    __tablename__ = "products"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    product_type = db.Column(db.String(20), nullable=False)  # 'medication' | 'retail_item'

    # Shared / common fields
    name = db.Column(db.String(200), nullable=False)          # Brand/Drug Name or Product/Brand Name
    variant_description = db.Column(db.String(255))           # generic name OR variant/description
    category_id = db.Column(db.String(36), db.ForeignKey("categories.id"))
    barcode = db.Column(db.String(64))
    batch_number = db.Column(db.String(64))
    expiry_date = db.Column(db.Date)
    stock_quantity = db.Column(db.Integer, nullable=False, default=0)
    min_reorder_level = db.Column(db.Integer, nullable=False, default=0)

    cost_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)      # owner-only
    selling_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)   # visible to all

    supplier_id = db.Column(db.String(36), db.ForeignKey("suppliers.id"))     # owner-only
    shelf_location = db.Column(db.String(120))  # Dispensary Shelf OR Aisle/Shelf/Display Rack
    storage_notes = db.Column(db.Text)

    # Medication-only fields
    dosage_form = db.Column(db.String(40))
    strength_dosage = db.Column(db.String(60))
    requires_prescription = db.Column(db.Boolean, default=False)
    units_per_pack = db.Column(db.Integer)          # e.g. 10 tablets per blister strip
    pack_description = db.Column(db.String(120))    # e.g. "Blister strip of 10"

    # Retail-item-only fields
    packaging_unit_type = db.Column(db.String(40))  # Piece/Unit, Bottle/Pack, etc.
    pack_size_volume = db.Column(db.String(60))      # e.g. "500 ml"

    # Wholesale & Bulk Pricing Tier (owner-only)
    wholesale_unit_price = db.Column(db.Numeric(12, 2))
    min_wholesale_qty = db.Column(db.Integer)
    wholesale_bulk_packaging = db.Column(db.String(120))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = db.relationship("Category")
    supplier = db.relationship("Supplier")

    # --- computed helpers ---
    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.min_reorder_level

    @property
    def is_expired(self):
        return bool(self.expiry_date and self.expiry_date < datetime.utcnow().date())

    @property
    def days_to_expiry(self):
        if not self.expiry_date:
            return None
        return (self.expiry_date - datetime.utcnow().date()).days

    def to_dict(self, role="owner"):
        data = {
            "id": self.id,
            "product_type": self.product_type,
            "name": self.name,
            "variant_description": self.variant_description,
            "category_id": self.category_id,
            "category": self.category.name if self.category else None,
            "barcode": self.barcode,
            "batch_number": self.batch_number,
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "stock_quantity": self.stock_quantity,
            "min_reorder_level": self.min_reorder_level,
            "selling_price": float(self.selling_price) if self.selling_price is not None else None,
            "shelf_location": self.shelf_location,
            "storage_notes": self.storage_notes,
            "dosage_form": self.dosage_form,
            "strength_dosage": self.strength_dosage,
            "requires_prescription": self.requires_prescription,
            "units_per_pack": self.units_per_pack,
            "pack_description": self.pack_description,
            "packaging_unit_type": self.packaging_unit_type,
            "pack_size_volume": self.pack_size_volume,
            "is_low_stock": self.is_low_stock,
            "is_expired": self.is_expired,
            "days_to_expiry": self.days_to_expiry,
        }
        if role == "owner":
            data.update({
                "cost_price": float(self.cost_price) if self.cost_price is not None else None,
                "supplier_id": self.supplier_id,
                "supplier": self.supplier.name if self.supplier else None,
                "wholesale_unit_price": float(self.wholesale_unit_price) if self.wholesale_unit_price is not None else None,
                "min_wholesale_qty": self.min_wholesale_qty,
                "wholesale_bulk_packaging": self.wholesale_bulk_packaging,
            })
        return data
