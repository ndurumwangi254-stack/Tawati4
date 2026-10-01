"""
Loads realistic demo data for a client presentation: medications, retail
items, suppliers, patients, a dispenser account, retail + wholesale sales,
and matching audit log entries.

Run seed.py FIRST (creates tables, the owner account, categories and
discounts), then run this:

    python seed.py
    python seed_demo.py
"""
import random
from datetime import date, datetime, timedelta

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.category import Category
from app.models.supplier import Supplier
from app.models.product import Product
from app.models.patient import Patient, PatientAllergy, PatientCondition
from app.models.wholesale import WholesaleCustomer
from app.models.discount import Discount
from app.models.sale import Sale, SaleItem, SalePrescription
from app.models.audit_log import AuditLog

app = create_app()
today = date.today()


def cat(name, kind):
    return Category.query.filter_by(name=name, kind=kind).first()


def add_audit(product, user, movement_type, delta, before, after, ref, reason):
    db.session.add(AuditLog(
        product_id=product.id, user_id=user.id, movement_type=movement_type,
        quantity_delta=delta, balance_before=before, balance_after=after,
        reference_code=ref, reason=reason,
        created_at=datetime.utcnow() - timedelta(days=random.randint(0, 20)),
    ))


with app.app_context():
    owner = User.query.filter_by(username="owner").first()
    if not owner:
        raise SystemExit("Run `python seed.py` first — no owner account found.")

    # ---------------------------------------------------------------
    # Dispenser account (matches the screenshots: Faith Muthoni)
    # ---------------------------------------------------------------
    dispenser = User.query.filter_by(username="dispenser").first()
    if not dispenser:
        dispenser = User(
            name="Faith Muthoni", username="dispenser", role="dispenser",
            phone="+254 733 221 004", created_by=owner.id,
        )
        dispenser.set_password("ChangeMe123!")
        db.session.add(dispenser)
        db.session.flush()
        print("Created dispenser account -> username: dispenser / password: ChangeMe123!")

    # ---------------------------------------------------------------
    # Suppliers
    # ---------------------------------------------------------------
    supplier_names = [
        ("GlaxoSmithKline (GSK)", "Ken Otiende", "+254 20 444 0100", "orders@gsk-ke.com"),
        ("Novartis Pharma", "Ann Kioko", "+254 20 271 0200", "supply@novartis.co.ke"),
        ("Reckitt Benckiser", "Sam Wafula", "+254 20 366 0300", "kenya@reckitt.com"),
        ("Harleys Pharma Ltd", "Peter Njue", "+254 20 828 0400", "sales@harleys.co.ke"),
        ("Unilever / P&G East Africa", "Lucy Mwende", "+254 20 699 0500", "retail@unileverea.com"),
    ]
    suppliers = {}
    for name, contact, phone, email in supplier_names:
        s = Supplier.query.filter_by(name=name).first()
        if not s:
            s = Supplier(name=name, contact_person=contact, phone=phone, email=email)
            db.session.add(s)
            db.session.flush()
        suppliers[name] = s

    # ---------------------------------------------------------------
    # Medications (name, generic, category, form, strength, batch,
    #  expiry_days, stock, reorder, cost, sell, wholesale, moq, shelf,
    #  supplier, rx, units_per_pack, pack_desc)
    # ---------------------------------------------------------------
    meds = [
        ("Amoxicillin Capsules", "Amoxicillin Trihydrate", "Antibiotics", "Capsules", "500 mg",
         "BN-2026-081", 550, 140, 30, 450, 750, 560, 50, "Shelf A-01", "Harleys Pharma Ltd", True, 10, "Blister strip of 10"),
        ("Augmentin Tablets", "Amoxicillin + Clavulanic Acid", "Antibiotics", "Tablets", "625 mg",
         "BN-2025-142", 11, 18, 25, 1600, 2400, 1950, 14, "Shelf A-02", "GlaxoSmithKline (GSK)", True, 14, "Clinic Carton (5 boxes)"),
        ("Ciprofloxacin Tablets", "Ciprofloxacin HCl", "Antibiotics", "Tablets", "500 mg",
         "BN-2026-890", 386, 65, 25, 420, 700, 560, 25, "Shelf A-03", "Novartis Pharma", True, 10, "Blister strip of 10"),
        ("Panadol Advance", "Paracetamol", "Analgesics & Pain", "Tablets", "500 mg",
         "BN-2026-019", 509, 350, 50, 80, 150, 105, 10, "OTC Front Rack 1", "GlaxoSmithKline (GSK)", False, 10, "Dispensary Box (5 strips of 10)"),
        ("Brufen Tablets", "Ibuprofen", "Analgesics & Pain", "Tablets", "400 mg",
         "BN-2025-992", 300, 85, 20, 220, 380, 275, 10, "Shelf B-03", "GlaxoSmithKline (GSK)", False, 10, "Outer Pack (5 strips of 10)"),
        ("Coartem Adult 80/480", "Artemether + Lumefantrine", "Antimalarials", "Tablets", "80/480 mg",
         "BN-2026-112", 442, 45, 15, 550, 900, 690, 6, "Shelf C-02", "Novartis Pharma", True, 24, "Dispensary Pack (2 boxes)"),
        ("Coartem Dispersible", "Artemether + Lumefantrine", "Antimalarials", "Tablets", "20/120 mg",
         "BN-2025-301", 57, 8, 20, 550, 900, 690, 6, "Shelf C-01", "Novartis Pharma", True, 6, "Clinic Outer Pack"),
        ("Cetirizine Tablets", "Cetirizine Hydrochloride", "Respiratory", "Tablets", "10 mg",
         "BN-2026-055", 493, 120, 25, 150, 300, 200, 10, "Shelf B-01", "GlaxoSmithKline (GSK)", False, 10, "Box of 100 (5 strips of 20)"),
        ("Ventolin Evohaler", "Salbutamol Sulphate", "Respiratory", "Inhaler", "100 mcg/dose",
         "BN-2025-410", 236, 5, 15, 950, 1500, 1150, 3, "Dispensary Drawer R-1", "GlaxoSmithKline (GSK)", True, None, "Case of 5 Inhalers"),
        ("Omeprazole Capsules", "Omeprazole Gastro-resistant", "Gastrointestinal", "Capsules", "20 mg",
         "BN-2025-722", 171, 95, 20, 350, 600, 460, 20, "Shelf D-01", "Harleys Pharma Ltd", False, 14, "Outer Box (3 boxes of 14)"),
        ("Gaviscon Double Action Liquid", "Sodium Alginate + Sodium Bicarb", "Gastrointestinal", "Syrup/Suspension", "200 ml bottle",
         "BN-2025-103", -40, 4, 10, 850, 1300, 1020, 1, "Quarantine / Shelf D-04", "Reckitt Benckiser", False, None, "Case of 6 Bottles"),
        ("Amlodipine Besylate", "Amlodipine", "Cardiovascular & Diabetes", "Tablets", "5 mg",
         "BN-2026-441", 356, 160, 30, 320, 550, 420, 50, "Shelf E-03", "Harleys Pharma Ltd", True, 10, "Blister strip of 10"),
        ("Metformin Hydrochloride", "Metformin HCl", "Cardiovascular & Diabetes", "Tablets", "500 mg",
         "BN-2026-309", 427, 210, 40, 280, 500, 380, 40, "Shelf E-02", "Harleys Pharma Ltd", True, 10, "Blister strip of 10"),
        ("Clotrimazole 1% Cream", "Clotrimazole", "Dermatology & Topicals", "Ointment/Cream", "20 g tube",
         "BN-2025-618", 6, 22, 15, 180, 320, 240, 1, "Shelf F-01", "Reckitt Benckiser", False, None, None),
        ("Redoxon Effervescent Vitamin C + Zinc", "Ascorbic Acid + Zinc", "Vitamins & OTC", "Tablets", "1000 mg (15s)",
         "BN-2026-778", 645, 75, 20, 750, 1200, 940, 10, "Front Counter Display", "GlaxoSmithKline (GSK)", False, 15, "Tube of 15"),
    ]

    products_by_name = {}
    for (name, generic, cat_name, form, strength, batch, exp_days, stock, reorder,
         cost, sell, wholesale, moq, shelf, supplier_name, rx, upp, pack_desc) in meds:
        p = Product.query.filter_by(name=name, product_type="medication").first()
        if p:
            products_by_name[name] = p
            continue
        p = Product(
            product_type="medication", name=name, variant_description=generic,
            category_id=cat(cat_name, "therapeutic").id if cat(cat_name, "therapeutic") else None,
            barcode=str(random.randint(6000000000000, 6009999999999)),
            batch_number=batch, expiry_date=today + timedelta(days=exp_days),
            stock_quantity=stock, min_reorder_level=reorder,
            cost_price=cost, selling_price=sell,
            supplier_id=suppliers[supplier_name].id, shelf_location=shelf,
            dosage_form=form, strength_dosage=strength, requires_prescription=rx,
            units_per_pack=upp, pack_description=pack_desc,
            wholesale_unit_price=wholesale, min_wholesale_qty=moq,
            wholesale_bulk_packaging=f"Outer Pack (MOQ {moq})",
        )
        db.session.add(p)
        db.session.flush()
        products_by_name[name] = p
        add_audit(p, owner, "initial_intake", stock, 0, stock, "PO-2026-001",
                  "Initial stock intake from quarterly audit")

    # ---------------------------------------------------------------
    # Retail / shop items
    # ---------------------------------------------------------------
    retail_items = [
        ("Always Ultra Night Sanitary Towels", "14 Pads", "Hygiene & Sanitary", "Box/Packet",
         "8001090623091", 1072, 85, 25, 160, 260, "Aisle 3 - Feminine Care", "Unilever / P&G East Africa"),
        ("Beurer Digital Clinical Thermometer", "Waterproof 10-Second Flexible Tip", "First Aid & Devices", "Piece/Unit",
         "4211125791102", 1925, 16, 5, 450, 750, "Front Counter Glass Case", "Harleys Pharma Ltd"),
        ("Colgate Total Toothpaste", "140 g Tube", "Personal Care & Toiletries", "Tube/Bar",
         "6006038678743", 900, 40, 10, 150, 250, "Aisle 1 - Front Counter", "Unilever / P&G East Africa"),
        ("Pampers Diapers Size 4 Maxi", "44 Pcs", "Baby Care & Mother", "Box/Packet",
         "6001648395594", 700, 22, 8, 850, 1300, "Aisle 2 - Baby Care", "Unilever / P&G East Africa"),
        ("Nivea Men Sensitive Roll-On Deodorant", "50 ml", "Cosmetics & Skincare", "Bottle/Pack",
         "6003886768275", 620, 30, 10, 220, 420, "Front Counter - Grooming", "Unilever / P&G East Africa"),
        ("Dettol Original Antibacterial Bar Soap", "175 g", "Hygiene & Sanitary", "Tube/Bar",
         "6001090001234", 800, 60, 20, 90, 180, "Aisle 1 - Soaps & Hygiene", "Reckitt Benckiser"),
        ("Hospital Grade Cotton Wool Roll", "500 g", "First Aid & Devices", "Roll/Sachet",
         "6001090005678", 730, 28, 10, 200, 380, "Aisle 3 - First Aid & Cotton", "Harleys Pharma Ltd"),
    ]
    for (name, variant, dept, pkg, barcode, exp_days, stock, reorder, cost, sell, shelf, supplier_name) in retail_items:
        if Product.query.filter_by(name=name, product_type="retail_item").first():
            continue
        p = Product(
            product_type="retail_item", name=name, variant_description=variant,
            category_id=cat(dept, "department").id if cat(dept, "department") else None,
            barcode=barcode, batch_number=f"BN-2026-RET{random.randint(10,99)}",
            expiry_date=today + timedelta(days=exp_days),
            stock_quantity=stock, min_reorder_level=reorder,
            cost_price=cost, selling_price=sell,
            supplier_id=suppliers[supplier_name].id, shelf_location=shelf,
            packaging_unit_type=pkg,
            wholesale_unit_price=round(sell * 0.78, 2), min_wholesale_qty=6,
            wholesale_bulk_packaging="Shrink Pack of 6",
        )
        db.session.add(p)
        db.session.flush()
        add_audit(p, owner, "initial_intake", stock, 0, stock, "PO-2026-002",
                  "Initial shop stock intake")

    db.session.commit()

    # ---------------------------------------------------------------
    # Patients (matching TC-PAT-1001..1007 from the mockups)
    # ---------------------------------------------------------------
    patients_data = [
        ("TC-PAT-1001", "James Kariuki", "O+", "+254 722 345 678", "Male", 45,
         "Nairobi West, Langata Road A...", "SHA-9842103-N", ["Penicillin", "Amoxicillin"], ["Hypertension"]),
        ("TC-PAT-1002", "Grace Otieno", "A+", "+254 733 987 654", "Female", 32,
         "South B, Plainsview Estate Hse...", "AAR-77821-POL", [], ["Bronchial Asthma"]),
        ("TC-PAT-1003", "Samuel Ochieng", "B+", "+254 711 234 567", "Male", 51,
         "Upper Hill, Hospital Road Suites", "ID-24890123", ["Aspirin / NSAIDs"], ["Peptic Ulcer Disease (PUD)"]),
        ("TC-PAT-1004", "Beatrice Wambui", "O+", "+254 728 554 123", "Female", 28,
         "Kileleshwa, Gatundu Road", "SHA-6610294-K", [], []),
        ("TC-PAT-1005", "Peter Kimani", "A+", "+254 720 112 233", "Male", 59,
         "Kilimani, Chania Avenue", "JUB-88210-MED", ["Sulfa Drugs (Sulfonamides)"], ["Type 2 Diabetes", "Hypertension"]),
        ("TC-PAT-1006", "Mary Nekesa", "AB+", "+254 715 889 900", "Female", 24,
         "Madaraka Estate, Block 8 Apt 3", "SHA-1109432-W", ["Sulfa Drugs (Sulfonamides)", "Erythromycin"], ["Atopic Dermatitis"]),
        ("TC-PAT-1007", "Dr. Evans Mutua", "O-", "+254 702 445 566", "Male", 38,
         "Lavington, James Gichuru Road", "ID-28765432", [], []),
    ]
    patients_by_code = {}
    for code, name, blood, phone, gender, age, address, idno, allergies, conditions in patients_data:
        pt = Patient.query.filter_by(patient_code=code).first()
        if not pt:
            pt = Patient(
                patient_code=code, full_name=name, blood_group=blood, phone=phone,
                gender=gender, age=age, address=address, id_or_insurance_number=idno,
                created_by=owner.id,
            )
            db.session.add(pt)
            db.session.flush()
            for a in allergies:
                db.session.add(PatientAllergy(patient_id=pt.id, allergen_name=a))
            for c in conditions:
                db.session.add(PatientCondition(patient_id=pt.id, condition_name=c))
        patients_by_code[code] = pt
    db.session.commit()

    # ---------------------------------------------------------------
    # Wholesale customers
    # ---------------------------------------------------------------
    wholesale_data = [
        ("St. Jude Community Hospital & Clinic", "Dr. Kennedy Otieno", "+254 722 890 120",
         "P051289410Z", "PPB/CLIN/2024-119", "Health Plaza, Suite 4B"),
        ("Huruma Community Health Centre", "Dr. Ann Wanjiku", "+254 733 445 220",
         "P049982211X", "PPB/CLIN/2023-087", "Huruma Estate, Dispensary Road"),
    ]
    wholesale_customers = {}
    for biz, contact, phone, pin, license_no, addr in wholesale_data:
        wc = WholesaleCustomer.query.filter_by(business_name=biz).first()
        if not wc:
            wc = WholesaleCustomer(
                business_name=biz, contact_person=contact, phone=phone,
                kra_pin=pin, ppb_health_license=license_no, delivery_address=addr,
            )
            db.session.add(wc)
            db.session.flush()
        wholesale_customers[biz] = wc
    db.session.commit()

    discounts = Discount.query.all()

    # ---------------------------------------------------------------
    # Retail sales
    # ---------------------------------------------------------------
    def make_sale(receipt, channel, dispenser_user, patient=None, wholesale_customer=None,
                   items=None, payment_method="cash", prescription_ref=None, days_ago=0):
        if Sale.query.filter_by(receipt_number=receipt).first():
            return
        subtotal = sum(q * price for _, q, price, _ in items)
        cogs = sum(q * cost for _, q, _, cost in items)
        sale = Sale(
            receipt_number=receipt, sale_channel=channel, user_id=dispenser_user.id,
            patient_id=patient.id if patient else None,
            wholesale_customer_id=wholesale_customer.id if wholesale_customer else None,
            prescription_ref=prescription_ref,
            subtotal=subtotal, discount_amount=0, tax_amount=0, total_amount=subtotal,
            payment_method=payment_method, amount_paid=subtotal, change_given=0,
            cogs_total=cogs,
            created_at=datetime.utcnow() - timedelta(days=days_ago),
        )
        db.session.add(sale)
        db.session.flush()
        for product, qty, price, cost in items:
            db.session.add(SaleItem(
                sale_id=sale.id, product_id=product.id, quantity=qty,
                unit_price=price, unit_cost=cost, subtotal=qty * price,
            ))
            before = product.stock_quantity
            product.stock_quantity = max(0, before - qty)
            add_audit(product, dispenser_user, "dispensed", -qty, before,
                      product.stock_quantity, receipt.replace("TC-", ""),
                      "Prescription dispensing" if product.requires_prescription else "Walk-in / OTC sale")
        return sale

    ventolin = products_by_name["Ventolin Evohaler"]
    panadol = products_by_name["Panadol Advance"]
    amox = products_by_name["Amoxicillin Capsules"]
    augmentin = products_by_name["Augmentin Tablets"]

    make_sale("TC-REC-2026-1042", "retail", dispenser, patient=patients_by_code["TC-PAT-1001"],
              items=[(amox, 10, 75, 45)], payment_method="mpesa",
              prescription_ref="RX-9821-NAI", days_ago=15)

    make_sale("TC-REC-2026-1043", "retail", owner, patient=patients_by_code["TC-PAT-1002"],
              items=[(ventolin, 3, 1500, 950), (panadol, 2, 150, 80)],
              payment_method="cash", prescription_ref="RX-7712-RES", days_ago=15)

    make_sale("TC-REC-2026-1048", "retail", dispenser, patient=patients_by_code["TC-PAT-1006"],
              items=[(panadol, 4, 150, 80)], payment_method="mpesa", days_ago=6)

    make_sale("TC-REC-2026-1049", "retail", dispenser,
              items=[(amox, 5, 75, 45)], payment_method="cash",
              prescription_ref="RX-7721-RES", days_ago=5)

    make_sale("TC-REC-2026-1050", "retail", dispenser, patient=patients_by_code["TC-PAT-1004"],
              items=[(panadol, 4, 150, 80)], payment_method="mpesa", days_ago=4)

    # ---------------------------------------------------------------
    # Wholesale sales (owner-only channel)
    # ---------------------------------------------------------------
    make_sale("TC-WS-2026-0881", "wholesale", owner,
              wholesale_customer=wholesale_customers["St. Jude Community Hospital & Clinic"],
              items=[(augmentin, 20, 1950, 1600), (amox, 60, 560, 450)],
              payment_method="mpesa", days_ago=3)

    make_sale("TC-WS-2026-0882", "wholesale", owner,
              wholesale_customer=wholesale_customers["Huruma Community Health Centre"],
              items=[(panadol, 300, 105, 80)],
              payment_method="cash", days_ago=2)

    # Stock adjustment example (owner-only action)
    gaviscon = products_by_name["Gaviscon Double Action Liquid"]
    before = gaviscon.stock_quantity
    gaviscon.stock_quantity = max(0, before - 2)
    add_audit(gaviscon, owner, "adjusted", -2, before, gaviscon.stock_quantity,
              "ADJ-DMG-08", "Damaged during shelf reorganization (seal broken)")

    # Restock example
    panadol_before = panadol.stock_quantity
    panadol.stock_quantity = panadol_before + 100
    add_audit(panadol, owner, "restocked", 100, panadol_before, panadol.stock_quantity,
              "INV-LAB-492", "Weekly replenishment shipment")

    db.session.commit()
    print("Demo data loaded: 15 medications, 7 retail items, 7 patients, "
          "2 wholesale customers, 7 sales (5 retail + 2 wholesale), and a dispenser account.")
    print("Dispenser login -> username: dispenser / password: ChangeMe123!")
