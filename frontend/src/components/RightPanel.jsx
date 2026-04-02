import React from "react";

const maskAccount = (acc) => {
    const str = String(acc);
    if (str.length <= 5) return str;
    return str.slice(0, 3) + "X".repeat(str.length - 5) + str.slice(-2);
  };
  
export default function RightPanel({ balance, accountNumber, onSendClick }) {
  const copyAccountNumber = async () => {
  if (!accountNumber) return;
  try {
    await navigator.clipboard.writeText(String(accountNumber));
  } catch (err) {
    console.error("Failed to copy account number", err);
  }
};

  return (
    
    <aside style={{ display: "flex", flexDirection: "column", gap: 20, width: 300 }}>
      
      {/* Account Summary */}
      <div
        className="panel card shadow-sm p-3"
        style={{
          borderRadius: 16,
          background: "linear-gradient(145deg, #ffffff 0%, #f7f5ff 100%)",
          boxShadow: "0 8px 20px rgba(46,43,65,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 16, color: "#8672ff" }}>Account Summary</div>
        <div className="small-muted">
          Primary balance:{" "}
          <strong style={{ marginLeft: 6, color: "#28a745" }}>
            {typeof balance === "number"
              ? balance.toLocaleString("en-IN", { style: "currency", currency: "INR" })
              : balance}
          </strong>
        </div>
        <div className="small-muted">
          Account number:{" "}
        <span
          style={{ fontWeight: 700, marginLeft: 6, cursor: "pointer" }}
        >
          {accountNumber ? maskAccount(accountNumber) : "Not created"}
        </span>
            <button
              type="button"
              cursor="pointer"
              className="ghost"
              onClick={copyAccountNumber}
              style={{ marginLeft: 8, padding: "4px 10px", borderRadius: 8 }}
            >
              Copy
            </button>
    </div>
      <button
          className="primary"
          onClick={onSendClick}
          style={{
            marginTop: 12,
            width: "100%",
            fontWeight: 600,
            borderRadius: 12,
            padding: "10px 0",
          }}
        >
          Send Money
        </button>
      </div>

      {/* Security Panel */}
      <div
        className="panel card shadow-sm p-3"
        style={{
          borderRadius: 16,
          background: "linear-gradient(145deg, #ffffff 0%, #f7f5ff 100%)",
          boxShadow: "0 8px 20px rgba(46,43,65,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, color: "#8672ff" }}>Security</div>
          <div className="small-muted">2FA recommended</div>
        </div>
        <div className="small-muted">
          Last login:{" "}
          <span style={{ fontWeight: 700, marginLeft: 6 }}>{new Date().toLocaleString()}</span>
        </div>
        <button
          className="ghost"
          style={{ width: "100%", marginTop: 10, borderRadius: 12, padding: "10px 0" }}
          onClick={() => alert("2FA setup flow not implemented")}
        >
          Setup 2FA
        </button>
      </div>

      {/* Support Panel */}
      <div
        className="panel card shadow-sm p-3"
        style={{
          borderRadius: 16,
          background: "linear-gradient(145deg, #ffffff 0%, #f7f5ff 100%)",
          boxShadow: "0 8px 20px rgba(46,43,65,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 800, color: "#8672ff" }}>Support</div>
        <div className="small-muted">
          Need help? Contact support from the backend system.
        </div>
        <button
          className="ghost"
          style={{ width: "100%", marginTop: 10, borderRadius: 12, padding: "10px 0" }}
          onClick={() => alert("Open support modal (not implemented)")}
        >
          Contact Support
        </button>
      </div>
    </aside>
  );
}
