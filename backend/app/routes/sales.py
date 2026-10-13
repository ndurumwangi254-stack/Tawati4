from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.product import Product
from app.models.sale import Sale, SaleItem, SalePrescription
from app.models.discount import Discount
from app.models.audit_log import AuditLog
from app.utils.decorators import current_role, owner_required

sales_bp = Blueprint("sales", __name__)


def _next_receipt_number(prefix):
    year = datetime.utcnow().year
    count = Sale.query.filter(Sale.receipt_number.like(f"{prefix}-{year}-%")).count() + 1
    return f"{prefix}-{year}-{1000 + count}"


def _apply_discount(subtotal, discount):
    if not discount:
        return 0
    if discount.discount_type == "percentage":
        return round(float(subtotal) * float(discount.value) / 100, 2)
    return min(float(discount.value), float(subtotal))  # fixed_amount, never negative total


@sales_bp.post("")
@jwt_required()
def create_sale():
    """
    Create a RETAIL sale (walk-in or registered patient).
    Both the owner and the Dispenser can create these — Dispenser cannot
    edit/delete afterwards (no PUT/DELETE routes are exposed for Sale).
    """
    payload = request.get_json(silent=True) or {}
    items_payload = payload.get("items", [])
    if not items_payload:
        return jsonify(error="At least one item is required"), 400

    payment_method = payload.get("payment_method")
    if payment_method not in ("cash", "mpesa"):
        return jsonify(error="payment_method must be 'cash' or 'mpesa'"), 400

        # Optional refill tracking — only meaningful on a prescription sale.
    days_of_supply = payload.get("days_of_supply")
    refill_due_date = None
    if days_of_supply:
        try:
            days_of_supply = int(days_of_supply)
            refill_due_date = (datetime.utcnow() + timedelta(days=days_of_supply)).date()
        except (TypeError, ValueError):
            return jsonify(error="days_of_supply must be a whole number"), 400
    discount = None
    if payload.get("discount_id"):
        discount = Discount.query.filter_by(id=payload["discount_id"], is_active=True).first()
        if not discount:
            return jsonify(error="Selected discount is not valid or is inactive"), 400

    sale = Sale(
        receipt_number=_next_receipt_number("TC-REC"),
        sale_channel="retail",
        user_id=get_jwt_identity(),
        patient_id=payload.get("patient_id"),
        prescription_ref=payload.get("prescription_ref"),
        days_of_supply=days_of_supply,
        refill_due_date=refill_due_date,
        payment_method=payment_method,
    )
    db.session.add(sale)
    db.session.flush()

    subtotal = 0.0
    cogs_total = 0.0

    for line in items_payload:
        product = Product.query.get(line["product_id"])
        if not product:
            db.session.rollback()
            return jsonify(error=f"Product {line['product_id']} not found"), 404

        quantity = int(line["quantity"])
        if quantity <= 0:
            db.session.rollback()
            return jsonify(error="Quantity must be positive"), 400
        if product.stock_quantity < quantity:
            db.session.rollback()
            return jsonify(error=f"Insufficient stock for {product.name}"), 409

        unit_price = float(product.selling_price)
        line_subtotal = round(unit_price * quantity, 2)
        subtotal += line_subtotal
        cogs_total += float(product.cost_price) * quantity

        balance_before = product.stock_quantity
        product.stock_quantity -= quantity

        db.session.add(SaleItem(
            sale_id=sale.id, product_id=product.id, quantity=quantity,
            unit_price=unit_price, unit_cost=product.cost_price, subtotal=line_subtotal,
        ))
        db.session.add(AuditLog(
            product_id=product.id, user_id=get_jwt_identity(), movement_type="dispensed",
            quantity_delta=-quantity, balance_before=balance_before, balance_after=product.stock_quantity,
            reference_code=sale.receipt_number, reason="POS dispensing",
        ))

    # Prescription linkage, if provided
    for rx in payload.get("prescriptions", []):
        db.session.add(SalePrescription(
            sale_id=sale.id, patient_id=payload.get("patient_id"),
            product_id=rx.get("product_id"),
            prescribing_doctor=rx.get("prescribing_doctor"),
            doctor_license_no=rx.get("doctor_license_no"),
            notes=rx.get("notes"),
        ))

    discount_amount = _apply_discount(subtotal, discount)
    total_amount = round(subtotal - discount_amount, 2)
    amount_paid = float(payload.get("amount_paid", total_amount))

    if payment_method == "cash" and amount_paid < total_amount:
        db.session.rollback()
        return jsonify(error="Amount received is less than the total payable"), 400

    change_given = round(amount_paid - total_amount, 2) if payment_method == "cash" else 0

    sale.discount_id = discount.id if discount else None
    sale.subtotal = subtotal
    sale.discount_amount = discount_amount
    sale.total_amount = total_amount
    sale.amount_paid = amount_paid if payment_method == "cash" else total_amount
    sale.change_given = change_given
    sale.cogs_total = cogs_total

    db.session.commit()
    return jsonify(sale=sale.to_dict(role=current_role(), viewer_id=get_jwt_identity())), 201


