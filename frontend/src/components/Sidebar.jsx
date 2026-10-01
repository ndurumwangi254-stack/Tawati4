import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const OWNER_ONLY_ITEMS = new Set(["/reports", "/audit-log", "/users"]);

const NAV_ITEMS = [
  { to: "/dashboard", label: "Welcome Dashboard" },
  { to: "/inventory", label: "Inventory Catalog" },
  { to: "/pos", label: "Dispense & POS" },
  { to: "/patients", label: "Patients & Records" },
  { to: "/expiry-low-stock", label: "Expiry & Low Stock" },
  { to: "/audit-log", label: "Stock Audit Log" },
  { to: "/reports", label: "Reports & Profit Margins" },
  { to: "/wholesale", label: "Wholesale (B2B)" },
  { to: "/users", label: "Manage Users" },
];

export default function Sidebar() {
  const { user, isOwner, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.to === "/wholesale") return isOwner;
    if (OWNER_ONLY_ITEMS.has(item.to)) return isOwner;
    return true;
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-badge">TC</div>
        <div>
          <div className="brand-title">Tawati Chemist</div>
          <div className="brand-sub">Pharmacy POS &amp; Stock</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="user-name">{user?.name}</div>
        <div className="user-role">{isOwner ? "Owner" : "Dispenser"}</div>
        <button className="btn-link" onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
