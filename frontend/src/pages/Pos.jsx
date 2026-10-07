import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { formatKsh, isPackForm, unitLabel } from "../utils/format";
import ReceiptModal from "../components/ReceiptModal";

export default function Pos() {
  const { isOwner } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState("retail"); // 'retail' | 'wholesale'
  const [products, setProducts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [catalogTab, setCatalogTab] = useState("all"); // 'all' | 'medication' | 'retail_item'
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [tray, setTray] = useState([]); // [{product, quantity}]
  const [patientId, setPatientId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [prescriptionRef, setPrescriptionRef] = useState("");
  const [daysOfSupply, setDaysOfSupply] = useState("");
  const [discountId, setDiscountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");

  const [newCustomer, setNewCustomer] = useState({ business_name: "", contact_person: "", phone: "", kra_pin: "", ppb_health_license: "", delivery_address: "" });

  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/products").then((res) => setProducts(res.data.products));
    api.get("/patients").then((res) => setPatients(res.data.patients));
    api.get("/discounts").then((res) => setDiscounts(res.data.discounts));
    if (isOwner) api.get("/wholesale/customers").then((res) => setCustomers(res.data.customers));
  }, [isOwner]);

  // Arriving from Inventory Catalog via the Dispense / Sell / POS button:
  // jump straight to that product (right tab + search) instead of a blank catalog.
  useEffect(() => {
    const productId = searchParams.get("product");
    if (!productId || products.length === 0) return;
    const target = products.find((p) => String(p.id) === productId);
    if (target) {
      setCatalogTab(target.product_type);
      setCategoryFilter("all");
      setSearch(target.name);
    }
    setSearchParams({}, { replace: true });
  }, [products, searchParams, setSearchParams]);

  const byType = useMemo(() => {
    if (catalogTab === "all") return products;
    return products.filter((p) => p.product_type === catalogTab);
  }, [products, catalogTab]);

  const categories = useMemo(() => {
    const names = new Set();
    byType.forEach((p) => p.category && names.add(p.category));
    return Array.from(names).sort();
  }, [byType]);

  const filteredProducts = useMemo(() => {
    let list = byType;
    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.barcode || "").toLowerCase().includes(s) ||
          (p.shelf_location || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [byType, categoryFilter, search]);

  const medsCount = products.filter((p) => p.product_type === "medication").length;
  const shopCount = products.filter((p) => p.product_type === "retail_item").length;

  const addToTray = (product, qty = 1) => {
    setTray((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + qty } : line
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const removeLine = (productId) => setTray((prev) => prev.filter((l) => l.product.id !== productId));

  const priceFor = (product, quantity) => {
    if (mode === "wholesale" && product.min_wholesale_qty && quantity >= product.min_wholesale_qty && product.wholesale_unit_price) {
      return Number(product.wholesale_unit_price);
    }
    return Number(product.selling_price);
  };

  const subtotal = tray.reduce((sum, l) => sum + priceFor(l.product, l.quantity) * l.quantity, 0);
  const discount = discounts.find((d) => d.id === discountId);
  const discountAmount = discount
    ? discount.discount_type === "percentage"
      ? (subtotal * Number(discount.value)) / 100
      : Math.min(Number(discount.value), subtotal)
    : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const change = paymentMethod === "cash" && amountReceived ? Number(amountReceived) - total : 0;

  const resetSale = () => {
    setTray([]);
    setPatientId("");
    setWalkInName("");
    setPrescriptionRef("");
    setDaysOfSupply("");
    setDiscountId("");
    setAmountReceived("");
  };

  const handleRetailCheckout = async () => {
    setError("");
    if (tray.length === 0) return setError("Add at least one item to the tray.");
    if (paymentMethod === "cash" && (!amountReceived || Number(amountReceived) < total)) {
      return setError("Amount received must cover the total payable.");
    }
    setSubmitting(true);
    try {
      const res = await api.post("/sales", {
        patient_id: patientId || null,
        prescription_ref: prescriptionRef || null,
        days_of_supply: daysOfSupply ? Number(daysOfSupply) : null,
        discount_id: discountId || null,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === "cash" ? Number(amountReceived) : total,
        items: tray.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      });
      setReceipt(res.data.sale);
      resetSale();
    } catch (err) {
      setError(err.response?.data?.error || "Could not complete this sale.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.business_name) return;
    const res = await api.post("/wholesale/customers", newCustomer);
    setCustomers((prev) => [...prev, res.data.customer]);
    return res.data.customer.id;
  };

  const [wholesaleCustomerId, setWholesaleCustomerId] = useState("");

  const handleWholesaleCheckout = async () => {
    setError("");
    if (tray.length === 0) return setError("Add at least one item to the order.");
    let customerId = wholesaleCustomerId;
    if (!customerId && newCustomer.business_name) {
      customerId = await handleCreateCustomer();
    }
    if (!customerId) return setError("Select or register the wholesale buyer/institution.");

    setSubmitting(true);
    try {
      const res = await api.post("/wholesale/orders", {
        wholesale_customer_id: customerId,
        payment_method: paymentMethod,
        items: tray.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      });
      setReceipt(res.data.sale);
      resetSale();
    } catch (err) {
      setError(err.response?.data?.error || "Could not complete this wholesale order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {isOwner && (
        <div className="transaction-mode">
          <span className="muted small">TRANSACTION MODE:</span>
          <button
            className={"toggle-btn" + (mode === "retail" ? " active" : "")}
            onClick={() => { setMode("retail"); setTray([]); }}
          >
            🛒 Retail Sale (Patient / OTC)
          </button>
          <button
            className={"toggle-btn" + (mode === "wholesale" ? " active" : "")}
            onClick={() => { setMode("wholesale"); setTray([]); }}
          >
            🏢 Wholesale / B2B Sale (Clinics &amp; Bulk Buyers)
          </button>
        </div>
      )}

      <div className="pos-layout">
        <div className="panel pos-catalog">
          <h2>{mode === "wholesale" ? "Wholesale Catalog (Clinics, Dispensaries & Bulk)" : "Point of Sale & Dispensing Catalog"}</h2>
          <p className="cell-sub" style={{ marginTop: "-0.5rem", marginBottom: "0.9rem" }}>
            Click any drug or retail item to add it to the {mode === "wholesale" ? "order" : "checkout tray"}.
          </p>

          <input
            className="input search-input"
            placeholder="Search name, barcode, shelf…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="tabs" style={{ marginBottom: "0.75rem" }}>
            <button
              className={"tab" + (catalogTab === "all" ? " active" : "")}
              onClick={() => { setCatalogTab("all"); setCategoryFilter("all"); }}
            >
              All Products <span className="tab-count">{products.length}</span>
            </button>
            <button
              className={"tab" + (catalogTab === "medication" ? " active" : "")}
              onClick={() => { setCatalogTab("medication"); setCategoryFilter("all"); }}
            >
              Medicines <span className="tab-count">{medsCount}</span>
            </button>
            <button
              className={"tab" + (catalogTab === "retail_item" ? " active" : "")}
              onClick={() => { setCatalogTab("retail_item"); setCategoryFilter("all"); }}
            >
              Shop Items <span className="tab-count">{shopCount}</span>
            </button>
            <span className="cell-sub" style={{ marginLeft: "auto", alignSelf: "center" }}>
              {filteredProducts.length} items available
            </span>
          </div>

          {categories.length > 0 && (
            <div className="tabs" style={{ marginBottom: "1rem" }}>
              <button
                className={"tab" + (categoryFilter === "all" ? " active" : "")}
                onClick={() => setCategoryFilter("all")}
              >
                All Categories
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  className={"tab" + (categoryFilter === c ? " active" : "")}
                  onClick={() => setCategoryFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="pos-grid">
            {filteredProducts.map((p) => {
              const isMed = p.product_type === "medication";
              const isPack = isMed && isPackForm(p.dosage_form) && !!p.units_per_pack;
              const packSize = isPack ? p.units_per_pack : null;
              const packPrice = packSize ? Number(p.selling_price) * packSize : null;
              const packsWhole = packSize ? Math.floor(p.stock_quantity / packSize) : null;
              const loose = packSize ? p.stock_quantity % packSize : null;
              const unit = isMed ? unitLabel(p.dosage_form, p.stock_quantity) : null;

              return (
                <div
                  key={p.id}
                  className="pos-tile"
                  style={!isMed ? { cursor: "pointer" } : undefined}
                  onClick={!isMed ? () => addToTray(p, 1) : undefined}
                >
                  <div className="cell-title">
                    {p.name}{" "}
                    {isMed ? (
                      p.requires_prescription ? (
                        <span className="badge badge-rx">Rx</span>
                      ) : (
                        <span className="badge badge-ok">OTC</span>
                      )
                    ) : (
                      <span className="badge badge-info">Shop</span>
                    )}
                  </div>
                  <div className="cell-sub">
                    {p.variant_description}
                    {p.strength_dosage ? ` • ${p.strength_dosage}` : ""}
                  </div>
                  <div className="cell-sub">
                    Shelf: {p.shelf_location}
                    {p.pack_description ? ` • ${p.pack_description}` : ""}
                  </div>

                  <div className="pos-tile-footer">
                    <div>
                      <div className="cell-title text-success">
                        {formatKsh(p.selling_price)}
                        {isMed && <span className="cell-sub"> / {unitLabel(p.dosage_form, 1)}</span>}
                      </div>
                      {packSize && (
                        <div className="cell-sub">Pack ({packSize}s): {formatKsh(packPrice)}</div>
                      )}
                      <div className="cell-sub">
                        {isMed
                          ? `${p.stock_quantity} ${unit}${packSize ? ` (${packsWhole} packs + ${loose} loose)` : ""}`
                          : `${p.stock_quantity} in stock`}
                      </div>
                      {typeof p.wholesale_unit_price !== "undefined" && p.wholesale_unit_price && (
                        <div className="cell-sub" style={{ color: "var(--primary)" }}>
                          WS: {formatKsh(p.wholesale_unit_price)} (min {p.min_wholesale_qty})
                        </div>
                      )}
                    </div>

                    {isMed ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        <button className="btn btn-sm" onClick={() => addToTray(p, 1)}>
                          +1 {unitLabel(p.dosage_form, 1)[0].toUpperCase() + unitLabel(p.dosage_form, 1).slice(1)}
                        </button>
                        {packSize && (
                          <button className="btn btn-sm btn-success" onClick={() => addToTray(p, packSize)}>
                            +1 Pack ({packSize})
                          </button>
                        )}
                      </div>
                    ) : (
                      <button className="btn btn-sm btn-success" onClick={(e) => { e.stopPropagation(); addToTray(p, 1); }}>
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel pos-tray">
          <h2>{mode === "wholesale" ? "Wholesale Commercial Order Tray" : "Dispensary Tray"}</h2>
          {tray.length === 0 && <p className="muted">The tray is empty. Click items from the catalog to add them.</p>}
          {tray.map((line) => (
            <div key={line.product.id} className="tray-line">
              <div>
                <div className="cell-title">{line.product.name}</div>
                <div className="cell-sub">
                  {line.quantity} × {formatKsh(priceFor(line.product, line.quantity))}
                </div>
              </div>
              <div className="tray-line-actions">
                <button
                  className="btn-icon"
                  onClick={() =>
                    setTray((prev) =>
                      prev.map((l) => (l.product.id === line.product.id ? { ...l, quantity: l.quantity + 1 } : l))
                    )
                  }
                >
                  +
                </button>
                <button
                  className="btn-icon"
                  onClick={() =>
                    setTray((prev) =>
                      prev
                        .map((l) => (l.product.id === line.product.id ? { ...l, quantity: l.quantity - 1 } : l))
                        .filter((l) => l.quantity > 0)
                    )
                  }
                >
                  −
                </button>
                <button className="btn-icon" onClick={() => removeLine(line.product.id)}>×</button>
              </div>
            </div>
          ))}

          {mode === "retail" ? (
            <>
              <label>
                Registered Patient File (optional)
                <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                  <option value="">— Walk-in Customer —</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.patient_code})</option>
                  ))}
                </select>
              </label>
              {!patientId && (
                <label>
                  Customer Name
                  <input placeholder="Walk-in Customer" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} />
                </label>
              )}
                            <label>
                Prescription Ref # (optional)
                <input value={prescriptionRef} onChange={(e) => setPrescriptionRef(e.target.value)} />
              </label>
              <label>
                Days of Supply (optional — sets a refill-due date)
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 30"
                  value={daysOfSupply}
                  onChange={(e) => setDaysOfSupply(e.target.value)}
                />
              </label>
              <label>
                Discount
                <select value={discountId} onChange={(e) => setDiscountId(e.target.value)}>
                  <option value="">No discount</option>
                  {discounts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.discount_type === "percentage" ? `${d.value}%` : formatKsh(d.value)})
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <div className="wholesale-buyer-form">
              <h3>🏢 Wholesale Buyer / Institution Details</h3>
              <label>
                Existing buyer
                <select value={wholesaleCustomerId} onChange={(e) => setWholesaleCustomerId(e.target.value)}>
                  <option value="">— register new below —</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                </select>
              </label>
              {!wholesaleCustomerId && (
                <>
                  <label>
                    Clinic / Facility / Business Name *
                    <input value={newCustomer.business_name} onChange={(e) => setNewCustomer((c) => ({ ...c, business_name: e.target.value }))} />
                  </label>
                  <label>
                    Contact Person / Doctor
                    <input value={newCustomer.contact_person} onChange={(e) => setNewCustomer((c) => ({ ...c, contact_person: e.target.value }))} />
                  </label>
                  <label>
                    Phone Number
                    <input value={newCustomer.phone} onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))} />
                  </label>
                  <label>
                    KRA PIN / Tax ID
                    <input value={newCustomer.kra_pin} onChange={(e) => setNewCustomer((c) => ({ ...c, kra_pin: e.target.value }))} />
                  </label>
                  <label>
                    PPB / Health License #
                    <input value={newCustomer.ppb_health_license} onChange={(e) => setNewCustomer((c) => ({ ...c, ppb_health_license: e.target.value }))} />
                  </label>
                  <label>
                    Delivery Address / PO Ref #
                    <input value={newCustomer.delivery_address} onChange={(e) => setNewCustomer((c) => ({ ...c, delivery_address: e.target.value }))} />
                  </label>
                </>
              )}
            </div>
          )}

          <label>
            Payment Method
            <div className="payment-toggle">
              <button className={"toggle-btn" + (paymentMethod === "cash" ? " active" : "")} onClick={() => setPaymentMethod("cash")} type="button">Cash</button>
              <button className={"toggle-btn" + (paymentMethod === "mpesa" ? " active" : "")} onClick={() => setPaymentMethod("mpesa")} type="button">M-Pesa / Mobile</button>
            </div>
          </label>

          {mode === "retail" && paymentMethod === "cash" && (
            <label>
              Amount Received (KSh)
              <input type="number" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} />
            </label>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <div className="pos-total">
            <span>Total Payable:</span>
            <strong>{formatKsh(mode === "retail" ? total : subtotal)}</strong>
          </div>
          {mode === "retail" && paymentMethod === "cash" && amountReceived && (
            <div className="pos-total muted">
              <span>Change Due:</span>
              <strong>{formatKsh(Math.max(0, change))}</strong>
            </div>
          )}

          <button
            className="btn btn-primary btn-block"
            disabled={submitting}
            onClick={mode === "retail" ? handleRetailCheckout : handleWholesaleCheckout}
          >
            {submitting
              ? "Processing…"
              : mode === "retail"
              ? "✓ Complete Sale & Print Receipt"
              : "✓ Complete Wholesale Order & Issue Invoice"}
          </button>
        </div>
      </div>

      {receipt && <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
