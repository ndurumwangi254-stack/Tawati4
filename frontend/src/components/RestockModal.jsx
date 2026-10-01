import { useEffect, useState } from "react";
import api from "../api/client";

export default function RestockModal({ product, onClose, onSaved }) {
  const [quantity, setQuantity] = useState("");
  const [batchNumber, setBatchNumber] = useState(product.batch_number || "");
  const [expiryDate, setExpiryDate] = useState(product.expiry_date ? product.expiry_date.slice(0, 10) : "");
  const [costPrice, setCostPrice] = useState(product.cost_price ?? "");
  const [sellingPrice, setSellingPrice] = useState(product.selling_price ?? "");
  const [supplierId, setSupplierId] = useState(product.supplier_id || "");
  const [suppliers, setSuppliers] = useState([]);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/suppliers").then((res) => setSuppliers(res.data.suppliers)).catch(() => {});
  }, []);

  const qtyNum = Number(quantity) || 0;
  const newBalance = product.stock_quantity + qtyNum;

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    const res = await api.post("/suppliers", { name: newSupplierName.trim() });
    setSuppliers((s) => [...s, res.data.supplier]);
    setSupplierId(res.data.supplier.id);
    setNewSupplierName("");
    setShowAddSupplier(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (qtyNum <= 0) {
      setError("Quantity to add must be greater than zero.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.post(`/batches/${product.id}/restock`, {
        quantity: qtyNum,
        batch_number: batchNumber || undefined,
        expiry_date: expiryDate || undefined,
        cost_price: costPrice !== "" ? Number(costPrice) : undefined,
        selling_price: sellingPrice !== "" ? Number(sellingPrice) : undefined,
        supplier_id: supplierId || undefined,
        reference_code: referenceCode || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Could not restock this item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>📦 Restock Medication</h2>
          <button type="button" className="btn-icon" onClick={onClose}>×</button>
        </div>
        <p className="muted small" style={{ marginTop: "-0.5rem" }}>
          Receive incoming stock from distributor
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="panel-subheader">
          <div>
            <div className="cell-title">{product.name}</div>
            <div className="cell-sub">
              {product.variant_description}
              {product.strength_dosage ? ` • ${product.strength_dosage}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="cell-sub">Current Stock:</div>
            <div className="cell-title">{product.stock_quantity} units</div>
          </div>
        </div>

        <div className="form-grid highlight-grid">
          <label>
            Quantity to Add *
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            New Stock Balance
            <input value={`${newBalance} units`} disabled />
          </label>
        </div>

        <div className="form-grid">
          <label>
            Batch / Lot #
            <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
          </label>
          <label>
            Expiry Date
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </label>
          <label>
            Cost Price (KSh)
            <input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          </label>
          <label>
            Retail Selling Price (KSh)
            <input type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
          </label>

          <label>
            Distributor / Supplier
            {!showAddSupplier ? (
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ flex: 1 }}>
                  <option value="">— select —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-sm" onClick={() => setShowAddSupplier(true)}>
                  + Add
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <input
                  placeholder="New supplier name"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  style={{ flex: 1 }}
                  autoFocus
                />
                <button type="button" className="btn btn-sm btn-success" onClick={handleAddSupplier}>Add</button>
                <button type="button" className="btn btn-sm" onClick={() => setShowAddSupplier(false)}>Cancel</button>
              </div>
            )}
          </label>
          <label>
            Supplier Invoice / Delivery Note #
            <input value={referenceCode} onChange={(e) => setReferenceCode(e.target.value)} placeholder="e.g. PO-2026-658" />
          </label>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? "Saving…" : `Confirm Restock (+${qtyNum || 0})`}
          </button>
        </div>
      </form>
    </div>
  );
}
