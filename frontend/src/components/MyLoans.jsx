import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import API from "../api";

const planOptions = [
  {
    value: "MONTHLY_EMI_3",
    label: "3% Monthly EMI",
    help: "Choose a tenure in months and the app will divide the total due into monthly installments.",
  },
  {
    value: "YEARLY_15",
    label: "15% Yearly",
    help: "Choose a tenure in years and the app will show the yearly installment amount.",
  },
  {
    value: "FLEXIBLE_10",
    label: "10% Flexible",
    help: "Pay whenever you want. The total loan due is principal plus 10% interest.",
  },
];

const currency = (value) =>
  `Rs ${Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const LoanRepaymentPanel = () => {
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [planForms, setPlanForms] = useState({});
  const [paymentInputs, setPaymentInputs] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState("");

  const syncPlanForms = (loanList) => {
    setPlanForms((prev) => {
      const next = { ...prev };
      loanList.forEach((loan) => {
        if (!next[loan.id]) {
          next[loan.id] = {
            planType: loan.repaymentPlanType || "MONTHLY_EMI_3",
            tenure:
              loan.repaymentPlanType === "YEARLY_15"
                ? String(loan.tenureYears ?? 1)
                : String(loan.tenureMonths ?? 12),
          };
        }
      });
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [loanRes, repaymentRes] = await Promise.all([
        API.get("/repay/user/approved"),
        API.get("/repay/repayments"),
      ]);
      const nextLoans = loanRes.data || [];
      setLoans(nextLoans);
      setRepayments(repaymentRes.data || []);
      syncPlanForms(nextLoans);
    } catch (err) {
      console.error("Error fetching loan data", err);
      setMessage({ type: "error", text: "Unable to load your loan details right now." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePlanFieldChange = (loanId, field, value) => {
    setPlanForms((prev) => ({
      ...prev,
      [loanId]: {
        ...(prev[loanId] || {}),
        [field]: value,
      },
    }));
  };

  const savePlan = async (loan) => {
    const form = planForms[loan.id] || {};
    const requiresTenure = form.planType !== "FLEXIBLE_10";
    if (!form.planType) {
      setMessage({ type: "error", text: "Please choose a repayment plan." });
      return;
    }
    if (requiresTenure && (!form.tenure || Number(form.tenure) <= 0)) {
      setMessage({ type: "error", text: "Please enter a valid tenure for the selected plan." });
      return;
    }

    setBusyKey(`plan-${loan.id}`);
    setMessage(null);
    try {
      await API.post(`/repay/plan/${loan.id}`, {
        planType: form.planType,
        tenure: requiresTenure ? Number(form.tenure) : null,
      });
      await fetchData();
      setMessage({ type: "success", text: `Repayment plan saved for loan #${loan.id}.` });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || err?.response?.data || "Unable to save the repayment plan.",
      });
    } finally {
      setBusyKey("");
    }
  };

  const makeRepayment = async (loan) => {
    const rawAmount = paymentInputs[loan.id];
    const amount = Number(rawAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: "error", text: "Enter a valid repayment amount." });
      return;
    }

    setBusyKey(`pay-${loan.id}`);
    setMessage(null);
    try {
      await API.post(`/repay/repay/${loan.id}`, { amount });
      setPaymentInputs((prev) => ({ ...prev, [loan.id]: "" }));
      await fetchData();
      setMessage({ type: "success", text: `Repayment recorded for loan #${loan.id}.` });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || err?.response?.data || "Repayment failed. Please try again.",
      });
    } finally {
      setBusyKey("");
    }
  };

  const paymentPreview = (loan) => {
    const amount = Number(paymentInputs[loan.id] || 0);
    if (!amount || amount <= 0) {
      return null;
    }

    const safeAmount = Math.min(amount, loan.remainingBalance);
    return {
      amount: safeAmount,
      interestPart: Math.min(safeAmount, loan.interestRemaining),
      principalPart: Math.max(safeAmount - Math.min(safeAmount, loan.interestRemaining), 0),
      remainingAfter: Math.max(loan.remainingBalance - safeAmount, 0),
    };
  };

  const tenurePlaceholder = (planType) =>
    planType === "YEARLY_15" ? "Tenure in years" : "Tenure in months";

  return (
    <motion.div
      style={{
        width: 900,
        padding: "30px 0",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div
        className="panel card shadow-lg"
        style={{
          width: "92%",
          borderRadius: 22,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          padding: 32,
          boxShadow: "0 14px 40px rgba(46,43,65,0.14)",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h4 className="text-danger" style={{ fontWeight: 800, marginBottom: 6 }}>
              My Loans
            </h4>
            <p style={{ margin: 0, color: "#666" }}>
              Configure a repayment plan after approval and track exactly what is due before and after each payment.
            </p>
          </div>
          <motion.button
            type="button"
            className="ghost"
            onClick={fetchData}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Refresh
          </motion.button>
        </div>

        {message && (
          <div
            style={{
              marginTop: 18,
              padding: "12px 14px",
              borderRadius: 12,
              background: message.type === "success" ? "#ebfff2" : "#fff1f1",
              border: `1px solid ${message.type === "success" ? "#b7ebc6" : "#f3b4b4"}`,
              color: message.type === "success" ? "#136a37" : "#9f1d1d",
              fontWeight: 600,
            }}
          >
            {message.text}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          {loading ? (
            <div style={emptyStateStyle}>Loading your approved loans...</div>
          ) : loans.length === 0 ? (
            <div style={emptyStateStyle}>No approved loans yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 20 }}>
              {loans.map((loan, index) => {
                const form = planForms[loan.id] || {
                  planType: "MONTHLY_EMI_3",
                  tenure: "12",
                };
                const preview = paymentPreview(loan);
                const canEditPlan = !loan.planConfigured || loan.paymentsMade === 0;

                return (
                  <motion.div
                    key={loan.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    style={loanCardStyle}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 13, color: "#777", marginBottom: 6 }}>Loan #{loan.id}</div>
                        <h5 style={{ margin: 0, fontWeight: 800, color: "#1f2937" }}>
                          {loan.planConfigured ? loan.repaymentPlanLabel : "Plan selection pending"}
                        </h5>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={badgeStyle(loan.status === "PAID" ? "#14532d" : "#7f1d1d", loan.status === "PAID" ? "#dcfce7" : "#fee2e2")}>
                          {loan.status}
                        </span>
                        <span style={badgeStyle("#5b46d7", "#ece7ff")}>
                          Salary Cap {currency(loan.salaryCap)}
                        </span>
                      </div>
                    </div>

                    <div style={statsGridStyle}>
                      <StatCard label="Principal" value={currency(loan.principal)} />
                      <StatCard label="Monthly Salary" value={currency(loan.monthlyIncome)} />
                      <StatCard label="Total Paid" value={currency(loan.totalPaid)} />
                      <StatCard label="Remaining Due" value={currency(loan.remainingBalance)} />
                    </div>

                    {loan.planConfigured && (
                      <div style={summaryGridStyle}>
                        <SummaryItem label="Interest Rate" value={`${(loan.interestRate * 100).toFixed(0)}%`} />
                        <SummaryItem
                          label="Tenure"
                          value={
                            loan.repaymentPlanType === "YEARLY_15"
                              ? `${loan.tenureYears} year(s)`
                              : loan.repaymentPlanType === "MONTHLY_EMI_3"
                              ? `${loan.tenureMonths} month(s)`
                              : "Flexible"
                          }
                        />
                        <SummaryItem label="Total Interest" value={currency(loan.totalInterest)} />
                        <SummaryItem label="Total Payable" value={currency(loan.totalPayable)} />
                        <SummaryItem label="Interest Remaining" value={currency(loan.interestRemaining)} />
                        <SummaryItem
                          label={loan.installmentLabel || "Suggested Payment"}
                          value={loan.installmentAmount == null ? "Pay any amount" : currency(loan.installmentAmount)}
                        />
                      </div>
                    )}

                    {canEditPlan && (
                      <div style={sectionStyle}>
                        <h6 style={sectionHeadingStyle}>Repayment Plan</h6>
                        <div style={{ display: "grid", gap: 12 }}>
                          <select
                            value={form.planType}
                            onChange={(e) => handlePlanFieldChange(loan.id, "planType", e.target.value)}
                            style={inputStyle}
                          >
                            {planOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <div style={{ color: "#666", fontSize: 13 }}>
                            {planOptions.find((option) => option.value === form.planType)?.help}
                          </div>

                          {form.planType !== "FLEXIBLE_10" && (
                            <input
                              type="number"
                              min="1"
                              value={form.tenure}
                              onChange={(e) => handlePlanFieldChange(loan.id, "tenure", e.target.value)}
                              placeholder={tenurePlaceholder(form.planType)}
                              style={inputStyle}
                            />
                          )}

                          <motion.button
                            type="button"
                            onClick={() => savePlan(loan)}
                            style={primaryButtonStyle}
                            disabled={busyKey === `plan-${loan.id}`}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {busyKey === `plan-${loan.id}` ? "Saving..." : loan.planConfigured ? "Update Plan" : "Save Plan"}
                          </motion.button>
                        </div>
                      </div>
                    )}

                    <div style={sectionStyle}>
                      <h6 style={sectionHeadingStyle}>Dynamic Repayment</h6>
                      {!loan.planConfigured ? (
                        <div style={{ color: "#8b5a00", background: "#fff8e1", borderRadius: 12, padding: 12 }}>
                          Select and save a repayment plan first. Once it is configured, the exact due amount and payment preview will appear here.
                        </div>
                      ) : (
                        <>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={paymentInputs[loan.id] || ""}
                            onChange={(e) => setPaymentInputs((prev) => ({ ...prev, [loan.id]: e.target.value }))}
                            placeholder="Enter repayment amount"
                            style={inputStyle}
                          />

                          {preview && (
                            <div style={previewBoxStyle}>
                              <div>Payment now: {currency(preview.amount)}</div>
                              <div>Interest covered: {currency(preview.interestPart)}</div>
                              <div>Principal covered: {currency(preview.principalPart)}</div>
                              <div>Remaining after payment: {currency(preview.remainingAfter)}</div>
                            </div>
                          )}

                          <motion.button
                            type="button"
                            onClick={() => makeRepayment(loan)}
                            style={primaryButtonStyle}
                            disabled={busyKey === `pay-${loan.id}` || loan.remainingBalance <= 0}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {busyKey === `pay-${loan.id}` ? "Processing..." : loan.remainingBalance <= 0 ? "Loan Closed" : "Repay Now"}
                          </motion.button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: 28 }}>
          <h5 style={{ fontWeight: 800, color: "#333", marginBottom: 14 }}>Repayment History</h5>
          {repayments.length === 0 ? (
            <div style={emptyStateStyle}>No loan activity recorded yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead style={{ background: "#ece7ff", color: "#2e2b41" }}>
                  <tr>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Loan ID</th>
                    <th style={thStyle}>Amount Paid</th>
                    <th style={thStyle}>Principal</th>
                    <th style={thStyle}>Interest</th>
                    <th style={thStyle}>Before</th>
                    <th style={thStyle}>After</th>
                    <th style={thStyle}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {repayments.map((repayment, index) => (
                    <motion.tr
                      key={repayment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.04 }}
                      style={{ background: index % 2 === 0 ? "#fff" : "#f8f6ff" }}
                    >
                      <td style={tdStyle}>{repayment.entryType === "PLAN_SETUP" ? "Plan Setup" : "Payment"}</td>
                      <td style={tdStyle}>{repayment.loanId}</td>
                      <td style={tdStyle}>{currency(repayment.amountPaid)}</td>
                      <td style={tdStyle}>{currency(repayment.principalComponent)}</td>
                      <td style={tdStyle}>{currency(repayment.interestComponent)}</td>
                      <td style={tdStyle}>{currency(repayment.balanceBeforePayment)}</td>
                      <td style={tdStyle}>{currency(repayment.remainingBalance)}</td>
                      <td style={tdStyle}>
                        {new Date(repayment.paymentDate).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

function StatCard({ label, value }) {
  return (
    <div style={statCardStyle}>
      <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ color: "#111827", fontWeight: 800, fontSize: 18 }}>{value}</div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 14, background: "#f8f6ff", border: "1px solid rgba(134, 114, 255, 0.18)" }}>
      <div style={{ color: "#7b7b7b", fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#202020", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const emptyStateStyle = {
  padding: "18px 16px",
  borderRadius: 14,
  background: "#f8f6ff",
  border: "1px solid rgba(134, 114, 255, 0.18)",
  color: "#5f5a78",
  textAlign: "center",
  fontWeight: 600,
};

const loanCardStyle = {
  padding: 22,
  borderRadius: 22,
  background: "linear-gradient(180deg, #ffffff 0%, #f7f5ff 100%)",
  border: "1px solid rgba(134, 114, 255, 0.16)",
  boxShadow: "0 10px 30px rgba(46, 43, 65, 0.08)",
};

const statsGridStyle = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
};

const statCardStyle = {
  padding: "14px 16px",
  borderRadius: 16,
  background: "#ffffff",
  border: "1px solid rgba(134, 114, 255, 0.14)",
};

const summaryGridStyle = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
};

const sectionStyle = {
  marginTop: 18,
  padding: 16,
  borderRadius: 18,
  background: "#ffffff",
  border: "1px solid rgba(134, 114, 255, 0.14)",
};

const sectionHeadingStyle = {
  margin: "0 0 12px 0",
  color: "#4b5563",
  fontWeight: 800,
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d8d8d8",
  fontSize: 14,
  outline: "none",
};

const primaryButtonStyle = {
  marginTop: 12,
  width: "100%",
  padding: "12px 0",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #8672ff, #6d57f5)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: 0.2,
  cursor: "pointer",
  boxShadow: "0 8px 16px rgba(134, 114, 255, 0.22)",
};

const previewBoxStyle = {
  marginTop: 12,
  padding: "12px 14px",
  borderRadius: 14,
  background: "#fff8e8",
  border: "1px solid #f1ddab",
  color: "#7c5f16",
  display: "grid",
  gap: 6,
  fontWeight: 600,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const thStyle = {
  padding: "12px 10px",
  textAlign: "left",
  fontWeight: 800,
};

const tdStyle = {
  padding: "12px 10px",
  borderBottom: "1px solid #f0e1e3",
};

const badgeStyle = (color, background) => ({
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  color,
  background,
});

export default LoanRepaymentPanel;
