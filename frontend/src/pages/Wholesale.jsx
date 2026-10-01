import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { formatKsh, formatDate } from "../utils/format";

const BLANK_CUSTOMER = {
  business_name: "",
  contact_person: "",
  phone: "",
  kra_pin: "",
  ppb_health_license: "",
  delivery_address: "",
};

export default function Wholesale() {
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_CUSTOMER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/wholesale/customers"),
      api.get("/sales", { params: { channel: "wholesale" } }),
      api.get("/reports/summary"),
    ])
      .then(([c, s, sm]) => {
        setCustomers(c.data.customers);
        setSales(s.data.sales);
        setSummary(sm.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.business_name.trim()) {
      setError("Clinic / Facility / Business Name is required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/wholesale/customers", form);
      setForm(BLANK_CUSTOMER);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not register this buyer.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Loading wholesale data…</div>;

  return (
    <div>
      <div className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>🏢 Wholesale Drug Supply &amp; Institutional Distribution</h2>
            <p className="muted">
              B2B bulk supply for community clinics, dispensaries, healthcare facilities &amp; bulk buyers.
            </p>
          </div>
          <Link to="/pos" className="btn btn-primary">
            + Create Wholesale Order
          </Link>
        </div>

        {summary && (
          <div className="card-grid">
            <div className="stat-card tone-info">
              <div className="stat-label">Wholesale Revenue Logged</div>
              <div className="stat-value">{formatKsh(summary.wholesale_institutional_sales)}</div>
              <div className="stat-sub">
                {sales.length} commercial B2B {sales.length === 1 ? "order" : "orders"}
              </div>
            </div>
            <div className="stat-card tone-success">
              <div className="stat-label">Registered Institutional Buyers</div>
              <div className="stat-value">{customers.length}</div>
              <div className="stat-sub">Clinics, dispensaries &amp; bulk accounts</div>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-toolbar">
          <h2 style={{ margin: 0 }}>Institutional Buyers</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Register New Buyer
          </button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Business / Clinic</th>
              <th>Contact</th>
              <th>KRA PIN</th>
              <th>PPB / Health License</th>
              <th>Delivery Address</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="cell-title">{c.business_name}</td>
                <td>
                  <div className="cell-sub">{c.contact_person || "—"}</div>
                  <div className="cell-sub">{c.phone || "—"}</div>
                </td>
                <td>{c.kra_pin || "—"}</td>
                <td>{c.ppb_health_license || "—"}</td>
                <td className="cell-sub">{c.delivery_address || "—"}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan="5" className="muted">No institutional buyers registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Wholesale / B2B Order History</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Receipt #</th>
              <th>Institution</th>
              <th>Payment</th>
              <th>Items</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td>{formatDate(s.date_time)}</td>
                <td>{s.receipt_number}</td>
                <td className="cell-title">{s.customer_name}</td>
                <td>{s.payment_method === "mpesa" ? "M-Pesa / Mobile" : "Cash"}</td>
                <td>{s.items_count}</td>
                <td>{formatKsh(s.total_amount)}</td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr><td colSpan="6" className="muted">No wholesale orders placed yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Register New Institutional Buyer</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid">
                <label>
                  Clinic / Facility / Business Name *
                  <input
                    className="input"
                    required
                    value={form.business_name}
                    onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                  />
                </label>
                <label>
                  Contact Person / Doctor
                  <input
                    className="input"
                    value={form.contact_person}
                    onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                  />
                </label>
                <label>
                  Phone Number
                  <input
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </label>
                <label>
                  KRA PIN / Tax ID
                  <input
                    className="input"
                    value={form.kra_pin}
                    onChange={(e) => setForm((f) => ({ ...f, kra_pin: e.target.value }))}
                  />
                </label>
                <label>
                  PPB / Health License #
                  <input
                    className="input"
                    value={form.ppb_health_license}
                    onChange={(e) => setForm((f) => ({ ...f, ppb_health_license: e.target.value }))}
                  />
                </label>
                <label className="span-2">
                  Delivery Address / PO Ref #
                  <input
                    className="input"
                    value={form.delivery_address}
                    onChange={(e) => setForm((f) => ({ ...f, delivery_address: e.target.value }))}
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save Buyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
