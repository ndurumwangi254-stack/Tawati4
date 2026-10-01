import { formatKsh, formatDate } from "../utils/format";

export default function ReceiptModal({ sale, onClose }) {
  if (!sale) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✅ Transaction Completed</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" id="receipt-print-area">
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <div className="brand-badge" style={{ margin: "0 auto 0.5rem" }}>TC</div>
            <h2 style={{ margin: 0 }}>Tawati Chemist</h2>
            <div className="muted small">Registered Community &amp; Retail Pharmacy</div>
          </div>

          <table style={{ marginBottom: "1rem" }}>
            <tbody>
              <tr><td className="muted">Receipt No:</td><td><strong>{sale.receipt_number}</strong></td></tr>
              <tr><td className="muted">Date &amp; Time:</td><td>{formatDate(sale.date_time)}</td></tr>
              <tr><td className="muted">Dispenser:</td><td>{sale.dispenser}</td></tr>
              <tr><td className="muted">Patient / Customer:</td><td>{sale.customer_name}</td></tr>
              {sale.prescription_ref && (
                <tr><td className="muted">Prescription Ref:</td><td>{sale.prescription_ref}</td></tr>
              )}
              <tr><td className="muted">Payment Method:</td><td>{sale.payment_method === "cash" ? "Cash" : "M-Pesa / Mobile"}</td></tr>
            </tbody>
          </table>

          <table>
            <thead>
              <tr><th>Item &amp; Strength</th><th>Qty × Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id}>
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
            <div className="pos-total"><span>Subtotal:</span><span>{formatKsh(sale.subtotal)}</span></div>
            {sale.discount_amount > 0 && (
              <div className="pos-total"><span>Discount:</span><span>-{formatKsh(sale.discount_amount)}</span></div>
            )}
            <div className="pos-total"><span>Tax / VAT:</span><span>{formatKsh(sale.tax_amount)}</span></div>
            <div className="pos-total large"><strong>GRAND TOTAL:</strong><strong>{formatKsh(sale.total_amount)}</strong></div>
            {sale.payment_method === "cash" && (
              <div className="pos-total muted small">
                <span>Amount Paid / Change Due:</span>
                <span>{formatKsh(sale.amount_paid)} / {formatKsh(sale.change_given)}</span>
              </div>
            )}
          </div>

          <p className="muted small" style={{ textAlign: "center", marginTop: "1.5rem" }}>
            Thank you for trusting Tawati Chemist!<br />
            Keep all medications out of reach of children. Store in a cool, dry place.<br />
            Prescription medicines once dispensed cannot be accepted back for resale.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Close Receipt</button>
          <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print Receipt</button>
        </div>
      </div>
    </div>
  );
}
