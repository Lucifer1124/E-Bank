import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence } from "framer-motion";
import API from "../api";
import Sidebar from "../components/Sidebar";
import DashboardPanel from "../components/DashBoardPanel";
import TransferPanel from "../components/TransferPanel";
import TransactionsPanel from "../components/TransactionPanel";
import ChatbotPanel from "../components/ChatbotPanel";
import LoanPanel from "../components/LoanPanel";
import RightPanel from "../components/RightPanel";
import AddMoney from "../components/AddMoney";
import LoanRepaymentPanel from "../components/MyLoans";
import { formatCurrencyINR } from "../utils/format";
import "../UserPage.css";

const normalizePanValue = (value = "") =>
  value.replace(/\s+/g, "").toUpperCase().slice(0, 12);

const normalizeAdharValue = (value = "") =>
  value.replace(/\D/g, "").slice(0, 14);

export default function UserPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ username: "User", role: "" });
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [hasAccount, setHasAccount] = useState(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [balanceRaw, setBalanceRaw] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  const [formAdhar, setFormAdhar] = useState("");
  const [formPAN, setFormPAN] = useState("");
  const [formType, setFormType] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);

  const getKycCacheKey = (username) => (username ? `session-user-kyc:${username}` : null);

  const cacheSessionKyc = (username, accountData) => {
    const key = getKycCacheKey(username);
    if (!key || !accountData) return;
    sessionStorage.setItem(
      key,
      JSON.stringify({
        accountNumber: accountData.accountNumber ?? "",
        adhar: accountData.adhar ?? "",
        pan: accountData.pan ?? "",
        type: accountData.type ?? "",
        verified: Boolean(accountData.verified),
      })
    );
  };

  const clearSessionKyc = (username) => {
    const key = getKycCacheKey(username);
    if (key) sessionStorage.removeItem(key);
  };

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      const payload = jwtDecode(token);
      setUser({
        username: payload?.sub || payload?.username || "User",
        role: payload?.role || "",
      });
      checkAccountAndLoad(payload?.sub || payload?.username || "User");
    } catch (err) {
      console.error("Invalid token", err);
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, []);

  const balance = formatCurrencyINR(balanceRaw);

  async function checkAccountAndLoad(currentUsername = user.username) {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get("/user/me/account");
      const acct =
        typeof res.data === "string"
          ? res.data
          : res.data?.accountNumber ??
            res.data?.account_number ??
            res.data;
        
      if (acct) {
        if (res.data && typeof res.data === "object") {
          cacheSessionKyc(currentUsername, res.data);
        }
        setActive("dashboard");
        setHasAccount(true);
        setAccountNumber(String(acct));
        await fetchBalance();
        await fetchTransactions();
      } else {
        clearSessionKyc(currentUsername);
        setHasAccount(false);
        setActive("createAccount");
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        clearSessionKyc(currentUsername);
        setHasAccount(false);
        setActive("createAccount");
      } else {
        console.error("Failed to check account", err);
        setError("Failed to verify account status");
        setHasAccount(false);
        setActive("createAccount");
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchBalance() {
    setLoading(true);
    try {
      const res = await API.get("/user/balance");
      const text = res.data;
      const match = String(text).match(/₹\s?([0-9,.]+)/);
      if (match) setBalanceRaw(parseFloat(match[1].replace(/,/g, "")));
      else if (typeof res.data === "number") setBalanceRaw(res.data);
      else if (res.data?.balance !== undefined)
        setBalanceRaw(res.data.balance);
      else setBalanceRaw(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load balance");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTransactions() {
    setTxLoading(true);
    try {
      const res = await API.get("/user/transactions");
      setTransactions(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load transactions");
    } finally {
      setTxLoading(false);
    }
  }

  function logout() {
    clearSessionKyc(user.username);
    localStorage.removeItem("token");
    navigate("/login");
  }

  const createAccountSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formAdhar || !formPAN || !formType) {
      setError("Please fill all fields!");
      return;
    }

    if (normalizeAdharValue(formAdhar).length < 10 || normalizeAdharValue(formAdhar).length > 14) {
      setError("Aadhaar number must be between 10 and 14 digits.");
      return;
    }

    if (normalizePanValue(formPAN).length < 10 || normalizePanValue(formPAN).length > 12) {
      setError("PAN number must be between 10 and 12 characters.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    try {
      setCreatingAccount(true);
      API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      await API.post("/user/create-account", {
        username: user.username,
        adhar: normalizeAdharValue(formAdhar),
        pan: normalizePanValue(formPAN),
        type: formType,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setHasAccount(true);
        checkAccountAndLoad();
        setActive("dashboard");
      }, 1800);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        setError(err?.response?.data?.error || "Account creation failed");
      } else {
        setError(err?.response?.data?.error || "Account creation failed.");
      }
    } finally {
      setCreatingAccount(false);
    }
  };

  return (
    <div className="up-root">
      <Sidebar
        user={user}
        active={active}
        setActive={setActive}
        logout={logout}
        hasAccount={hasAccount}
      />
      <main className="up-main">
        <div className="up-grid">
          <div className="up-left">
            {active === "createAccount" && !hasAccount && (
              <motion.div
                className="panel create-account"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800 }}>Create bank account</div>
                    <div className="hint">
                      You need a bank account to use transfers, view balance and
                      transactions.
                    </div>
                  </div>
                  <div className="small-muted">Account creation</div>
                </div>

                <form onSubmit={createAccountSubmit} style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      className="input"
                      placeholder="Aadhaar number (10-14 digits)"
                      value={formAdhar}
                      onChange={(e) => setFormAdhar(normalizeAdharValue(e.target.value))}
                    />
                    <input
                      className="input"
                      placeholder="PAN number (10-12 chars)"
                      value={formPAN}
                      onChange={(e) => setFormPAN(normalizePanValue(e.target.value))}
                    />
                    <select
                      className="input"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                    >
                      <option value="">Select account type</option>
                      <option value="SAVINGS">SAVINGS</option>
                      <option value="SALARY">SALARY</option>
                      <option value="CURRENT">CURRENT</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="primary mt-3"
                    disabled={creatingAccount}
                  >
                    {creatingAccount ? "Creating..." : "Create Account"}
                  </button>
                </form>

                <div style={{ marginTop: 18 }}>
                  {error && (
                    <div
                      style={{
                        marginBottom: 12,
                        color: "#9f1d1d",
                        background: "#fff1f1",
                        border: "1px solid #f3b4b4",
                        padding: 12,
                        borderRadius: 8,
                      }}
                    >
                      {error}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Properly Centered Success Popup */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  className="popup-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(0,0,0,0.35)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 3000,
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      background: "#fff",
                      color: "#111",
                      padding: "28px 42px",
                      borderRadius: "16px",
                      boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
                      textAlign: "center",
                      fontWeight: "600",
                      letterSpacing: "0.5px",
                      backdropFilter: "blur(8px)",
                      border: "2px solid rgba(134, 114, 255, 0.2)",
                    }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 15,
                      }}
                      style={{
                        fontSize: "30px",
                        color: "#22c55e",
                        marginBottom: "10px",
                      }}
                    >
                      Success
                    </motion.div>
                    Account created successfully!
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {active === "dashboard" && hasAccount && (
              <DashboardPanel
                active={active}
                setActive={setActive}
                onAddMoneySuccess={() => {
                  fetchBalance();
                  fetchTransactions();
                  setActive("dashboard");
                }}
              />
            )}

            {active === "transfer" && hasAccount && (
              <TransferPanel
                senderAccount={accountNumber}
                onComplete={() => {
                  fetchBalance();
                  fetchTransactions();
                  setActive("tx");
                }}
              />
            )}

            {active === "tx" && hasAccount && (
              <TransactionsPanel
                transactions={transactions}
                loading={txLoading}
                onReload={fetchTransactions}
              />
            )}

            {active === "addMoney" && hasAccount && (
              <AddMoney
                onSuccess={() => {
                  fetchBalance();
                  fetchTransactions();
                  setActive("dashboard");
                }}
              />
            )}

            {active === "chatbot" && hasAccount && <ChatbotPanel />}

            {active === "loan" && hasAccount && (
              <LoanPanel
                onLoanApplied={() => {
                  fetchBalance();
                  fetchTransactions();
                }}
              />
            )}

            {active === "myloan" && hasAccount && <LoanRepaymentPanel />}
          </div>

          {hasAccount === true && (
            <RightPanel
              balance={balance}
              accountNumber={accountNumber}
              onSendClick={() => setActive("transfer")}
            />
          )}
        </div>
      </main>
    </div>
  );
}
