import { useState } from "react";
import api from "../api/client";
import { formatKsh, formatDate } from "../utils/format";

const VOID_REASONS = [
  "Wrong item or quantity entered",
  "Wrong patient selected",
  "Wrong payment method",
  "Customer cancelled before leaving",
  "Other",
];

/**
 * Shows a receipt. If the viewer is allowed to void it (the server decides and
 * sends `can_void`), a "Void Sale" button appears. Voiding never deletes the
 * sale — it returns the items to stock and stamps the receipt VOID.
 *
 * Props:
 *  - sale:           the sale to show
 *  - onClose:        close the modal
 *  - onVoided(sale): called after a successful void so the parent can refresh
 *  - justCompleted:  true when opened straight after checkout (changes the title)
 */
export default function ReceiptModal({ sale, onClose, onVoided, justCompleted = false }) {
  const [current, setCurrent] = useState(sale);
  const [voiding, setVoiding] = useState(false);
  const [reasonChoice, setReasonChoice] = useState(VOID_REASONS[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!current) return null;
  const isVoided = current.status === "voided";

  const submitVoid = async () => {
    setError("");
    if (reasonChoice === "Other" && !notes.trim()) {
      setError("Please describe the reason when choosing 'Other'.");
      return;
    }
    const reason = notes.trim() ? `${reasonChoice} — ${notes.trim()}` : reasonChoice;
    setSaving(true);
    try {
      const res = await api.post(`/sales/${current.id}/void`, { reason });
      setCurrent(res.data.sale);
      setVoiding(false);
      if (onVoided) onVoided(res.data.sale);
    } catch (err) {
      setError(err.response?.data?.error || "Could not void this sale");
    } finally {
      setSaving(false);
    }
  };

  const title = isVoided ? "⛔ Voided Sale" : justCompleted ? "✅ Transaction Completed" : "Receipt";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" id="receipt-print-area">
          {isVoided && (
            <div className="void-banner">
              <strong>VOID — this sale was cancelled</strong>
              <div className="small">
                {current.voided_by_name ? `By ${current.voided_by_name}` : ""}
                {current.voided_at ? ` on ${new Date(current.voided_at).toLocaleString("en-KE")}` : ""}
              </div>
              {current.void_reason && <div className="small">Reason: {current.void_reason}</div>}
            </div>
          )}

          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <div className="brand-badge" style={{ margin: "0 auto 0.5rem" }}>TC</div>
            <h2 style={{ margin: 0 }}>Tawati Chemist</h2>
            <div className="muted small">Registered Community &amp; Retail Pharmacy</div>
          </div>

          <table style={{ marginBottom: "1rem" }}>
            <tbody>
              <tr><td className="muted">Receipt No:</td><td><strong>{current.receipt_number}</strong></td></tr>
              <tr><td className="muted">Date &amp; Time:</td><td>{formatDate(current.date_time)}</td></tr>
              <tr><td className="muted">Dispenser:</td><td>{current.dispenser}</td></tr>
              <tr><td className="muted">Patient / Customer:</td><td>{current.customer_name}</td></tr>
              {current.prescription_ref && (
                <tr><td className="muted">Prescription Ref:</td><td>{current.prescription_ref}</td></tr>
              )}
              <tr><td className="muted">Payment Method:</td><td>{current.payment_method === "cash" ? "Cash" : "M-Pesa / Mobile"}</td></tr>
            </tbody>
          </table>

          <table>
            <thead>
              <tr><th>Item &amp; Strength</th><th>Qty × Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              {current.items.map((item) => (
                <tr key={item.id} className={isVoided ? "row-voided" : ""}>
                  <td>
                    <div className="cell-title">{item.name}</div>
                    <div className="cell-sub">{item.strength_dosage} • Batch: {item.batch_number}</div>
                  </td>
                  <td>{item.quantity} × {formatKsh(item.unit_price)}</td>
                  <td><strong>{formatKsh(item.subtotal)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "1rem" }}>
            <div className="pos-total"><span>Subtotal:</span><span>{formatKsh(current.subtotal)}</span></div>
            {current.discount_amount > 0 && (
              <div className="pos-total"><span>Discount:</span><span>-{formatKsh(current.discount_amount)}</span></div>
            )}
            <div className="pos-total"><span>Tax / VAT:</span><span>{formatKsh(current.tax_amount)}</span></div>
            <div className="pos-total large"><strong>GRAND TOTAL:</strong><strong>{formatKsh(current.total_amount)}</strong></div>
            {current.payment_method === "cash" && (
              <div className="pos-total muted small">
                <span>Amount Paid / Change Due:</span>
                <span>{formatKsh(current.amount_paid)} / {formatKsh(current.change_given)}</span>
              </div>
            )}
          </div>

          <p className="muted small" style={{ textAlign: "center", marginTop: "1.5rem" }}>
            Thank you for trusting Tawati Chemist!<br />
            Keep all medications out of reach of children. Store in a cool, dry place.<br />
            Prescription medicines once dispensed cannot be accepted back for resale.
          </p>
        </div>

        {voiding && (
          <div className="void-panel">
            <strong>Void this sale?</strong>
            <p className="small muted" style={{ margin: "0.25rem 0 0.75rem" }}>
              All items go back into stock and the receipt is marked VOID. This cannot be undone —
              ring up the correct sale afterwards.
            </p>
            {error && <div className="alert alert-error">{error}</div>}
            <label>
              Reason *
              <select value={reasonChoice} onChange={(e) => setReasonChoice(e.target.value)}>
                {VOID_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label>
              Details {reasonChoice === "Other" ? "*" : "(optional)"}
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Rang up Augmentin instead of Amoxicillin"
              />
            </label>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.75rem" }}>
              <button className="btn" onClick={() => { setVoiding(false); setError(""); }} disabled={saving}>
                Keep Sale
              </button>
              <button className="btn btn-danger" onClick={submitVoid} disabled={saving}>
                {saving ? "Voiding…" : "Confirm Void"}
              </button>
            </div>
          </div>
        )}

        <div className="modal-footer">
          {current.can_void && !isVoided && !voiding && (
            <button className="btn btn-danger" onClick={() => setVoiding(true)} style={{ marginRight: "auto" }}>
              Void Sale
            </button>
          )}
          <button className="btn" onClick={onClose}>Close Receipt</button>
          <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print Receipt</button>
        </div>
      </div>
    </div>
  );
}