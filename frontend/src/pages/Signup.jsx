// src/pages/Signup.jsx
import React, { useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const Signup = () => {
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    mobile: "",
  });
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      const res = await API.post("/auth/signup", {
        username: form.username,
        password: form.password,
        email: form.email,
        mobile: form.mobile,
      });

      const message = res.data;
      if (message.includes("already exists")) {
        setError(message);
      } else {
        setSuccessMsg("Signup successful! Redirecting to login...");
        setTimeout(() => {
          setSuccessMsg("");
          navigate("/login");
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      setError("Signup failed. Please try again.");
    }
  };

  return (
    <div
      className="up-root"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f3f0ff, #ffffff)",
      }}
    >
      <motion.div
        className="up-card"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          width: "420px",
          padding: "30px 25px",
          borderRadius: "16px",
          boxShadow: "0 18px 40px rgba(46, 43, 65, 0.14)",
          background: "#fff",
          border: "1px solid rgba(134, 114, 255, 0.12)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <h3 className="up-welcome text-center mb-3">Create Account</h3>
        <p className="up-sub text-center mb-4">Sign up to access your dashboard</p>

        {error && (
          <motion.div
            className="loan-note"
            style={{
              color: "var(--accent)",
              textAlign: "center",
              marginBottom: 12,
              fontWeight: 600,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <input
            className="input"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="input"
            type="tel"
            placeholder="Mobile Number"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
            required
          />

          <motion.button
            type="submit"
            className="primary mt-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign Up
          </motion.button>
        </form>

        <div className="text-center mt-3 small-muted">
          Already have an account?{" "}
          <a href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
            Login
          </a>
        </div>

        {/* Success Popup */}
     {/* Success Popup */}
<AnimatePresence>
  {successMsg && (
    <motion.div
      key="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(46, 43, 65, 0.18)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <motion.div
        key="popup"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          background: "white",
          borderRadius: "18px",
          border: "2px solid rgba(134, 114, 255, 0.2)",
          boxShadow: "0 18px 36px rgba(46, 43, 65, 0.18)",
          padding: "30px 50px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "#2E2B41",
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1.2 }}
          transition={{ type: "spring", stiffness: 120, damping: 8 }}
          style={{
            width: "65px",
            height: "65px",
            borderRadius: "50%",
            background: "#f3f0ff",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 0 25px rgba(134, 114, 255, 0.22)",
            marginBottom: "10px",
          }}
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ fontSize: "30px" }}
          >
            OK
          </motion.span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            fontWeight: 600,
            fontSize: "16px",
            color: "#2E2B41",
            marginTop: "5px",
          }}
        >
          {successMsg}
        </motion.p>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      </motion.div>
    </div>
  );
};

export default Signup;
