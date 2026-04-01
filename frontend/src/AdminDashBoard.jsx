
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "./api";
import { jwtDecode } from "jwt-decode";
import "./AdminDashboard.css";
import AdminRepaymentTable
 from "./pages/AdminRepaymentTable";
 import { motion } from "framer-motion";



const PAGE_SIZE = 12;

export default function AdminDashboard() {
  const navigate = useNavigate();

  // UI & state
  const [view, setView] = useState("home"); // home | transactions | users | editUser | accounts
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // data
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [editForm, setEditForm] = useState(null);

  // search / filters / pages
  const [searchId, setSearchId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [transQuery, setTransQuery] = useState("");
  const [transPage, setTransPage] = useState(1);
  const [accQuery, setAccQuery] = useState("");
  const [accPage, setAccPage] = useState(1);

// loans (admin)
const [loans, setLoans] = useState([]);
const [loanLoading, setLoanLoading] = useState(false);
const [loanQuery, setLoanQuery] = useState(""); // filter/search text
const [loanPage, setLoanPage] = useState(1);
const [popup, setPopup] = useState(null);

const [active, setActive] = useState('overview');


  // load admin identity, redirect if no token
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      const payload = jwtDecode(token);
     
      const role = (payload.role || payload?.roles || "").toString().toUpperCase();
      if (!role.includes("ADMIN")) {
        navigate("/user");
      }
    } catch (e) {
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate]);


  // alerts
   const showPopup = (type, message) => {
    setPopup({ type, message });
    setTimeout(() => setPopup(null), 2000);
  };
  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 2000);
  };

  // logout
  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // helpers
  const isFraudFlag = (t) => {
    return t?.is_fraud === 1 || t?.is_fraud === true || t?.isFraud === 1 || t?.fraud === true;
  };

  
  const scalarize = (v) => {
    if (v == null) return "";
    if (Array.isArray(v)) return v.join("-");
    if (typeof v === "object") {
      // prefer common id fields
      if ("id" in v && (typeof v.id === "string" || typeof v.id === "number")) return String(v.id);
      if ("userId" in v && (typeof v.userId === "string" || typeof v.userId === "number")) return String(v.userId);
      if ("user_id" in v && (typeof v.user_id === "string" || typeof v.user_id === "number")) return String(v.user_id);
      if ("accountId" in v && (typeof v.accountId === "string" || typeof v.accountId === "number")) return String(v.accountId);
      // fallback to flat useful primitives inside object
      const primitive = Object.values(v).find((x) => typeof x === "string" || typeof x === "number");
      if (primitive !== undefined) return String(primitive);
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    }
    return String(v);
  };

  const maskValue = (k, v) => {
    if (k === "password") return "••••••••";
    return scalarize(v);
  };

  
  // Transactions
 
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await API.get("/transactions/check");
      setTransactions(res.data || []);
      setView("transactions");
      showAlert("success", "Transactions loaded");
    } catch (err) {
      console.error(err);
      showAlert("danger", "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  // export CSV
  const exportTransactionsCSV = () => {
    if (!transactions || transactions.length === 0) {
      showAlert("info", "No transactions to export");
      return;
    }
    const rows = transactions.map((t) => {
      const copy = { ...t };
      delete copy.password;
      return copy;
    });
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(",")]
      .concat(rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0, 19)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showAlert("success", "CSV exported");
  };

  
  // Users
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/users");
      setUsers(res.data || []);
      setView("users");
      showAlert("success", "Users loaded");
    } catch (err) {
      console.error(err);
      showAlert("danger", "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

 
  const resolveId = (maybe) => {
    if (maybe == null) return null;
    if (typeof maybe === "number" || typeof maybe === "string") return String(maybe);
    if (typeof maybe === "object") {
      if ("id" in maybe) return String(maybe.id);
      if ("userId" in maybe) return String(maybe.userId);
      if ("user_id" in maybe) return String(maybe.user_id);
    }
    return String(maybe);
  };

  // search single user and balance
  const searchUser = async (idOverride) => {
    const raw = idOverride ?? searchId;
    const id = resolveId(raw);
    if (!id) {
      showAlert("danger", "Enter a user ID");
      return;
    }
    setLoading(true);
    try {
      const userRes = await API.get(`/admin/user/${id}`);
      const user = userRes.data;
      let balance = null;

      // Try to fetch from balance endpoint first (ensures latest)
      try {
        const balRes = await API.get(`/admin/balance/${id}`);
        const bData = balRes.data;
        if (typeof bData === "number") balance = bData;
        else if (bData && typeof bData === "object" && ("balance" in bData || "amount" in bData)) balance = bData.balance ?? bData.amount ?? null;
        else balance = bData;
      } catch (err) {
        // fallback to user.balance returned by user endpoint
        balance = user.balance ?? null;
      }

      const merged = {
        id: user.id ?? user.userId ?? user.user_id ?? user.accountId ?? "",
        username: user.username ?? "",
        email: user.email ?? "",
        mobile: user.mobile ?? "",
        role: user.role ?? "",
        balance: typeof balance === "number" ? balance : user.balance ?? "",
        ...user,
      };

      // Ensure balance is string/number suitable for input field
      merged.balance = merged.balance === null || merged.balance === undefined ? "" : merged.balance;

      setEditForm(merged);
      setView("editUser");
      showAlert("success", "User loaded");
    } catch (err) {
      console.error(err);
      setEditForm(null);
      showAlert("danger", "User not found");
    } finally {
      setLoading(false);
    }
  };

  // save user details
  const saveUserDetails = async () => {
    if (!editForm || !editForm.id) return;
    setLoading(true);
    try {
      const payload = { username: editForm.username, email: editForm.email, mobile: editForm.mobile, role: editForm.role };
      await API.put(`/admin/user/${resolveId(editForm.id)}`, payload);
      showAlert("success", "User details updated");

      // refresh user data (ensures any server-side balance change is reflected)
      await searchUser(editForm.id);
      // also refresh users list if currently viewing users
      if (view === "users") await fetchUsers();
    } catch (err) {
      console.error(err);
      showAlert("danger", "Failed to update user details");
    } finally {
      setLoading(false);
    }
  };

  // save balance
  const saveBalance = async () => {
    if (!editForm || !editForm.id) return;
    const parsed = parseFloat(String(editForm.balance));
    if (Number.isNaN(parsed)) {
      showAlert("danger", "Enter a valid balance");
      return;
    }
    setLoading(true);
    try {
      await API.patch("/admin/balance/", { userId: resolveId(editForm.id), amount: parsed });
      showAlert("success", "Balance updated");
      // re-fetch the user to show updated balance
      await searchUser(editForm.id);
      // refresh users and accounts lists if open
      if (view === "users") await fetchUsers();
      if (view === "accounts") await fetchAccounts();
    } catch (err) {
      console.error(err);
      showAlert("danger", "Failed to update balance");
    } finally {
      setLoading(false);
    }
  };

  // delete user
  const deleteUser = async (id) => {
    const resolved = resolveId(id);
    if (!resolved) return;
    if (!window.confirm(`Delete user with ID ${resolved}? This is irreversible.`)) return;
    setLoading(true);
    try {
      await API.delete(`admin/user/${resolved}`);
      showAlert("success", "User deleted");
      setEditForm(null);
      setSearchId("");
      await fetchUsers();
    } catch (err) {
      console.error(err);
      showAlert("danger", "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

 
  // Accounts 
  
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/accounts");
      setAccounts(res.data || []);
      setView("accounts");
      showAlert("success", "Accounts loaded");
    } catch (err) {
      console.error(err);
      showAlert("danger", "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const searchAccountByUserId = async (idOverride) => {
    const raw = idOverride ?? searchId;
    const id = resolveId(raw);
    if (!id) {
      showAlert("danger", "Enter a user ID for account search");
      return;
    }
    setLoading(true);
    try {
      const res = await API.get(`/admin/accounts/${id}`);
      const account = res.data;
      setAccounts([account]);
      setView("accounts");
      showAlert("success", "Account found");
    } catch (err) {
      console.error(err);
      showAlert("danger", "Account not found for that user ID");
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (id) => {
    const resolved = resolveId(id);
    if (!resolved) return;
    if (!window.confirm(`Delete bank account with ID ${resolved}? This is irreversible.`)) return;
    setLoading(true);
    try {
      await API.delete(`/admin/accounts/${resolved}`);
      showAlert("success", "Bank account deleted");
      await fetchAccounts();
    } catch (err) {
      console.error(err);
      showAlert("danger", "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockAccount = async (userId) => {
    const resolvedUserId = resolveId(userId);
    if (!resolvedUserId) return;
    setLoading(true);
    try {
      const res = await API.patch(`/admin/block/${resolvedUserId}`);
      showAlert("success", res.data || "Toggled block state");
      await fetchAccounts();
    } catch (err) {
      console.error(err);
      showAlert("danger", "Failed to toggle block state");
    } finally {
      setLoading(false);
    }
  };
  
// Loans (admin) - fetch pending & approve

const fetchPendingLoans = async () => {
  setLoanLoading(true);
  try {
    
    const res = await API.get("/loan/pending");
    setLoans(res.data || []);
    setView("loans");
    showAlert("success", "Pending loans loaded");
  } catch (err) {
    console.error(err);
    showAlert("danger", "Failed to load pending loans");
  } finally {
    setLoanLoading(false);
  }
};

const approveLoan = async (loanId) => {
  if (!window.confirm(`Approve loan #${loanId}? This will credit the user's account.`)) return;
  setLoanLoading(true);
  try {
  
    const res = await API.post(`/loan/approve/${loanId}`);
    showAlert("success", `Approved loan #${loanId}`);
    // refresh list
    await fetchPendingLoans();
  } catch (err) {
    console.error(err);
    showAlert("danger", `Failed to approve loan #${loanId}`);
  } finally {
    setLoanLoading(false);
  }
};



  // Derived lists & pagination
 
  const filteredUsers = useMemo(() => {
    if (!userQuery) return users;
    const q = userQuery.toLowerCase();
    return users.filter((u) => Object.entries(u).some(([k, v]) => k !== "password" && scalarize(v).toLowerCase().includes(q)));
  }, [users, userQuery]);

  const pagedUsers = useMemo(() => {
    const start = (userPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, userPage]);

  const filteredTrans = useMemo(() => {
    if (!transQuery) return transactions;
    const q = transQuery.toLowerCase();
    return transactions.filter((t) => Object.entries(t).some(([k, v]) => k !== "password" && scalarize(v).toLowerCase().includes(q)));
  }, [transactions, transQuery]);

  const pagedTrans = useMemo(() => {
    const start = (transPage - 1) * PAGE_SIZE;
    return filteredTrans.slice(start, start + PAGE_SIZE);
  }, [filteredTrans, transPage]);

  const filteredAccounts = useMemo(() => {
    if (!accQuery) return accounts;
    const q = accQuery.toLowerCase();
    return accounts.filter((a) => Object.entries(a).some(([k, v]) => scalarize(v).toLowerCase().includes(q)));
  }, [accounts, accQuery]);

  const pagedAccounts = useMemo(() => {
    const start = (accPage - 1) * PAGE_SIZE;
    return filteredAccounts.slice(start, start + PAGE_SIZE);
  }, [filteredAccounts, accPage]);

 
  // Render helpers
 
  const renderTableHeader = (obj, extra) => {
    if (!obj) return null;
    return (
      <tr>
        {Object.keys(obj)
          .filter((k) => k !== "password")
          .map((k) => (
            <th key={k} className="text-capitalize">
              {k}
            </th>
          ))}
        {extra && <th>Actions</th>}
      </tr>
    );
  };

  const renderTransactionRow = (t, i) => {
    const fraud = isFraudFlag(t);
    return (
      <tr key={i} className={fraud ? "fraud-row" : "row-regular"}>
        {Object.entries(t)
          .filter(([k]) => k !== "password")
          .map(([k, v]) => {
            if (k === "is_fraud" || k === "isFraud") {
              return (
                <td key={k}>
                  {fraud ? (
                    <span className="badge-fraud">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
                        <path d="M8 1.333L15 13H1L8 1.333z" fill="#ff7b7b" />
                      </svg>
                      Fraud
                    </span>
                  ) : (
                    <span className="badge-safe">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
                        <path d="M8 1.333L15 13H1L8 1.333z" fill="#9af893ff" />
                      </svg>
                      Safe</span>
                  )}
                </td>
              );
            }
            const display = scalarize(v);
            return <td key={k}>{display}</td>;
          })}
      </tr>
    );
  };

  const renderUserRow = (u, i) => {
    return (
      <tr key={i} className="row-regular">
        {Object.entries(u)
          .filter(([k]) => k !== "password")
          .map(([k, v]) => {
            if (k === "balance") {
              return (
                <td key={k}>
                  <strong>₹ {Number(v ?? 0).toLocaleString()}</strong>
                </td>
              );
            }
            return <td key={k}>{maskValue(k, v)}</td>;
          })}
        <td>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-primary-lg"
              onClick={() => {
                // ensure latest when opening; resolve id if nested
                searchUser(u.id ?? u.userId ?? u.user_id ?? u);
              }}
              title="Edit user"
            >
              Edit
            </button>
            <button
              className="btn-ghost"
              onClick={() => deleteUser(u.id ?? u.userId ?? u.user_id ?? u)}
              title="Delete user"
              style={{ borderColor: "rgba(255,90,90,0.12)", color: "#ff9a9a" }}
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderAccountRow = (a, i) => {
    return (
      <tr key={i} className="row-regular">
        {Object.entries(a)
          .filter(([k]) => k !== "password")
          .map(([k, v]) => {
            if (k === "blocked" || k === "isBlocked") {
              return <td key={k}>{v ? <span className="badge-fraud">Blocked</span> : <span className="badge-safe">Active</span>}</td>;
            }
            return <td key={k}>{scalarize(v)}</td>;
          })}
        <td>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-classic" onClick={() => toggleBlockAccount(a.userId ?? a.id ?? a.user_id)}>
              Toggle Block
            </button>
            <button
              className="btn-ghost"
              onClick={() => deleteAccount(a.id ?? a.accountId ?? a.userId)}
              style={{ borderColor: "rgba(255,90,90,0.12)", color: "#ff9a9a" }}
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
    );
  };
  const renderLoanRow = (loan, i) => {
  // loan model: { id, username, amount, approved }
  const loanId = loan.id ?? loan.loanId ?? i;
  const approved = loan.approved === true || loan.approved === "true";
  return (
    <tr key={i} className={approved ? "row-approved" : "row-regular"}>
      <td>{loan.id ?? "-"}</td>
      <td>{loan.username ?? loan.username ?? "—"}</td>
      <td>₹ {Number(loan.amount ?? 0).toLocaleString()}</td>
      <td>{approved ? <span className="badge-safe">Approved</span> : <span className="badge-fraud">Pending</span>}</td>
      <td>
        <div style={{ display: "flex", gap: 8 }}>
          {!approved && (
            <button className="btn-primary-lg" onClick={() => approveLoan(loanId)}>
              Approve
            </button>
          )}
          <button
            className="btn-ghost"
            onClick={() => {
              
              if (loan.username) searchUser(loan.username);
              else showAlert("info", "No username available for details");
            }}
          >
            View user
          </button>
        </div>
      </td>
    </tr>
  );
};


  // handlers for edit form updates
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((p) => ({ ...p, [name]: value }));
  };

  // reset pages when queries change
  useEffect(() => {
    setUserPage(1);
    setTransPage(1);
    setAccPage(1);
  }, [userQuery, transQuery, accQuery]);

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#0f2430", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 800 }}>
            A
          </div>
          <div>
            <div className="brand-title">Bank Admin Console</div>
            <div className="brand-sub">Operations & Fraud Monitoring</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn-classic" onClick={fetchTransactions}>
            Transactions
          </button>
          <button className="btn-ghost" onClick={fetchUsers}>
            Users
          </button>
          <button className="btn-ghost" onClick={fetchAccounts}>
            Accounts
          </button>
          <button className="btn-ghost" onClick={() => setView("editUser")}>
            Edit User
          </button>
          <button className="btn-ghost" onClick={logout} style={{ borderColor: "rgba(255,90,90,0.12)", color: "#ff9a9a" }}>
            Logout
          </button>
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar admin-card">
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <div className="avatar">AD</div>
            <div>
              <div style={{ fontWeight: 800 }}>Administrator</div>
              <div className="small-muted">Manage users · Monitor fraud</div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <button className={`nav-btn ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>
              Home
            </button>
            <button className={`nav-btn ${view === "transactions" ? "active" : ""}`} onClick={fetchTransactions}>
              Transactions
            </button>
            <button className={`nav-btn ${view === "loans" ? "active" : ""}`} onClick={fetchPendingLoans}>
               Loans Applications
            </button>
              <button
  className={`nav-btn ${view === "admin-repayments" ? "active" : ""}`}
  onClick={() => setView("admin-repayments")}
>
  View Repayments
</button>

            <button className={`nav-btn ${view === "users" ? "active" : ""}`} onClick={fetchUsers}>
              Users
            </button>
            <button className={`nav-btn ${view === "accounts" ? "active" : ""}`} onClick={fetchAccounts}>
              Accounts
            </button>
            <button className={`nav-btn ${view === "editUser" ? "active" : ""}`} onClick={() => setView("editUser")}>
              Edit User
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ marginBottom: 8 }} className="small-muted">
              Quick actions
            </div>
            <button className="btn-primary-lg" onClick={fetchTransactions} disabled={loading}>
              Check All Transactions
            </button>
            <div style={{ height: 10 }} />
            <button className="btn-ghost" onClick={fetchUsers} disabled={loading}>
              View All Users
            </button>

            <div style={{ marginTop: 12 }}>
              <div className="small-muted">Search by user ID</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input className="form-control" placeholder="User ID" value={searchId} onChange={(e) => setSearchId(String(e.target.value))} type="text" />
                <button className="btn-classic" onClick={() => searchUser()}>
                  Search
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn-ghost" onClick={() => searchAccountByUserId()}>
                  Find Account by User ID
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }} className="small-muted">
              Tip: Fraudulent rows are highlighted in red for quick identification.
            </div>
          </div>
        </aside>

        <main className="content">
          {alert && <div className={`alert alert-${alert.type === "success" ? "success" : "danger"}`}>{alert.message}</div>}
          {loading && (
            <div className="admin-card">
              <div className="small-muted">Loading...</div>
            </div>
          )}

       {!loading && view === "home" && (
  <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="admin-card data-card"
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "720px",
          padding: "70px 60px",
          borderRadius: "2rem",
          background:
            "radial-gradient(circle at top left, #fff6f6, #ffffff 40%, #ffe5e5)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
        }}
      >
        {/*Soft Floating Background Icons */}
        {[
          {
            src: "https://www.svgrepo.com/show/331489/bank.svg",
            top: 50,
            right: 70,
            width: 110,
            opacity: 0.08,
          },
          {
            src: "https://www.svgrepo.com/show/353000/coins.svg",
            bottom: 60,
            left: 50,
            width: 130,
            opacity: 0.06,
          },
          {
            src: "https://www.svgrepo.com/show/331493/analytics.svg",
            top: 180,
            left: 260,
            width: 90,
            opacity: 0.05,
          },
          {
            src: "https://www.svgrepo.com/show/331488/safe.svg",
            bottom: 100,
            right: 140,
            width: 100,
            opacity: 0.07,
          },
        ].map((icon, i) => (
          <motion.img
            key={i}
            src={icon.src}
            alt="icon"
            animate={{
              y: [0, -10, 0],
              rotate: [0, 3, 0],
            }}
            transition={{
              duration: 6 + i * 1.5,
              repeat: Infinity,
              repeatType: "mirror",
            }}
            style={{
              position: "absolute",
              ...icon,
              zIndex: 0,
              filter: "drop-shadow(0 0 8px rgba(255,0,0,0.05))",
            }}
          />
        ))}

        {/*Floating Red Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -10, 0],
              opacity: [0.05, 0.1, 0.05],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
            style={{
              position: "absolute",
              width: Math.random() * 5 + 3,
              height: Math.random() * 5 + 3,
              borderRadius: "50%",
              background: "#ff0000",
              top: Math.random() * 700,
              left: Math.random() * 900,
              zIndex: 0,
              opacity: 0.05,
            }}
          />
        ))}

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{ position: "relative", zIndex: 2 }}
        >
          {/* Greeting */}
          <h1
            style={{
              fontSize: "2.9rem",
              fontWeight: 900,
              color: "#b30000",
              marginBottom: 10,
              textShadow: "0 2px 4px rgba(0,0,0,0.08)",
            }}
          >
            Welcome Back, Admin !!
          </h1>
          <p
            style={{
              fontSize: "1.15rem",
              color: "#333",
              maxWidth: 720,
              lineHeight: "1.8",
              marginBottom: 50,
            }}
          >
            Oversee all user operations, transactions, and security activities in
            one intuitive panel. Maintain compliance, detect fraud, and ensure
            the platform’s stability with ease.
          </p>

          {/* Fraud Watch Spotlight */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 120 }}
            style={{
              background:
                "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(10px)",
              padding: "35px 30px",
              borderRadius: "1.2rem",
              border: "1px solid rgba(255,0,0,0.15)",
              boxShadow: "0 10px 30px rgba(255,0,0,0.05)",
              maxWidth: 850,
              marginBottom: 40,
            }}
          >
            <h3
              style={{
                marginBottom: 16,
                color: "#c00000",
                fontWeight: 700,
                fontSize: "1.3rem",
              }}
            >
               Fraud Watch Spotlight
            </h3>
            <ul
              style={{
                paddingLeft: 24,
                color: "#333",
                fontSize: 15,
                lineHeight: "1.9",
              }}
            >
              <li>Real-time flagging for suspicious transactions.</li>
              <li>AI-based anomaly detection for repayment behavior.</li>
              <li>Audit exports for high-risk user activity.</li>
              <li>System alerts integrated with admin notifications.</li>
            </ul>
          </motion.div>

          {/*  Admin Pro Tips */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 120 }}
            style={{
              background: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(8px)",
              padding: "30px",
              borderRadius: "1rem",
              border: "1px solid rgba(255,0,0,0.1)",
              maxWidth: 700,
              boxShadow: "0 5px 25px rgba(0,0,0,0.05)",
            }}
          >
            <h4
              style={{
                marginBottom: 12,
                color: "#b30000",
                fontWeight: 700,
                fontSize: "1.15rem",
              }}
            >
               Pro Tips
            </h4>
            <ul
              style={{
                paddingLeft: 22,
                fontSize: 14.5,
                color: "#555",
                lineHeight: "1.7",
              }}
            >
              <li>Use filters to isolate patterns by user or amount range.</li>
              <li>Schedule periodic exports for audit readiness.</li>
              <li>Focus on flagged repayments each Friday.</li>
              <li>Stay updated — predictive fraud detection coming soon.</li>
            </ul>
          </motion.div>

          {/*  Footer Quote */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 1.2 }}
            style={{
              marginTop: 70,
              textAlign: "center",
              color: "#777",
              fontSize: 14,
              fontStyle: "italic",
            }}
          >
            “Precision. Vigilance. Integrity.” — Empowering secure digital finance.
          </motion.div>
        </motion.div>
      </motion.div>
)}


          {!loading && view === "transactions" && (
            <div className="admin-card data-card" style={{width:1200}}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12,  }}>
                <div>
                  <h5 style={{ margin: 0 }}>All Transactions</h5>
                  <div className="small-muted">{filteredTrans.length} total</div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input className="form-control" placeholder="Filter..." value={transQuery} onChange={(e) => setTransQuery(e.target.value)} />
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setTransQuery("");
                      setTransPage(1);
                    }}
                  >
                    Clear
                  </button>
                  <button className="btn-ghost" onClick={exportTransactionsCSV}>
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                {transactions.length === 0 ? (
                  <div className="small-muted">No transactions.</div>
                ) : (
                  <>
                    <table className="admin-table">
                      <thead>{renderTableHeader(transactions[0])}</thead>
                      <tbody>{pagedTrans.map((t, i) => renderTransactionRow(t, i))}</tbody>
                    </table>

                    <div className="table-footer">
                      <div className="small-muted">
                        Showing {(transPage - 1) * PAGE_SIZE + 1} - {Math.min(transPage * PAGE_SIZE, filteredTrans.length)} of {filteredTrans.length}
                      </div>
                      <div className="pagination-controls">
                        <button className="btn-pager" onClick={() => setTransPage((p) => Math.max(1, p - 1))}>
                          Prev
                        </button>
                        <div className="small-muted">Page {transPage}</div>
                        <button className="btn-pager" onClick={() => setTransPage((p) => (p * PAGE_SIZE < filteredTrans.length ? p + 1 : p))}>
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {!loading && view === "loans" && (
              <div className="admin-card data-card" style={{ position: "relative" }}>
      {/* Popup identical to signup page */}
      {popup && (
        <div
          className={`popup ${popup.type}`}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) scale(1)",
            background:
              popup.type === "success"
                ? "linear-gradient(135deg, #4caf50, #66bb6a)"
                : "linear-gradient(135deg, #e53935, #ef5350)",
            color: "#fff",
            padding: "20px 40px",
            borderRadius: "16px",
            fontWeight: "600",
            boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
            textAlign: "center",
            animation: "popIn 0.3s ease, fadeOut 0.4s ease 1.6s forwards",
            zIndex: 99,
          }}
        >
          {popup.message}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <h5 style={{ margin: 0 }}>Loan Applications (Pending)</h5>
          <div className="small-muted">{loans.length} total</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="form-control"
            placeholder="Filter loans..."
            value={loanQuery}
            onChange={(e) => {
              setLoanQuery(e.target.value);
              setLoanPage(1);
            }}
          />
          <button
            className="btn-ghost"
            onClick={() => {
              setLoanQuery("");
              setLoanPage(1);
            }}
          >
            Clear
          </button>
          <button className="btn-ghost" onClick={fetchPendingLoans}>
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        {loans.length === 0 ? (
          <div className="small-muted">No pending loans.</div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans
                  .filter((l) => {
                    if (!loanQuery) return true;
                    const q = loanQuery.toLowerCase();
                    return (
                      String(l.id).includes(q) ||
                      String(l.username ?? "")
                        .toLowerCase()
                        .includes(q) ||
                      String(l.amount ?? "").includes(q)
                    );
                  })
                  .slice((loanPage - 1) * PAGE_SIZE, loanPage * PAGE_SIZE)
                  .map(renderLoanRow)}
              </tbody>
            </table>

            <div className="table-footer">
              <div className="small-muted">
                Showing {(loanPage - 1) * PAGE_SIZE + 1} -{" "}
                {Math.min(loanPage * PAGE_SIZE, loans.length)} of {loans.length}
              </div>
              <div className="pagination-controls">
                <button
                  className="btn-pager"
                  onClick={() => setLoanPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <div className="small-muted">Page {loanPage}</div>
                <button
                  className="btn-pager"
                  onClick={() =>
                    setLoanPage((p) =>
                      p * PAGE_SIZE < loans.length ? p + 1 : p
                    )
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Animations same as signup popup */}
      <style>{`
        @keyframes popIn {
          from {
            transform: translate(-50%, -60%) scale(0.9);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to { opacity: 0; transform: translate(-50%, -40%) scale(0.95); }
        }
      `}</style>
    </div>
)}

   {!loading && view === "admin-repayments" && (<AdminRepaymentTable />)}

          {!loading && view === "users" && (
            <div className="admin-card data-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h5 style={{ margin: 0 }}>All Users</h5>
                  <div className="small-muted">{users.length} total</div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input className="form-control" placeholder="Search users..." value={userQuery} onChange={(e) => setUserQuery(e.target.value)} />
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setUserQuery("");
                      setUserPage(1);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                {users.length === 0 ? (
                  <div className="small-muted">No users.</div>
                ) : (
                  <>
                    <table className="admin-table">
                      <thead>{renderTableHeader(users[0], true)}</thead>
                      <tbody>{pagedUsers.map((u, i) => renderUserRow(u, i))}</tbody>
                    </table>

                    <div className="table-footer">
                      <div className="small-muted">
                        Showing {(userPage - 1) * PAGE_SIZE + 1} - {Math.min(userPage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length}
                      </div>
                      <div className="pagination-controls">
                        <button className="btn-pager" onClick={() => setUserPage((p) => Math.max(1, p - 1))}>
                          Prev
                        </button>
                        <div className="small-muted">Page {userPage}</div>
                        <button className="btn-pager" onClick={() => setUserPage((p) => (p * PAGE_SIZE < filteredUsers.length ? p + 1 : p))}>
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {!loading && view === "accounts" && (
            <div className="admin-card data-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h5 style={{ margin: 0 }}>Bank Accounts</h5>
                  <div className="small-muted">{filteredAccounts.length} total</div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input className="form-control" placeholder="Filter accounts..." value={accQuery} onChange={(e) => setAccQuery(e.target.value)} />
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setAccQuery("");
                      setAccPage(1);
                    }}
                  >
                    Clear
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      // re-fetch full list
                      fetchAccounts();
                    }}
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                {accounts.length === 0 ? (
                  <div className="small-muted">No accounts.</div>
                ) : (
                  <>
                    <table className="admin-table">
                      <thead>{renderTableHeader(accounts[0], true)}</thead>
                      <tbody>{pagedAccounts.map((a, i) => renderAccountRow(a, i))}</tbody>
                    </table>

                    <div className="table-footer">
                      <div className="small-muted">
                        Showing {(accPage - 1) * PAGE_SIZE + 1} - {Math.min(accPage * PAGE_SIZE, filteredAccounts.length)} of {filteredAccounts.length}
                      </div>
                      <div className="pagination-controls">
                        <button className="btn-pager" onClick={() => setAccPage((p) => Math.max(1, p - 1))}>
                          Prev
                        </button>
                        <div className="small-muted">Page {accPage}</div>
                        <button className="btn-pager" onClick={() => setAccPage((p) => (p * PAGE_SIZE < filteredAccounts.length ? p + 1 : p))}>
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {!loading && view === "editUser" && (
            <div className="admin-card data-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h5 style={{ margin: 0 }}>Edit User</h5>
                  <div className="small-muted">Load a user and update details or balance</div>
                </div>
                <div className="small-muted">ID: {scalarize(editForm?.id ?? editForm?.userId ?? editForm?.user_id ?? "") || "—"}</div>
              </div>

              <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                <input className="form-control" placeholder="Enter user id and click Search" value={searchId} onChange={(e) => setSearchId(String(e.target.value))} type="text" />
                <button className="btn-classic" onClick={() => searchUser()}>
                  Search
                </button>
              </div>

              {!editForm && <div className="small-muted">Search a user to edit details and balance.</div>}

              {editForm && (
                <>
                  <div style={{ overflow: "auto", borderRadius: 8 }}>
                    <table className="admin-table" style={{ width: "100%" }}>
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 220 }}>Field</th>
                          <th>Value (editable)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th className="small-muted">ID</th>
                          <td>{scalarize(editForm.id ?? editForm.userId ?? editForm.user_id ?? editForm.accountId)}</td>
                        </tr>
                        <tr>
                          <th className="small-muted">Username</th>
                          <td>
                            <input name="username" value={editForm.username ?? ""} onChange={handleEditChange} className="form-control" />
                          </td>
                        </tr>
                        <tr>
                          <th className="small-muted">Email</th>
                          <td>
                            <input name="email" type="email" value={editForm.email ?? ""} onChange={handleEditChange} className="form-control" />
                          </td>
                        </tr>
                        <tr>
                          <th className="small-muted">Mobile</th>
                          <td>
                            <input name="mobile" value={editForm.mobile ?? ""} onChange={handleEditChange} className="form-control" />
                          </td>
                        </tr>
                        <tr>
                          <th className="small-muted">Role</th>
                          <td>
                            <input name="role" value={editForm.role ?? ""} onChange={handleEditChange} className="form-control" />
                          </td>
                        </tr>
                        <tr>
                          <th className="small-muted">Balance (INR)</th>
                          <td>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input name="balance" value={editForm.balance ?? ""} onChange={handleEditChange} className="form-control" type="number" step="0.01" />
                              <button className="btn-classic" onClick={saveBalance}>
                                Save Balance
                              </button>
                              <button
                                className="btn-ghost"
                                onClick={async () => {
                                  // explicit refresh balance only
                                  if (editForm?.id) {
                                    setLoading(true);
                                    try {
                                      await searchUser(editForm.id);
                                      showAlert("success", "Balance refreshed");
                                    } catch {
                                      showAlert("danger", "Failed to refresh balance");
                                    } finally {
                                      setLoading(false);
                                    }
                                  }
                                }}
                              >
                                Refresh
                              </button>
                            </div>
                            <div className="small-muted" style={{ marginTop: 6 }}>
                              Balance updated via the balance endpoint
                            </div>
                          </td>
                        </tr>

                        {Object.entries(editForm)
                          .filter(([k]) => !["id", "username", "email", "mobile", "role", "balance", "password"].includes(k))
                          .map(([k, v]) => (
                            <tr key={k}>
                              <th className="small-muted text-capitalize">{k}</th>
                              <td>{scalarize(v)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <button className="btn-classic" onClick={saveUserDetails}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginRight: 8 }}>
                        <path d="M2 2h9v4h3v8H2z" fill="#fff" />
                      </svg>
                      Save Details
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        setEditForm(null);
                        setSearchId("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        if (editForm?.id) deleteUser(editForm.id);
                      }}
                      style={{ borderColor: "rgba(255,90,90,0.12)", color: "#ff9a9a" }}
                    >
                      Delete User
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}