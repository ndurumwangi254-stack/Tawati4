import { useState } from "react";
import api from "../api/client";

export const SUPPLIER_CATEGORIES = [
  { value: "pharmaceuticals", label: "Pharmaceuticals & Rx Meds" },
  { value: "consumer", label: "Consumer & Toiletries" },
];

export const PAYMENT_TERMS = [
  "Cash on Delivery",
  "7 Days Credit",
  "14 Days Credit",
  "30 Days Net",
  "60 Days Net",
];

const BLANK = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  kra_pin: "",
  category: "pharmaceuticals",
  payment_terms: "14 Days Credit",
  address: "",
  notes: "",
};

/**
 * Add / edit a supplier. Used from the Suppliers page and from the
 * "+ Add Supplier" button inside the Add Item form.
 *
 * Props: supplier (optional, to edit), onClose, onSaved(supplier)
 */
export default function SupplierModal({ supplier, onClose, onSaved }) {
  const isEditing = !!supplier;
  const [form, setForm] = useState(() =>
    supplier
      ? Object.fromEntries(Object.keys(BLANK).map((k) => [k, supplier[k] ?? BLANK[k]]))
      : BLANK
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = isEditing
        ? await api.put(`/suppliers/${supplier.id}`, form)
        : await api.post("/suppliers", form);
      if (res.data.already_exists) {
        setError("A supplier with this name already exists. Edit that one instead.");
        return;
      }
      onSaved(res.data.supplier);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save supplier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>{isEditing ? "Edit Supplier / Distributor" : "Add New Supplier / Distributor"}</h2>
            <div className="muted small">Register vendor for inventory tracking &amp; restocking</div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>×</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-grid">
          <label className="span-2">
            Supplier / Company Name *
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Harleys Pharma Ltd, Medisell East Africa"
              required
              autoFocus
            />
          </label>

          <label>
            Contact Person / Rep
            <input value={form.contact_person} onChange={set("contact_person")} placeholder="e.g. Samuel Mutua (Med Rep)" />
          </label>
          <label>
            Phone Number
            <input value={form.phone} onChange={set("phone")} placeholder="+254 722 000 000" />
          </label>

          <label>
            Official Email
            <input type="email" value={form.email} onChange={set("email")} placeholder="orders@supplier.co.ke" />
          </label>
          <label>
            KRA PIN Number
            <input value={form.kra_pin} onChange={set("kra_pin")} placeholder="P051289410Z" />
          </label>

          <label>
            Supplier Category
            <select value={form.category} onChange={set("category")}>
              {SUPPLIER_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <label>
            Payment Terms
            <select value={form.payment_terms} onChange={set("payment_terms")}>
              {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label className="span-2">
            Physical Location / Depot Address
            <input
              value={form.address}
              onChange={set("address")}
              placeholder="e.g. Industrial Area, Commercial St, Enterprise Rd, Nairobi"
            />
          </label>

          <label className="span-2">
            Notes &amp; Ordering Information
            <textarea
              rows={3}
              value={form.notes}
              onChange={set("notes")}
              placeholder="e.g. Delivery on Tuesdays & Fridays, min order KSh 10,000 for free delivery"
            />
          </label>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save Supplier"}
          </button>
        </div>
      </form>
    </div>
  );
}