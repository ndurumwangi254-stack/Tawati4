import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { formatKsh, formatDate } from "../utils/format";

const emptyForm = {
  full_name: "",
  blood_group: "",
  phone: "",
  gender: "",
  age: "",
  address: "",
  id_or_insurance_number: "",
  allergies: "",
  conditions: "",
};

export default function Patients() {
  const { isOwner } = useAuth();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = (q) => {
    setLoading(true);
    api
      .get("/patients", { params: q ? { search: q } : {} })
      .then((res) => setPatients(res.data.patients))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const onSearch = (e) => {
    e.preventDefault();
    load(search);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      full_name: p.full_name || "",
      blood_group: p.blood_group || "",
      phone: p.phone || "",
      gender: p.gender || "",
      age: p.age || "",
      address: p.address || "",
      id_or_insurance_number: p.id_or_insurance_number || "",
      allergies: (p.allergies || []).filter((a) => a !== "NKDA").join(", "),
      conditions: (p.conditions || []).join(", "),
    });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      age: form.age ? Number(form.age) : null,
      allergies: form.allergies.split(",").map((s) => s.trim()).filter(Boolean),
      conditions: form.conditions.split(",").map((s) => s.trim()).filter(Boolean),
    };
    if (editing) {
      await api.put(`/patients/${editing.id}`, payload);
    } else {
      await api.post("/patients", payload);
    }
    setShowForm(false);
    load(search);
  };

    const openHistory = (p) => {
    setHistoryFor(p);
    setHistory([]);
    setHistoryLoading(true);
    api
      .get(`/patients/${p.id}/history`)
      .then((res) => setHistory(res.data.history))
      .finally(() => setHistoryLoading(false));
  };

  // Highlights how urgent a refill is: overdue (red), due within 7 days
  // (amber), further out (neutral) — makes the list scannable at a glance.
  const refillBadge = (dateStr) => {
    if (!dateStr) return null;
    const due = new Date(dateStr);
    const daysLeft = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return <span className="badge badge-danger">Overdue · {formatDate(dateStr)}</span>;
    if (daysLeft <= 7) return <span className="badge badge-warning">Due soon · {formatDate(dateStr)}</span>;
    return <span className="badge badge-info">{formatDate(dateStr)}</span>;
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete patient record for ${p.full_name}? This cannot be undone.`)) return;
    await api.delete(`/patients/${p.id}`);
    load(search);
  };

  const allergyCount = patients.filter((p) => (p.allergies || []).some((a) => a !== "NKDA")).length;
  const chronicCount = patients.filter((p) => (p.conditions || []).length > 0).length;

  return (
    <div>
      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-label">Registered Patients</div>
          <div className="stat-value">{patients.length}</div>
        </div>
        <div className="stat-card tone-danger">
          <div className="stat-label">Drug Allergy Alerts</div>
          <div className="stat-value">{allergyCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Chronic Care Patients</div>
          <div className="stat-value">{chronicCount}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-toolbar">
          <form onSubmit={onSearch} className="search-row">
            <input
              className="input search-input"
              placeholder="Search by name, phone, TC-PAT ID, allergy or condition…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn" type="submit">Search</button>
          </form>
          <button className="btn btn-primary" onClick={openNew}>
            + Register New Patient
          </button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Contact</th>
              <th>Allergies</th>
              <th>Conditions</th>
              <th>Visits</th>
              <th>Last Visit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="7" className="muted">Loading…</td></tr>
            )}
            {!loading && patients.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="cell-title">
                    {p.full_name} {p.blood_group && <span className="badge">{p.blood_group}</span>}
                  </div>
                  <div className="cell-sub">{p.patient_code} · {p.gender}{p.age ? `, ${p.age}y` : ""}</div>
                </td>
                <td>
                  <div className="cell-sub">{p.phone || "—"}</div>
                  <div className="cell-sub">{p.address || "—"}</div>
                  <div className="cell-sub">ID/Ins: {p.id_or_insurance_number || "—"}</div>
                </td>
                <td>
                  {(p.allergies || []).map((a) => (
                    <span key={a} className={"badge " + (a === "NKDA" ? "badge-ok" : "badge-danger")}>{a}</span>
                  ))}
                </td>
                <td>
                  {(p.conditions || []).length
                    ? p.conditions.map((c) => <span key={c} className="badge badge-info">{c}</span>)
                    : "—"}
                </td>
                <td>
                  <div>{p.visits} visits</div>
                  {isOwner && <div className="cell-sub">{formatKsh(p.amount_spent)}</div>}
                </td>
                <td>{formatDate(p.last_visit)}</td>
                <td>
                  <div className="action-row">
                    <button className="btn btn-sm">Dispense</button>
                    <button className="btn btn-sm" onClick={() => openHistory(p)}>History</button>
                    <button className="btn btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    {isOwner && (
                      <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && patients.length === 0 && (
              <tr><td colSpan="7" className="muted">No patient records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? "Edit Patient" : "Register New Patient"}</h2>
            <form onSubmit={save} className="form-grid">
              <label>Full Name *
                <input required className="input" value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </label>
              <label>Blood Group
                <input className="input" value={form.blood_group}
                  onChange={(e) => setForm({ ...form, blood_group: e.target.value })} />
              </label>
              <label>Phone
                <input className="input" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label>Gender
                <select className="input" value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">—</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </label>
              <label>Age
                <input type="number" className="input" value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })} />
              </label>
              <label>ID / Insurance No.
                <input className="input" value={form.id_or_insurance_number}
                  onChange={(e) => setForm({ ...form, id_or_insurance_number: e.target.value })} />
              </label>
              <label className="span-2">Address
                <input className="input" value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </label>
              <label className="span-2">Allergies (comma separated, leave blank for NKDA)
                <input className="input" value={form.allergies}
                  onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
              </label>
              <label className="span-2">Chronic Conditions (comma separated)
                <input className="input" value={form.conditions}
                  onChange={(e) => setForm({ ...form, conditions: e.target.value })} />
              </label>
              <div className="span-2 action-row">
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Patient</button>
              </div>
                       </form>
          </div>
        </div>
      )}

      {historyFor && (
        <div className="modal-backdrop" onClick={() => setHistoryFor(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Dispensing History — {historyFor.full_name}</h2>
              <button type="button" className="btn-icon" onClick={() => setHistoryFor(null)}>×</button>
            </div>

            {historyLoading && <p className="cell-sub">Loading…</p>}

            {!historyLoading && history.length === 0 && (
              <p className="cell-sub">No dispensing records for this patient yet.</p>
            )}

            {!historyLoading && history.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Date Dispensed</th>
                    <th>Drugs Dispensed</th>
                    <th>Dispensed By</th>
                    <th>Refill Due</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.sale_id}>
                      <td>{formatDate(h.date_dispensed)}</td>
                      <td>
                        {h.drugs_dispensed.map((d) => `${d.name} (${d.quantity})`).join(", ")}
                      </td>
                      <td>{h.dispensed_by || "—"}</td>
                      <td>{refillBadge(h.refill_due_date) || <span className="cell-sub">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setHistoryFor(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}