import { useEffect, useState } from "react";
import api from "../api/client";
import { formatDate } from "../utils/format";

const BLANK = { name: "", username: "", password: "", phone: "" };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/users").then((res) => setUsers(res.data.users)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      setError("Name, username and password are all required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/users", { ...form, role: "dispenser" });
      setForm(BLANK);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create this account.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    const path = u.is_active ? "deactivate" : "reactivate";
    const verb = u.is_active ? "deactivate" : "reactivate";
    if (!window.confirm(`Are you sure you want to ${verb} ${u.name}'s account?`)) return;
    await api.patch(`/users/${u.id}/${path}`);
    load();
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>Manage Users</h2>
            <p className="muted">
              Only the owner can create Dispenser (employee) accounts and deactivate them.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Add Employee Account
          </button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="7" className="muted">Loading…</td></tr>}
            {!loading && users.map((u) => (
              <tr key={u.id}>
                <td className="cell-title">{u.name}</td>
                <td>{u.username}</td>
                <td>
                  <span className="badge badge-info">
                    {u.role === "owner" ? "Owner" : "Dispenser"}
                  </span>
                </td>
                <td>{u.phone || "—"}</td>
                <td>
                  <span className={"badge " + (u.is_active ? "badge-ok" : "badge-danger")}>
                    {u.is_active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td>{formatDate(u.created_at)}</td>
                <td>
                  {u.role !== "owner" && (
                    <button
                      className={"btn btn-sm " + (u.is_active ? "btn-danger" : "btn-success")}
                      onClick={() => toggleActive(u)}
                    >
                      {u.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr><td colSpan="7" className="muted">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Register New Employee (Dispenser)</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid">
                <label>
                  Full Name *
                  <input
                    className="input"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </label>
                <label>
                  Username *
                  <input
                    className="input"
                    required
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  />
                </label>
                <label>
                  Temporary Password *
                  <input
                    className="input"
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </label>
                <label>
                  Phone
                  <input
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
