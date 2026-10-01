"""
Bootstraps the database: creates tables, one owner account, and the
category/discount lookup values used throughout the app.

Usage:
    python seed.py
"""
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.category import (
    Category, THERAPEUTIC_CATEGORIES, STORE_DEPARTMENTS,
)
from app.models.discount import Discount
from app.models.pharmacy_settings import PharmacySettings

app = create_app()

with app.app_context():
    db.create_all()

    if not User.query.filter_by(username="owner").first():
        owner = User(name="Anthony Wanjohi", username="owner", role="owner")
        owner.set_password("ChangeMe123!")
        db.session.add(owner)
        print("Created owner account -> username: owner / password: ChangeMe123!")

    for name in THERAPEUTIC_CATEGORIES:
        if not Category.query.filter_by(name=name, kind="therapeutic").first():
            db.session.add(Category(name=name, kind="therapeutic"))

    for name in STORE_DEPARTMENTS:
        if not Category.query.filter_by(name=name, kind="department").first():
            db.session.add(Category(name=name, kind="department"))

    if not Discount.query.first():
        db.session.add(Discount(name="Senior Citizen 10%", discount_type="percentage", value=10))
        db.session.add(Discount(name="Staff 5%", discount_type="percentage", value=5))

    if not PharmacySettings.query.first():
        db.session.add(PharmacySettings(
            pharmacy_name="Tawati Chemist",
            address="Main Commercial Street, Nairobi",
            phone="+254 700 123 456",
            ppb_license_no="PPB/RET/2024-884",
            kra_pin="P051992014Z",
            currency="KES",
        ))

    db.session.commit()
    print("Database seeded successfully.")
