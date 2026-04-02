import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import API from "../api";

const formatCurrency = (value) => `Rs ${Number(value ?? 0).toLocaleString("en-IN")}`;

export default function AdminRepaymentTable() {
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchUsername, setSearchUsername] = useState("");
  const [error, setError] = useState(null);
  const token = localStorage.getItem("token");

  const fetchRepayments = useCallback(async (username = "") => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = username
        ? `/repay/admin/repayments?username=${encodeURIComponent(username)}`
        : "/repay/admin/repayments";

      const res = await API.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRepayments(res.data || []);
    } catch (err) {
      console.error("Failed to fetch repayments", err);
      setError("Could not load repayments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRepayments();
  }, [fetchRepayments]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRepayments(searchUsername.trim());
  };

  return (
    <div className="admin-card" style={{ background: "#f8f6ff" }}>
      <h5 style={{ marginBottom: 16 }}>Ongoing Loans</h5>

      <form
        onSubmit={handleSearch}
        className="d-flex mb-3"
        style={{ gap: "10px", alignItems: "center" }}
      >
        <input
          type="text"
          className="form-control"
          placeholder="Search by username"
          value={searchUsername}
          onChange={(e) => setSearchUsername(e.target.value)}
          style={{
            borderRadius: "8px",
            border: "1px solid rgba(134, 114, 255, 0.22)",
            padding: "8px 12px",
            flex: 1,
            outline: "none",
          }}
        />
        <motion.button
          type="submit"
          className="primary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            backgroundColor: "#8672FF",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            color: "#fff",
            fontWeight: 500,
          }}
        >
          Search
        </motion.button>
        <motion.button
          type="button"
          className="btn btn-outline-danger"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setSearchUsername("");
            fetchRepayments();
          }}
          style={{
            border: "1px solid #8672FF",
            color: "#8672FF",
            borderRadius: "8px",
            padding: "8px 16px",
            fontWeight: 500,
            background: "transparent",
          }}
        >
          Show All
        </motion.button>
      </form>

      {loading ? (
        <div className="alert alert-danger text-center">Loading repayments...</div>
      ) : error ? (
        <div className="alert alert-danger text-center">{error}</div>
      ) : repayments.length === 0 ? (
        <div className="alert alert-danger text-center">No repayments found.</div>
      ) : (
        <div className="table-responsive">
          <motion.table
            className="admin-table"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr>
                <th className="p-3">Repayment ID</th>
                <th className="p-3">Type</th>
                <th className="p-3">Username</th>
                <th className="p-3">Loan ID</th>
                <th className="p-3">Amount Paid</th>
                <th className="p-3">Principal</th>
                <th className="p-3">Interest</th>
                <th className="p-3">Before</th>
                <th className="p-3">Remaining Balance</th>
                <th className="p-3">Payment Date</th>
              </tr>
            </thead>
            <tbody>
              {repayments.map((repayment, index) => (
                <motion.tr
                  key={repayment.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ backgroundColor: "rgba(134,114,255,0.08)" }}
                  style={{
                    borderBottom: "1px solid #eee",
                    transition: "0.2s ease",
                  }}
                >
                  <td className="p-3">{repayment.id}</td>
                  <td className="p-3">{repayment.entryType === "PLAN_SETUP" ? "Plan Setup" : "Payment"}</td>
                  <td className="p-3">{repayment.username}</td>
                  <td className="p-3">{repayment.loanId}</td>
                  <td className="p-3">{formatCurrency(repayment.amountPaid)}</td>
                  <td className="p-3">{formatCurrency(repayment.principalComponent)}</td>
                  <td className="p-3">{formatCurrency(repayment.interestComponent)}</td>
                  <td className="p-3">{formatCurrency(repayment.balanceBeforePayment)}</td>
                  <td className="p-3">{formatCurrency(repayment.remainingBalance)}</td>
                  <td className="p-3">
                    {new Date(repayment.paymentDate).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </motion.table>
        </div>
      )}
    </div>
  );
}
