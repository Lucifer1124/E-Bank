import React from "react";

export default function Sidebar({ user, active, setActive, logout, hasAccount }) {
  const navItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "transfer", label: "Transfer Money" },
    { key: "addMoney", label: "Add Money" },
    { key: "tx", label: "Transactions" },
    { key: "chatbot", label: "AI Chatbot" },
    { key: "loan", label: "Apply for Loan" },
    { key: "myloan", label: "My Loans" },
  ];

  return (
    <aside
      className="up-sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100vh",
        padding: "20px",
        width: 220,
        background: "linear-gradient(145deg, #ffffff 0%, #f8f9fb 100%)",
        boxShadow: "2px 0 15px rgba(0,0,0,0.05)",
        borderRadius: "0 20px 20px 0",
      }}
    >
      {/* User Info */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 30 }}>
        <div
          className="up-avatar"
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#e63946",
            color: "#fff",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontWeight: 700,
            fontSize: 20,
          }}
        >
          {user.username?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div>
          <div className="up-username" style={{ fontWeight: 700, fontSize: 16 }}>
            {user.username || "User"}
          </div>
          <div className="up-role" style={{ fontSize: 12, color: "#666" }}>
            {String(user.role || "USER").toUpperCase()}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="up-nav" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`up-btn ${active === item.key ? "active" : ""}`}
            onClick={() => setActive(item.key)}
            disabled={!hasAccount}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: active === item.key ? "#e63946" : "#fff",
              color: active === item.key ? "#fff" : "#333",
              fontWeight: 600,
              border: "none",
              cursor: hasAccount ? "pointer" : "not-allowed",
              opacity: hasAccount ? 1 : 0.6,
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              if (hasAccount && active !== item.key) e.currentTarget.style.background = "#fddede";
            }}
            onMouseOut={(e) => {
              if (active !== item.key) e.currentTarget.style.background = "#fff";
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="up-logout" style={{ marginTop: 30 }}>
        <button
          className="ghost"
          onClick={logout}
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 10,
            border: "1px solid #e63946",
            color: "#e63946",
            fontWeight: 600,
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "#e63946";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.color = "#e63946";
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
