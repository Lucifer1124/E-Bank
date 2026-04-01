import React from "react";
import LoadingInline from "./LoadingInLine";
import { motion } from "framer-motion";

export default function TransactionsPanel({ transactions, loading, onReload }) {
  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.03 } }),
  };

  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  return (
    <motion.div
      className="card border-0 shadow-lg p-4 position-relative overflow-hidden panel"
      style={{
        padding: 24,
        borderRadius: 18,
        background: "linear-gradient(145deg, #ffffff 0%, #f8f9fb 100%)",
        color: "#1a1a1a",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        width: 850,
        backdropFilter: "blur(6px)",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid rgba(0,0,0,0.05)",
          paddingBottom: 12,
        }}
      >
        <div>
          <div
            className="fw-bold text-danger"
            style={{
              fontSize: 20,
              color: "linear-gradient(135deg, #ff6b81 0%, #e63946 100%)",
            }}
          >
            Transactions
          </div>
          <div style={{ fontSize: 14, color: "#666" }}>Complete transaction history</div>
        </div>

        <motion.button
          className="primary"
          onClick={onReload}
          style={{
            padding: "8px 18px",
            fontWeight: 600,
            fontSize: 14,
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            transition: "transform 0.2s ease",
          }}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          Reload
        </motion.button>
      </div>

      {/* Table Section */}
      <div style={{ marginTop: 20 }}>
        {loading ? (
          <LoadingInline text="Loading transactions..." />
        ) : transactions && transactions.length ? (
          <div
            style={{
              maxHeight: 520,
              overflowY: "auto",
              borderRadius: 12,
              background: "#ffffff",
              boxShadow: "inset 0 0 8px rgba(0,0,0,0.05)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                color: "#1a1a1a",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: "linear-gradient(135deg, #ff6b81 0%, #e63946 100%)",
                  color: "#fff",
                  zIndex: 1,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <tr>
                  {["Timestamp", "From", "To", "Amount", "Foreign"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "14px 12px",
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: "uppercase",
                        textAlign: "left",
                        letterSpacing: "0.5px",
                        borderBottom: "1px solid rgba(255,255,255,0.2)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {transactions.map((t, i) => (
                  <motion.tr
                    key={i}
                    style={{
                      background: i % 2 === 0 ? "#fff" : "#f7f9fc",
                      transition: "all 0.25s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "rgba(255,107,129,0.1)";
                      e.currentTarget.style.transform = "scale(1.01)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f7f9fc";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                    initial="hidden"
                    animate="visible"
                    variants={rowVariants}
                    custom={i}
                  >
                    <td style={{ padding: "12px 12px", fontWeight: 400 }}>
                      {t.timestamp ? new Date(t.timestamp).toLocaleString() : "-"}
                    </td>
                    <td style={{ padding: "12px 12px" }}>{t.senderAccount || t.from || "-"}</td>
                    <td style={{ padding: "12px 12px" }}>{t.receiverAccount || t.to || "-"}</td>
                    <td style={{ padding: "12px 12px", fontWeight: 600, color: "#e63946" }}>
                      {typeof t.amount === "number"
                        ? t.amount.toLocaleString("en-IN", { style: "currency", currency: "INR" })
                        : t.amount}
                    </td>
                    
                    <td style={{ padding: "12px 12px", fontWeight: 500 }}>
                      {t.isForeign ? "Yes" : "No"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: "#666", marginTop: 12, textAlign: "center", fontStyle: "italic" }}>
            No transactions found.
          </div>
        )}
      </div>
    </motion.div>
  );
}
