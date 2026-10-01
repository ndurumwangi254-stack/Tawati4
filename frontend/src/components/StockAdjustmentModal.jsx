import { useState } from "react";
import api from "../api/client";
import { unitLabel } from "../utils/format";

const REASONS = [
  "Stocktaking Audit Correction",
  "Damaged / Broken",
  "Expired Write-off",
  "Theft / Loss",
  "Returned to Supplier",
  "Other",
];

export default function StockAdjustmentModal({ product, onClose, onSaved }) {
  const [actualCount, setActualCount] = useState(product.stock_quantity);
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const unit = unitLabel(product.dosage_form, 2);
  const delta = Number(actualCount) - product.stock_quantity;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (actualCount === "" || Number.isNaN(Number(actualCount))) {
      setError("Enter the actual physical count on the shelf.");
      return;
    }
    if (delta === 0) {
      setError("Actual count matches the system count — nothing to adjust.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.post(`/batches/${product.id}/adjust`, {
        quantity_delta: delta,
        reason: (notes ? `${reason}: ${notes}` : reason).slice(0, 255),
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Could not apply this adjustment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>⚙️ Stock Adjustment &amp; Write-off</h2>
          <button type="button" className="btn-icon" onClick={onClose}>×</button>
        </div>
        <p className="muted small" style={{ marginTop: "-0.5rem" }}>
          Reconcile inventory balance &amp; log discrepancy
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="panel-subheader">
          <div>
            <div className="cell-title">{product.name}</div>
            <div className="cell-sub">
              Batch: {product.batch_number || "—"} • Shelf: {product.shelf_location || "—"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="cell-sub">System Count:</div>
            <div className="cell-title">{product.stock_quantity} {unit}</div>
          </div>
        </div>

        <div className="form-grid highlight-grid">
          <label>
            Actual Physical Count on Shelf *
            <input
              type="number"
              min="0"
              value={actualCount}
              onChange={(e) => setActualCount(e.target.value)}
              required
              autoFocus
            />
          </label>
          <div className="delta-badge">
            <span className={delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "muted"}>
              {delta > 0 ? `+${delta}` : delta} delta
            </span>
          </div>
        </div>

        <label>
          Primary Reason for Adjustment *
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>

        <label>
          Audit Explanation / Incident Notes
          <textarea
            rows={3}
            placeholder="e.g. Broken bottle found during morning dusting, or verified physical count…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-warning" disabled={saving}>
            {saving ? "Saving…" : "Apply Adjustment"}
          </button>
        </div>
      </form>
    </div>
  );
}