@sales_bp.get("")
@jwt_required()
def list_sales():
    """
    Unified retail + wholesale ledger. A Dispenser only ever sees retail
    sales here (wholesale is exposed separately under /api/wholesale and
    is owner-only), and never sees cogs/gross-profit/margin fields.
    """
    role = current_role()
    query = Sale.query
    if role != "owner":
        query = query.filter_by(sale_channel="retail")
    channel = request.args.get("channel")
    if channel:
        query = query.filter_by(sale_channel=channel)

    sales = query.order_by(Sale.created_at.desc()).all()
    viewer_id = get_jwt_identity()
    return jsonify(sales=[s.to_dict(role=role, viewer_id=viewer_id) for s in sales])


@sales_bp.get("/<sale_id>")
@jwt_required()
def get_sale(sale_id):
    role = current_role()
    sale = Sale.query.get_or_404(sale_id)
    if role != "owner" and sale.sale_channel != "retail":
        return jsonify(error="Forbidden"), 403
    return jsonify(sale=sale.to_dict(role=role, viewer_id=get_jwt_identity()))

@sales_bp.post("/<sale_id>/void")
@jwt_required()
def void_sale(sale_id):
    """
    Void a sale instead of editing/deleting it, so the record stays honest.

    - Owner: any sale, any time.
    - Dispenser: only their OWN retail sale, on the same (East Africa) day.
    The items go back into stock, an audit-log entry is written for each, and
    the sale is kept on file marked VOID (excluded from reports and stats).
    """
    role = current_role()
    user_id = get_jwt_identity()
    sale = Sale.query.get_or_404(sale_id)

    if role != "owner" and sale.sale_channel != "retail":
        return jsonify(error="Forbidden"), 403
    if sale.status == "voided":
        return jsonify(error="This sale has already been voided"), 409

    payload = request.get_json(silent=True) or {}
    reason = (payload.get("reason") or "").strip()
    if len(reason) < 3:
        return jsonify(error="A reason for voiding is required"), 400

    if not sale.can_be_voided_by(user_id, role):
        return jsonify(
            error="You can only void your own sales, on the day they were made. "
                  "Ask the owner to void older sales."
        ), 403

    for item in sale.items:
        product = item.product
        if not product:
            continue
        before = product.stock_quantity
        product.stock_quantity = before + item.quantity
        db.session.add(AuditLog(
            product_id=product.id,
            user_id=user_id,
            movement_type="voided",
            quantity_delta=item.quantity,
            balance_before=before,
            balance_after=product.stock_quantity,
            reference_code=sale.receipt_number,
            reason=f"Sale voided: {reason}"[:255],
        ))

    sale.status = "voided"
    sale.voided_at = datetime.utcnow()
    sale.voided_by = user_id
    sale.void_reason = reason[:255]
    sale.refill_due_date = None  # a voided sale must never trigger a refill reminder
    db.session.commit()
    return jsonify(sale=sale.to_dict(role=role, viewer_id=user_id))