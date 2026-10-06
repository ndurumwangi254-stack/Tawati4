"""Tawati Chemist — Flask application factory."""
from flask import Flask, jsonify
from flask_cors import CORS

from app.config import get_config
from app.extensions import db, migrate, jwt, bcrypt


def create_app(config_name=None):
    app = Flask(__name__)
    app.config.from_object(get_config(config_name))

    # --- extensions ---
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    CORS(app, supports_credentials=True, origins=app.config["CORS_ORIGINS"])

    # --- blueprints ---
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.categories import categories_bp
    from app.routes.products import products_bp
    from app.routes.batches import batches_bp
    from app.routes.patients import patients_bp
    from app.routes.discounts import discounts_bp
    from app.routes.sales import sales_bp
    from app.routes.wholesale import wholesale_bp
    from app.routes.reports import reports_bp
    from app.routes.audit_log import audit_bp
    from app.routes.pharmacy import pharmacy_bp
    from app.routes.suppliers import suppliers_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(batches_bp, url_prefix="/api/batches")
    app.register_blueprint(patients_bp, url_prefix="/api/patients")
    app.register_blueprint(discounts_bp, url_prefix="/api/discounts")
    app.register_blueprint(sales_bp, url_prefix="/api/sales")
    app.register_blueprint(wholesale_bp, url_prefix="/api/wholesale")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(audit_bp, url_prefix="/api/audit-log")
    app.register_blueprint(pharmacy_bp, url_prefix="/api/pharmacy")
    app.register_blueprint(suppliers_bp, url_prefix="/api/suppliers")

    @app.get("/api/health")
    def health():
        return jsonify(status="ok", app="Tawati Chemist API")

    # --- error handlers ---
    @app.errorhandler(404)
    def not_found(e):
        return jsonify(error="Not found"), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify(error="Internal server error"), 500

    return app
