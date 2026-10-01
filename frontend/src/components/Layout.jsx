import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";
import api from "../api/client";

export default function Layout({ children }) {
  const [pharmacy, setPharmacy] = useState(null);

  useEffect(() => {
    api
      .get("/pharmacy/settings")
      .then((res) => setPharmacy(res.data.settings))
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <StatusBar pharmacy={pharmacy} />
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
