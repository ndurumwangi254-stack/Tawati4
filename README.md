# Tawati Chemist — Inventory & POS System

Full-stack pharmacy inventory, POS, patient records, and wholesale/B2B
management system for Tawati Chemist, with strict role-based access
between the **Owner** and the **Dispenser** (employee).

**Stack:** React (Vite) · Flask · PostgreSQL · JWT authentication

---

## 1. Roles at a glance

| | Owner | Dispenser (employee) |
|---|---|---|
| Cost price, wholesale price, supplier, valuation, reports/margins | ✅ | ❌ |
| Selling price, stock levels, low-stock/expiry alerts | ✅ | ✅ |
| Add / edit / delete products, manual stock adjustments, restock | ✅ | ❌ |
| Dispense a retail sale (Cash or M-Pesa only) | ✅ | ✅ |
| Apply a preset discount at POS | ✅ | ✅ (cannot create discounts) |
| Wholesale/B2B sales | ✅ | ❌ |
| Patients & Records (view/create/edit) | ✅ | ✅ |
| Delete a patient record | ✅ | ❌ |
| Create/deactivate employee accounts | ✅ | ❌ |
| Stock Audit Log, Reports & Profit Margins | ✅ | ❌ (Dispenser gets "Days of Supply & Refills" separately) |

Every one of these rules is enforced **server-side** (JWT role claim +
`@owner_required` decorators + role-aware serializers) — the frontend
hides UI accordingly, but the API is the real gatekeeper.

---

## 2. Backend setup (Flask + PostgreSQL)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # then edit DATABASE_URL / secrets

# Create the database (adjust to your local Postgres setup)
createdb tawati_chemist

# Initialize tables
flask --app run.py shell -c "from app.extensions import db; db.create_all()"
# or, once you set up Flask-Migrate:
#   flask --app run.py db init
#   flask --app run.py db migrate -m "initial schema"
#   flask --app run.py db upgrade

# Seed the first owner account + lookup data (categories, discounts)
python seed.py

# Optional: load realistic demo data for a client presentation
# (15 medications, 7 retail items, 7 patients, 2 wholesale clients,
#  a dispenser account, and a mix of retail + wholesale sales)
python seed_demo.py

# Run the dev server
python run.py        # http://localhost:5000
```

Default seeded login (change the password immediately):
- **Owner:** username `owner` / password `ChangeMe123!`

There is no default Dispenser account from `seed.py` alone — by design, only
the owner can create employee accounts. If you ran `seed_demo.py`, a demo
Dispenser account is included:
- **Dispenser:** username `dispenser` / password `ChangeMe123!`

Otherwise, log in as the owner first and create the Dispenser login from the
**Users** page in the app.

## 3. Frontend setup (React + Vite)

```bash
cd frontend
npm install
cp .env.example .env      # set VITE_API_BASE_URL to your backend, e.g. http://localhost:5000/api
npm run dev                # http://localhost:5173
```

## 4. Project structure

```
tawati-chemist/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy models (User, Product, Batch/stock, Sale, Patient, ...)
│   │   ├── routes/        # Flask blueprints (auth, products, sales, wholesale, reports, ...)
│   │   ├── utils/         # role_required / owner_required decorators
│   │   ├── config.py
│   │   └── extensions.py  # db, migrate, jwt, bcrypt
│   ├── requirements.txt
│   ├── run.py
│   └── seed.py
├── frontend/
│   └── src/
│       ├── api/           # axios client (attaches JWT automatically)
│       ├── context/       # AuthContext (login, role, token persistence)
│       ├── components/    # Layout, Sidebar (role-aware nav), ProtectedRoute, etc.
│       └── pages/         # Dashboard, Inventory, Pos, Patients, Reports, ...
└── .gitignore
```

## 5. Key design decisions baked into this build

- **Cash / M-Pesa only** as payment methods, everywhere (retail and wholesale).
- Cash sales require `amount_paid >= total`; change is calculated automatically.
- Discounts are **owner-created presets** — the Dispenser can only pick an active one at POS.
- Medications track stock, reorder level and all prices **per tablet/capsule**; packs are a display convenience (`units_per_pack`).
- A single `Sale` table with a `sale_channel` (`retail` / `wholesale`) field and receipt-number prefix (`TC-REC-` / `TC-WS-`) — one unified ledger, filterable by channel.
- Every stock movement (dispensed, restocked, adjusted, initial intake) is written to `AuditLog`, visible only to the owner.
- Product cost price, supplier, wholesale pricing, and all valuation/report figures are stripped from API responses for the `dispenser` role — not just hidden in the UI.
