import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { formatKsh, formatDate } from "../utils/format";
import AddItemModal from "../components/AddItemModal";
import RestockModal from "../components/RestockModal";
import StockAdjustmentModal from "../components/StockAdjustmentModal";
import { CirclePlusIcon, FilePenIcon, SlidersIcon, TrashIcon } from "../components/Icons";

const TABS = [
  { key: "all", label: "All Inventory" },
  { key: "medication", label: "Pharmaceuticals & Rx" },
  { key: "retail_item", label: "Normal Shop & Retail Items" },
];

export default function Inventory() {
  const { isOwner } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [restockingProduct, setRestockingProduct] = useState(null);
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/products")
      .then((res) => setProducts(res.data.products))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    let rows = products;
    if (tab !== "all") rows = rows.filter((p) => p.product_type === tab);
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.barcode || "").toLowerCase().includes(s) ||
          (p.shelf_location || "").toLowerCase().includes(s)
      );
    }
    return rows;
  }, [products, tab, search]);

  const counts = {
    all: products.length,
    medication: products.filter((p) => p.product_type === "medication").length,
    retail_item: products.filter((p) => p.product_type === "retail_item").length,
  };

  const lowStock = products.filter((p) => p.is_low_stock).length;
  const expiryWatch = products.filter((p) => p.days_to_expiry !== null && p.days_to_expiry <= 30).length;

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      load();
    } catch (err) {
      window.alert(err.response?.data?.error || "Could not delete this item.");
    }
  };

  const goDispense = (product) => {
    navigate(`/pos?product=${product.id}`);
  };

  return (
    <div>
      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-label">Total Inventory</div>
          <div className="stat-value">{products.length} Items</div>
        </div>
        <div className="stat-card tone-warning">
          <div className="stat-label">Low Stock Alert</div>
          <div className="stat-value">{lowStock}</div>
        </div>
        <div className="stat-card tone-danger">
          <div className="stat-label">Expiry Watch</div>
          <div className="stat-value">{expiryWatch}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-toolbar">
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={"tab" + (tab === t.key ? " active" : "")}
                onClick={() => setTab(t.key)}
              >
                {t.label} <span className="tab-count">{counts[t.key]}</span>
              </button>
            ))}
          </div>
          {isOwner && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              + Add Item
            </button>
          )}
        </div>

        <input
          className="input search-input"
          placeholder="Search medications, shop items, barcode, shelf…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Batch / Shelf</th>
              <th>Category</th>
              <th>In Stock / Min</th>
              <th>Expiry</th>
              <th>{isOwner ? "Cost / Selling" : "Selling Price"}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="7" className="muted">Loading…</td>
              </tr>
            )}
            {!loading && filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="cell-title">
                    {p.name} {p.requires_prescription && <span className="badge badge-rx">Rx</span>}
                  </div>
                  <div className="cell-sub">
                    {p.variant_description} {p.strength_dosage && `• ${p.strength_dosage}`}{" "}
                    {p.dosage_form || p.packaging_unit_type}
                  </div>
                </td>
                <td>
                  <div className="cell-sub">{p.batch_number}</div>
                  <div className="cell-sub">{p.shelf_location}</div>
                </td>
                <td>{p.category || "—"}</td>
                <td>
                  <span className={p.is_low_stock ? "text-warning" : ""}>{p.stock_quantity}</span>
                  {" / min "}
                  {p.min_reorder_level}
                </td>
                <td className={p.is_expired ? "text-danger" : p.days_to_expiry <= 30 ? "text-warning" : ""}>
                  {formatDate(p.expiry_date)}
                  {p.is_expired && " (Expired)"}
                </td>
                <td>
                  {isOwner && (
                    <div className="cell-sub">Cost: {formatKsh(p.cost_price)}</div>
                  )}
                  <div className="cell-title">{formatKsh(p.selling_price)}</div>
                </td>
                <td>
                  <div className="action-row">
                    <button className="btn btn-sm btn-success" onClick={() => goDispense(p)}>
                      {p.product_type === "medication" ? "Dispense" : "Sell / POS"}
                    </button>
                    {isOwner && (
                      <>
                        <button
                          className="btn-icon btn-icon-bordered"
                          title="Restock"
                          onClick={() => setRestockingProduct(p)}
                        >
                          <CirclePlusIcon />
                        </button>
                        <button
                          className="btn-icon btn-icon-bordered"
                          title="Edit details"
                          onClick={() => setEditingProduct(p)}
                        >
                          <FilePenIcon />
                        </button>
                        <button
                          className="btn-icon btn-icon-bordered"
                          title="Stock adjustment / write-off"
                          onClick={() => setAdjustingProduct(p)}
                        >
                          <SlidersIcon />
                        </button>
                        <button
                          className="btn-icon btn-icon-bordered btn-icon-danger"
                          title="Delete"
                          onClick={() => handleDelete(p)}
                        >
                          <TrashIcon />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="muted">No items match this search/filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            load();
          }}
        />
      )}

      {editingProduct && (
        <AddItemModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            load();
          }}
        />
      )}

      {restockingProduct && (
        <RestockModal
          product={restockingProduct}
          onClose={() => setRestockingProduct(null)}
          onSaved={() => {
            setRestockingProduct(null);
            load();
          }}
        />
      )}

      {adjustingProduct && (
        <StockAdjustmentModal
          product={adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          onSaved={() => {
            setAdjustingProduct(null);
            load();
          }}
        />
      )}
    </div>
  );
}
