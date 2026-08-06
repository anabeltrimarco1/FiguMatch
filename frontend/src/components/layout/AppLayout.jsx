import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import "../../styles/layout.css";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function openSidebar() {
    setSidebarOpen(true);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
      />

      <div className="app-main">
        <Header onMenuClick={openSidebar} />

        <main className="app-content">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
