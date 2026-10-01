from datetime import datetime

from app.models.user import gen_uuid
from app.extensions import db


class Sale(db.Model):
    """
    One unified sales table for both channels:
      sale_channel = 'retail' | 'wholesale'
    Retail rows populate patient_id (nullable = walk-in);
    wholesale rows populate wholesale_customer_id instead.
    """
    __tablename__ = "sales"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    receipt_number = db.Column(db.String(30), unique=True, nullable=False)  # TC-REC-#### / TC-WS-####
    sale_channel = db.Column(db.String(20), nullable=False, default="retail")

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)  # who processed it
    patient_id = db.Column(db.String(36), db.ForeignKey("patients.id"), nullable=True)
    wholesale_customer_id = db.Column(db.String(36), db.ForeignKey("wholesale_customers.id"), nullable=True)

    prescription_ref = db.Column(db.String(40))
    discount_id = db.Column(db.String(36), db.ForeignKey("discounts.id"), nullable=True)

    subtotal = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    discount_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    tax_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    total_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    payment_method = db.Column(db.String(20), nullable=False)  # 'cash' | 'mpesa'
    amount_paid = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    change_given = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    cogs_total = db.Column(db.Numeric(12, 2), nullable=False, default=0)  # owner-only in serialization

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship("SaleItem", backref="sale", cascade="all, delete-orphan")
    prescriptions = db.relationship("SalePrescription", backref="sale", cascade="all, delete-orphan")
    patient = db.relationship("Patient")
    wholesale_customer = db.relationship("WholesaleCustomer")
    dispenser = db.relationship("User")

    @property
    def gross_profit(self):
        return float(self.total_amount) - float(self.cogs_total)

    def to_dict(self, role="owner"):
        data = {
            "id": self.id,
            "receipt_number": self.receipt_number,
            "sale_channel": self.sale_channel,
            "date_time": self.created_at.isoformat() if self.created_at else None,
            "dispenser": self.dispenser.name if self.dispenser else None,
            "customer_name": (
                self.wholesale_customer.business_name if self.sale_channel == "wholesale" and self.wholesale_customer
                else (self.patient.full_name if self.patient else "Walk-in Customer")
            ),
            "prescription_ref": self.prescription_ref,
            "payment_method": self.payment_method,
            "items_count": sum(i.quantity for i in self.items),
            "subtotal": float(self.subtotal),
            "discount_amount": float(self.discount_amount),
            "tax_amount": float(self.tax_amount),
            "total_amount": float(self.total_amount),
            "amount_paid": float(self.amount_paid),
            "change_given": float(self.change_given),
            "items": [i.to_dict(role=role) for i in self.items],
        }
        if role == "owner":
            data.update({
                "cogs_total": float(self.cogs_total),
                "gross_profit": self.gross_profit,
                "margin_pct": round((self.gross_profit / float(self.total_amount) * 100), 1) if self.total_amount else 0,
            })
        return data


class SaleItem(db.Model):
    __tablename__ = "sale_items"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    sale_id = db.Column(db.String(36), db.ForeignKey("sales.id"), nullable=False)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False)   # price actually charged (retail or wholesale rate)
    unit_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0)  # owner-only in serialization
    subtotal = db.Column(db.Numeric(12, 2), nullable=False)

    product = db.relationship("Product")

    def to_dict(self, role="owner"):
        data = {
            "id": self.id,
            "product_id": self.product_id,
            "name": self.product.name if self.product else None,
            "strength_dosage": self.product.strength_dosage if self.product else None,
            "batch_number": self.product.batch_number if self.product else None,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price),
            "subtotal": float(self.subtotal),
        }
        if role == "owner":
            data["unit_cost"] = float(self.unit_cost)
        return data


class SalePrescription(db.Model):
    """Prescription details logged per sale (linked to a Patient, not free text)."""
    __tablename__ = "sale_prescriptions"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    sale_id = db.Column(db.String(36), db.ForeignKey("sales.id"), nullable=False)
    patient_id = db.Column(db.String(36), db.ForeignKey("patients.id"))
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"))
    prescribing_doctor = db.Column(db.String(120))
    doctor_license_no = db.Column(db.String(60))
    notes = db.Column(db.Text)
