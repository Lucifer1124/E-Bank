
import React from "react";

export default function HeaderBar({ user, balance, accountNumber, loading }) {
  return (
    <div className="up-card">
      <div className="up-header">
        <div>
          <h2 className="up-welcome">Welcome back, {user.username}</h2>
          <div className="up-sub">Safe · Private · Instant</div>
        </div>
        <div className="up-balance">
          <div className="title">Current balance</div>
          <div className="value">{loading ? "Loading..." : balance}</div>
          <div className="acct-number">Account: <strong style={{ marginLeft: 6 }}>{accountNumber || (accountNumber === "" ? "Primary" : "Not created")}</strong></div>
        </div>
      </div>
    </div>
  );
}
