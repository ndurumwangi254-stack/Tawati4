import { useEffect, useState } from "react";
import api from "../api/client";
import { isPackForm, unitLabel } from "../utils/format";

const DOSAGE_FORMS = ["Tablets", "Capsules", "Syrup/Suspension", "Inhaler", "Ointment/Cream", "Drops", "Injectable"];
const PACKAGING_TYPES = ["Piece/Unit", "Bottle/Pack", "Tube/Bar", "Box/Packet", "Roll/Sachet", "Can/Tin"];

const BLANK = {
  product_type: "medication",
  name: "",
  variant_description: "",
  category_id: "",
  dosage_form: "Tablets",
  packaging_unit_type: "Piece/Unit",
  strength_dosage: "",
  pack_size_volume: "",
  batch_number: "",
  manufacture_date: "",
  expiry_date: "",
  barcode: "",
  stock_quantity: 0,
  min_reorder_level: 0,
  cost_price: "",
  selling_price: "",
  units_per_pack: 10,
  pack_description: "",
  shelf_location: "",
  storage_notes: "",
  requires_prescription: false,
  wholesale_unit_price: "",
  min_wholesale_qty: "",
  wholesale_bulk_packaging: "",
};

export default function AddItemModal({ onClose, onSaved, product }) {
  const isEditing = !!product;

  const [form, setForm] = useState(() =>
    product
      ? {
          ...BLANK,
          ...product,
          manufacture_date: product.manufacture_date ? product.manufacture_date.slice(0, 10) : "",
          expiry_date: product.expiry_date ? product.expiry_date.slice(0, 10) : "",
          cost_price: product.cost_price ?? "",
          selling_price: product.selling_price ?? "",
          wholesale_unit_price: product.wholesale_unit_price ?? "",
          min_wholesale_qty: product.min_wholesale_qty ?? "",
          units_per_pack: product.units_per_pack ?? 10,
        }
      : BLANK
  );
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isMedication = form.product_type === "medication";
  const kind = isMedication ? "therapeutic" : "department";
  // Only Tablets/Capsules get a pack-conversion section and per-tablet pricing.
  // Syrups, inhalers, creams, drops and injectables are stocked/priced per whole unit.
  const isPack = isMedication && isPackForm(form.dosage_form);
  const unitPlural = isMedication ? unitLabel(form.dosage_form, 2) : "";

  useEffect(() => {
    api.get(`/categories?kind=${kind}`).then((res) => setCategories(res.data.categories));
  }, [kind]);

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const retailMargin =
    form.cost_price && form.selling_price
      ? (((form.selling_price - form.cost_price) / form.selling_price) * 100).toFixed(1)
      : null;
  const wholesaleMargin =
    form.cost_price && form.wholesale_unit_price
      ? (((form.wholesale_unit_price - form.cost_price) / form.wholesale_unit_price) * 100).toFixed(1)
      : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const body = {
      ...form,
      stock_quantity: Number(form.stock_quantity),
      min_reorder_level: Number(form.min_reorder_level),
      cost_price: Number(form.cost_price || 0),
      selling_price: Number(form.selling_price || 0),
      units_per_pack: isPack ? Number(form.units_per_pack || 0) : null,
      pack_description: isPack ? form.pack_description : "",
      wholesale_unit_price: form.wholesale_unit_price ? Number(form.wholesale_unit_price) : null,
      min_wholesale_qty: form.min_wholesale_qty ? Number(form.min_wholesale_qty) : null,
    };
    try {
      if (isEditing) {
        await api.put(`/products/${product.id}`, body);
      } else {
        await api.post("/products", body);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save this item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal modal-lg" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>
            {isEditing ? "Edit " : "Register New "}
            {isMedication ? "Medication Details" : "Shop / Retail Item Details"}
          </h2>
          <button type="button" className="btn-icon" onClick={onClose}>×</button>
        </div>
        <p className="muted small" style={{ marginTop: "-0.5rem" }}>
          Tawati Chemist Pharmaceutical &amp; Prescription Stock Registry
        </p>

        {!isEditing && (
          <div className="classification-toggle">
            <button
              type="button"
              className={"toggle-btn" + (isMedication ? " active" : "")}
              onClick={() => setForm((f) => ({ ...f, product_type: "medication", category_id: "" }))}
            >
              💊 Medication / Drug
            </button>
            <button
              type="button"
              className={"toggle-btn" + (!isMedication ? " active" : "")}
              onClick={() => setForm((f) => ({ ...f, product_type: "retail_item", category_id: "" }))}
            >
              🛍️ Shop / Retail Item
            </button>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-grid">
          <label>
            {isMedication ? "Brand / Drug Name" : "Product / Brand Name"} *
            <input value={form.name} onChange={set("name")} required />
          </label>
          <label>
            {isMedication ? "Active Ingredient / Generic Name" : "Product Variant / Description"}
            <input value={form.variant_description} onChange={set("variant_description")} />
          </label>

          <label>
            {isMedication ? "Therapeutic Category" : "Store Department / Category"}
            <select value={form.category_id} onChange={set("category_id")}>
              <option value="">— select —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          {isMedication ? (
            <>
              <label>
                Dosage Form
                <select value={form.dosage_form} onChange={set("dosage_form")}>
                  {DOSAGE_FORMS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              <label>
                Strength / Dosage
                <input placeholder="e.g. 500 mg" value={form.strength_dosage} onChange={set("strength_dosage")} />
              </label>
            </>
          ) : (
            <>
              <label>
                Packaging / Unit Type
                <select value={form.packaging_unit_type} onChange={set("packaging_unit_type")}>
                  {PACKAGING_TYPES.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              <label>
                Pack Size / Volume
                <input placeholder="e.g. 500 ml" value={form.pack_size_volume} onChange={set("pack_size_volume")} />
              </label>
            </>
          )}

                    <label>
            Batch / Lot Number *
            <input value={form.batch_number} onChange={set("batch_number")} required />
          </label>
          <label>
            Date of Manufacture
            <input
              type="date"
              value={form.manufacture_date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={set("manufacture_date")}
            />
          </label>
          <label>
            Expiry Date *
            <input type="date" value={form.expiry_date} onChange={set("expiry_date")} required />
          </label>
          <label>
            Barcode (EAN/UPC)
            <input value={form.barcode} onChange={set("barcode")} />
          </label>

          <label>
            {isPack ? "Stock (Tablets)" : `Stock Quantity${unitPlural ? ` (${unitPlural})` : ""}`}
            <input type="number" value={form.stock_quantity} onChange={set("stock_quantity")} />
          </label>
          <label>
            {isPack ? "Reorder Level (Tabs)" : "Min Reorder Level"}
            <input type="number" value={form.min_reorder_level} onChange={set("min_reorder_level")} />
          </label>
          <label>
            {isPack ? "Cost / Tablet (KSh)" : "Cost Price (KSh)"}
            <input type="number" step="0.01" value={form.cost_price} onChange={set("cost_price")} />
          </label>
          <label>
            {isPack ? "Retail / Tablet (KSh)" : "Retail Selling Price (KSh)"}
            <input type="number" step="0.01" value={form.selling_price} onChange={set("selling_price")} />
          </label>

          {isPack && (
            <div className="span-2 tablet-pack-config">
              <p className="muted small">
                <strong>Tablet Pricing Rule:</strong> stock, reorder level, and all prices above apply{" "}
                <strong>per tablet</strong>. Pack rates below are calculated automatically.
              </p>
              <div className="form-grid">
                <label>
                  Tablets per Pack / Blister Strip
                  <input type="number" value={form.units_per_pack} onChange={set("units_per_pack")} />
                </label>
                <label>
                  Pack / Packaging Description
                  <input placeholder="e.g. Blister strip of 10" value={form.pack_description} onChange={set("pack_description")} />
                </label>
              </div>
            </div>
          )}

          <label>
            {isMedication ? "Dispensary Shelf / Storage Location" : "Aisle / Shelf / Display Rack"}
            <input value={form.shelf_location} onChange={set("shelf_location")} />
          </label>

          {isMedication && (
            <label className="checkbox-label">
              <input type="checkbox" checked={form.requires_prescription} onChange={set("requires_prescription")} />
              Prescription Required (Rx Only)
            </label>
          )}

          <label className="span-2">
            Storage Instructions / Product Notes
            <textarea value={form.storage_notes} onChange={set("storage_notes")} rows={2} />
          </label>
        </div>

        <div className="wholesale-tier">
          <h3>🏢 Wholesale &amp; Bulk Pricing Tier</h3>
          <p className="muted small">Special bulk price for partner clinics, dispensaries, or bulk purchases.</p>
          <div className="form-grid">
            <label>
              Wholesale Unit Price (KSh)
              <input type="number" step="0.01" value={form.wholesale_unit_price} onChange={set("wholesale_unit_price")} />
            </label>
            <label>
              Min Wholesale Qty (MOQ)
              <input type="number" value={form.min_wholesale_qty} onChange={set("min_wholesale_qty")} />
            </label>
            <label>
              Wholesale Bulk Packaging
              <input value={form.wholesale_bulk_packaging} onChange={set("wholesale_bulk_packaging")} />
            </label>
          </div>
          {(retailMargin || wholesaleMargin) && (
            <div className="margin-preview">
              {retailMargin && <span>Retail Margin: <strong>{retailMargin}%</strong></span>}
              {wholesaleMargin && <span>Wholesale Margin: <strong>{wholesaleMargin}%</strong></span>}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Save to Inventory"}
          </button>
        </div>
      </form>
    </div>
  );
}
