import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import SupplierModal from "../components/SupplierModal";

const FILTERS = [
  { key: "all", label: "All Vendors" },
  { key: "pharmaceuticals", label: "Pharmaceuticals" },
  { key: "consumer", label: "Consumer & Toiletries" },
];

const categoryLabel = (value) =>
  value === "consumer" ? "Consumer & Toiletries" : "Pharmaceuticals";

export default function Suppliers() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null); // null | "new" | supplier object (editing)

  const load = () => {
    setLoading(true);
    api
      .get("/suppliers")
      .then((res) => setSuppliers(res.data.suppliers))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const visible = useMemo(() => {
    let rows = suppliers;
    if (filter !== "all") rows = rows.filter((s) => s.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((s) =>
        [s.name, s.phone, s.contact_person, s.kra_pin].some((v) => (v || "").toLowerCase().includes(q))
      );
    }
    return rows;
  }, [suppliers, filter, search]);

  return (
    <div>
      <div className="supplier-hero">
        <div>
          <h1>🚚 Wholesale Suppliers &amp; Distributors</h1>
          <p>
            Manage your registered pharmaceutical distributors, procurement reps, credit terms, and
            stock intake vendors for Tawati Chemist.
          </p>
        </div>
        <button className="btn btn-success" onClick={() => setModal("new")}>+ Add New Supplier</button>
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div className="supplier-toolbar">
          <input
            className="input search-input"
            placeholder="Search suppliers by name, phone, contact rep, or KRA PIN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="tabs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={"tab" + (filter === f.key ? " active" : "")}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <p className="muted">Loading suppliers…</p>}

      {!loading && visible.length === 0 && (
        <div className="panel">
          <p className="muted" style={{ margin: 0 }}>
            {suppliers.length === 0
              ? "No suppliers yet. Click “Add New Supplier” to register your first distributor."
              : "No suppliers match your search."}
          </p>
        </div>
      )}

      <div className="supplier-grid">
        {visible.map((s) => (
          <div key={s.id} className="supplier-card">
            <div className="supplier-card-head">
              <div>
                <div className="cell-title">{s.name}</div>
                <div className="supplier-category">{categoryLabel(s.category)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="badge">{s.items_count} {s.items_count === 1 ? "item" : "items"}</span>
                <div>
                  <button className="btn-link small" onClick={() => setModal(s)}>Edit</button>
                </div>
              </div>
            </div>

            <dl className="supplier-details">
              <dt>Contact Rep:</dt><dd>{s.contact_person || "—"}</dd>
              <dt>Phone:</dt>
              <dd>{s.phone ? <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="supplier-phone">{s.phone}</a> : "—"}</dd>
              <dt>Email:</dt><dd>{s.email || "—"}</dd>
              <dt>Depot:</dt><dd>{s.address || "—"}</dd>
              <dt>Terms:</dt>
              <dd>{s.payment_terms ? <span className="badge badge-ok">{s.payment_terms}</span> : "—"}</dd>
              <dt>KRA PIN:</dt><dd>{s.kra_pin || "—"}</dd>
            </dl>

            <div className="supplier-card-foot">
              <span className="muted small supplier-notes" title={s.notes || ""}>{s.notes || ""}</span>
              <button
                className="btn btn-sm"
                onClick={() => navigate(`/inventory?supplier=${s.id}`)}
              >
                View Inventory ({s.items_count})
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <SupplierModal
          supplier={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}