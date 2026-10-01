import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { formatKsh, formatDate } from "../utils/format";

export default function ExpiryLowStock() {
  const { isOwner } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/products").then((res) => setProducts(res.data.products)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const expired = products.filter((p) => p.is_expired);
  const expiring = products.filter((p) => !p.is_expired && p.days_to_expiry !== null && p.days_to_expiry <= 30);
  const lowStock = products.filter((p) => p.is_low_stock);

  const quarantine = async (p) => {
    if (!window.confirm(`Quarantine / write off all ${p.stock_quantity} remaining units of ${p.name}?`)) return;
    await api.post(`/batches/${p.id}/adjust`, {
      quantity_delta: -p.stock_quantity,
      reason: "Expired — quarantine/write-off",
    });
    load();
  };

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div>
      <div className="panel">
        <h2>Quarantine &amp; Disposal Queue ({expired.length})</h2>
        <p className="muted">These batches have passed their expiry date and must not be dispensed.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Batch</th>
              <th>Units Remaining</th>
              {isOwner && <th>Value at Cost</th>}
              {isOwner && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {expired.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.batch_number}</td>
                <td>{p.stock_quantity}</td>
                {isOwner && <td>{formatKsh(p.cost_price * p.stock_quantity)}</td>}
                {isOwner && (
                  <td><button className="btn btn-sm btn-danger" onClick={() => quarantine(p)}>Quarantine / Write-off</button></td>
                )}
              </tr>
            ))}
            {expired.length === 0 && (
              <tr><td colSpan={isOwner ? 5 : 3} className="muted">Nothing expired right now.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Impending Expiries ({expiring.length})</h2>
        <p className="muted">Prioritize dispensing these batches first.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Batch</th>
              <th>Expiry</th>
              <th>Units in Stock</th>
              <th>Dispense Price</th>
            </tr>
          </thead>
          <tbody>
            {expiring.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.batch_number}</td>
                <td className="text-warning">{formatDate(p.expiry_date)} ({p.days_to_expiry}d left)</td>
                <td>{p.stock_quantity}</td>
                <td>{formatKsh(p.selling_price)}</td>
              </tr>
            ))}
            {expiring.length === 0 && (
              <tr><td colSpan="5" className="muted">Nothing expiring within 30 days.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Low Stock Thresholds ({lowStock.length})</h2>
        <p className="muted">Stock has fallen to or below the minimum reorder quantity.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              {isOwner && <th>Supplier</th>}
              <th>In Stock / Min</th>
              {isOwner && <th>Cost / Retail</th>}
            </tr>
          </thead>
          <tbody>
            {lowStock.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category || "—"}</td>
                {isOwner && <td>{p.supplier || "—"}</td>}
                <td className="text-warning">{p.stock_quantity} / min {p.min_reorder_level}</td>
                {isOwner && (
                  <td>
                    <div className="cell-sub">Cost: {formatKsh(p.cost_price)}</div>
                    <div className="cell-title">Retail: {formatKsh(p.selling_price)}</div>
                  </td>
                )}
              </tr>
            ))}
            {lowStock.length === 0 && (
              <tr><td colSpan={isOwner ? 5 : 3} className="muted">Nothing below its reorder threshold.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
