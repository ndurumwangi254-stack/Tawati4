import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import Card from "../components/Card";
import { formatKsh } from "../utils/format";

export default function Dashboard() {
  const { user, isOwner } = useAuth();
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calls = [api.get("/products"), api.get("/sales")];
    if (isOwner) {
      calls.push(api.get("/reports/summary"));
      calls.push(api.get("/reports/inventory-valuation"));
    }

    Promise.all(calls)
      .then(([prodRes, salesRes, summaryRes, valuationRes]) => {
        setProducts(prodRes.data.products);
        setSales(salesRes.data.sales);
        if (summaryRes) setSummary(summaryRes.data);
        if (valuationRes) setValuation(valuationRes.data);
      })
      .finally(() => setLoading(false));
  }, [isOwner]);

  if (loading) return <div className="page-loading">Loading dashboard…</div>;

  const lowStock = products.filter((p) => p.is_low_stock).length;
  const expiryWatch = products.filter((p) => p.days_to_expiry !== null && p.days_to_expiry <= 30).length;
  const totalUnits = products.reduce((sum, p) => sum + p.stock_quantity, 0);

  return (
    <div>
      <div className="page-hero">
        <div className="hero-badge">Licensed Chemist Operations</div>
        <h1>Welcome to Chemist Audit &amp; Operations</h1>
        <p>Real-time snapshot of stock compliance, dispensing activity, and alerts.</p>
      </div>

      <div className="card-grid">
        <Card label="Catalog SKUs" value={products.length} sub={`${totalUnits} units in stock`} />
        {isOwner && valuation && (
          <Card
            label="Stock Valuation"
            value={formatKsh(valuation.stock_at_wholesale_cost)}
            sub={`Retail: ${formatKsh(valuation.expected_retail_value)}`}
          />
        )}
        <Card label="Low Stock Alert" value={lowStock} sub="Below reorder threshold" tone="warning" />
        <Card label="Expiry Watch" value={expiryWatch} sub="Expired or ≤30 days" tone="danger" />
        {isOwner && summary && (
          <Card
            label="Dispensed Total"
            value={formatKsh(summary.gross_sales_revenue)}
            sub={`${summary.transactions} transactions`}
          />
        )}
      </div>

      <div className="panel">
        <h2>Recent Dispensing Receipts</h2>
        <p className="muted">Last transactions processed through the dispensary POS.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Payment</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, 6).map((s) => (
              <tr key={s.id}>
                <td>{s.receipt_number}</td>
                <td>{s.customer_name}</td>
                <td>{new Date(s.date_time).toLocaleString()}</td>
                <td>{s.payment_method === "mpesa" ? "M-Pesa / Mobile" : "Cash"}</td>
                <td>{formatKsh(s.total_amount)}</td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan="5" className="muted">No sales recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="muted small">Signed in as {user?.name} ({isOwner ? "Owner" : "Dispenser"})</p>
    </div>
  );
}
