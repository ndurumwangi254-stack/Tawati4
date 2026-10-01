import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Pos from "./pages/Pos";
import Patients from "./pages/Patients";
import ExpiryLowStock from "./pages/ExpiryLowStock";
import StockAuditLog from "./pages/StockAuditLog";
import Reports from "./pages/Reports";
import Wholesale from "./pages/Wholesale";
import Users from "./pages/Users";

function Private({ children, ownerOnly }) {
  return (
    <ProtectedRoute ownerOnly={ownerOnly}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
      <Route path="/inventory" element={<Private><Inventory /></Private>} />
      <Route path="/pos" element={<Private><Pos /></Private>} />
      <Route path="/patients" element={<Private><Patients /></Private>} />
      <Route path="/expiry-low-stock" element={<Private><ExpiryLowStock /></Private>} />

      <Route path="/audit-log" element={<Private ownerOnly><StockAuditLog /></Private>} />
      <Route path="/reports" element={<Private ownerOnly><Reports /></Private>} />
      <Route path="/wholesale" element={<Private ownerOnly><Wholesale /></Private>} />
      <Route path="/users" element={<Private ownerOnly><Users /></Private>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
