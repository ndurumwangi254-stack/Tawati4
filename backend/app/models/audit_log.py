from datetime import datetime

from app.models.user import gen_uuid
from app.extensions import db

MOVEMENT_TYPES = ("initial_intake", "dispensed", "restocked", "adjusted")


class AuditLog(db.Model):
    """
    Stock Movement & Audit Ledger. Owner-only visibility.
    One row per stock-affecting event (sale, restock, manual adjustment, initial intake).
    """
    __tablename__ = "audit_log"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)

    movement_type = db.Column(db.String(20), nullable=False)  # see MOVEMENT_TYPES
    quantity_delta = db.Column(db.Integer, nullable=False)     # +ve or -ve
    balance_before = db.Column(db.Integer, nullable=False)
    balance_after = db.Column(db.Integer, nullable=False)

    reference_code = db.Column(db.String(40))   # e.g. REC-2026-1043, PO-2026-001, ADJ-DMG-08
    reason = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    product = db.relationship("Product")
    user = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "date_time": self.created_at.isoformat() if self.created_at else None,
            "movement_type": self.movement_type,
            "product": self.product.name if self.product else None,
            "quantity_delta": self.quantity_delta,
            "balance_before": self.balance_before,
            "balance_after": self.balance_after,
            "reference_code": self.reference_code,
            "reason": self.reason,
            "performed_by": self.user.name if self.user else None,
        }
