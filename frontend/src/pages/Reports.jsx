import { useEffect, useState } from "react";
import api from "../api/client";
import { formatKsh, formatDate } from "../utils/format";

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [channel, setChannel] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/reports/summary"),
      api.get("/reports/inventory-valuation"),
      api.get("/reports/top-products"),
      api.get("/sales", { params: channel ? { channel } : {} }),
    ])
      .then(([s, v, t, sa]) => {
        setSummary(s.data);
        setValuation(v.data);
        setTopProducts(t.data.top_products);
        setSales(sa.data.sales);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [channel]);

  if (loading || !summary) return <div className="page-loading">Loading reports…</div>;

  return (
    <div>
      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-label">Gross Sales Revenue</div>
          <div className="stat-value">{formatKsh(summary.gross_sales_revenue)}</div>
          <div className="stat-sub">{summary.items_dispensed} items · {summary.transactions} transactions</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cost of Goods Sold (COGS)</div>
          <div className="stat-value">{formatKsh(summary.cost_of_goods_sold)}</div>
        </div>
        <div className="stat-card tone-success">
          <div className="stat-label">Total Gross Profit</div>
          <div className="stat-value">{formatKsh(summary.total_gross_profit)}</div>
          <div className="stat-sub">{summary.margin_pct}% margin</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Basket Size</div>
          <div className="stat-value">{formatKsh(summary.average_basket_size)}</div>
        </div>
      </div>

      <div className="card-grid">
        <div className="stat-card tone-success">
          <div className="stat-label">Counter Retail Sales</div>
          <div className="stat-value">{formatKsh(summary.counter_retail_sales)}</div>
        </div>
        <div className="stat-card tone-info">
          <div className="stat-label">Wholesale &amp; Institutional Sales</div>
          <div className="stat-value">{formatKsh(summary.wholesale_institutional_sales)}</div>
        </div>
      </div>

      {valuation && (
        <div className="panel">
          <h2>Inventory Asset Valuation &amp; Working Capital Health</h2>
          <div className="card-grid">
            <div className="stat-card">
              <div className="stat-label">Stock at Wholesale Cost</div>
              <div className="stat-value">{formatKsh(valuation.stock_at_wholesale_cost)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Expected Retail Value</div>
              <div className="stat-value">{formatKsh(valuation.expected_retail_value)}</div>
            </div>
            <div className="stat-card tone-success">
              <div className="stat-label">Projected Stock Profit</div>
              <div className="stat-value">{formatKsh(valuation.projected_stock_profit)}</div>
            </div>
            <div className="stat-card tone-danger">
              <div className="stat-label">At-Risk Expiry Capital</div>
              <div className="stat-value">{formatKsh(valuation.at_risk_expiry_capital)}</div>
            </div>
            <div className="stat-card tone-warning">
              <div className="stat-label">Reorder Capital Needed</div>
              <div className="stat-value">{formatKsh(valuation.reorder_capital_needed)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <h2>Top Dispensed Medications &amp; Margin</h2>
        <table className="table">
          <thead>
            <tr><th>Medicine</th><th>Units</th><th>Revenue</th><th>Profit</th><th>Margin %</th></tr>
          </thead>
          <tbody>
            {topProducts.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.units}</td>
                <td>{formatKsh(r.revenue)}</td>
                <td>{formatKsh(r.profit)}</td>
                <td>{r.margin_pct}%</td>
              </tr>
            ))}
            {topProducts.length === 0 && (
              <tr><td colSpan="5" className="muted">No sales recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-toolbar">
          <h2 style={{ margin: 0 }}>Complete Dispensing Sales Ledger</h2>
          <div className="tabs">
            {[
              { key: "", label: "All Channels" },
              { key: "retail", label: "Retail Counter" },
              { key: "wholesale", label: "Wholesale (B2B)" },
            ].map((c) => (
              <button
                key={c.key}
                className={"tab" + (channel === c.key ? " active" : "")}
                onClick={() => setChannel(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th><th>Receipt #</th><th>Customer</th><th>Payment</th>
              <th>Items</th><th>Revenue</th><th>COGS</th><th>Gross Profit</th><th>Margin</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td>{formatDate(s.date_time)}</td>
                <td>{s.receipt_number}</td>
                <td>{s.customer_name}</td>
                <td>{s.payment_method === "mpesa" ? "M-Pesa / Mobile" : "Cash"}</td>
                <td>{s.items_count}</td>
                <td>{formatKsh(s.total_amount)}</td>
                <td>{formatKsh(s.cogs_total)}</td>
                <td>{formatKsh(s.gross_profit)}</td>
                <td><span className="badge badge-ok">{s.margin_pct}%</span></td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr><td colSpan="9" className="muted">No transactions for this channel yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
