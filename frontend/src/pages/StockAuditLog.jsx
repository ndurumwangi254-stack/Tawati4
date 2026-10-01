import { useEffect, useState } from "react";
import api from "../api/client";
import { formatDate } from "../utils/format";

const FILTERS = [
  { key: "", label: "All Movements" },
  { key: "dispensed", label: "Sales / Dispensed" },
  { key: "restocked", label: "Restocked" },
  { key: "adjusted", label: "Adjustments" },
  { key: "initial_intake", label: "Initial Intake" },
];

const TYPE_LABEL = {
  dispensed: "Dispensed",
  restocked: "Restocked",
  adjusted: "Adjusted",
  initial_intake: "Initial Intake",
};

export default function StockAuditLog() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = {};
    if (filter) params.movement_type = filter;
    if (search) params.search = search;
    api.get("/audit-log", { params }).then((res) => setLogs(res.data.audit_log)).finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  return (
    <div className="panel">
      <h2>Stock Movement &amp; Audit Ledger</h2>
      <p className="muted">Record of every dispense, restock, and inventory adjustment at Tawati Chemist.</p>

      <div className="panel-toolbar">
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
        <form
          className="search-row"
          onSubmit={(e) => { e.preventDefault(); load(); }}
        >
          <input
            className="input search-input"
            placeholder="Search medicine, receipt #, order ref, staff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn" type="submit">Search</button>
        </form>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Date &amp; Time</th>
            <th>Type</th>
            <th>Medication</th>
            <th>Qty Δ</th>
            <th>Balance</th>
            <th>Reference &amp; Details</th>
            <th>Performed By</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan="7" className="muted">Loading…</td></tr>}
          {!loading && logs.map((l) => (
            <tr key={l.id}>
              <td>{new Date(l.date_time).toLocaleString()}</td>
              <td><span className={"badge badge-" + l.movement_type}>{TYPE_LABEL[l.movement_type] || l.movement_type}</span></td>
              <td>{l.product}</td>
              <td className={l.quantity_delta < 0 ? "text-danger" : "text-success"}>
                {l.quantity_delta > 0 ? `+${l.quantity_delta}` : l.quantity_delta}
              </td>
              <td>{l.balance_before} → {l.balance_after}</td>
              <td>
                {l.reference_code && <strong>[{l.reference_code}]</strong>} {l.reason}
              </td>
              <td>{l.performed_by}</td>
            </tr>
          ))}
          {!loading && logs.length === 0 && (
            <tr><td colSpan="7" className="muted">No audit events match this filter.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
