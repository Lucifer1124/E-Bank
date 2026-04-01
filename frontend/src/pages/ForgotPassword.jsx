
import React, { useState, useEffect } from "react";
import API from "../api";
import { data, useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null); // { type: "success"|"error", text }
  const navigate = useNavigate();

  useEffect(() => {
    
    const style = document.createElement("style");
    style.innerHTML = `
      .login-bg {
        background: linear-gradient(135deg, #ffe5e5, #ffb3b3);
        background-size: cover;
        background-position: center;
        background-blend-mode: overlay;
        animation: fadeInBg 1.5s ease-in-out;
      }

      @keyframes fadeInBg {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(8px);
        border: none;
        border-radius: 16px;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
        animation: fadeUp 0.6s ease-in-out;
      }

      @keyframes fadeUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .btn-primary {
       background: linear-gradient(90deg, #ff6b81, #e63946);
        border: none;
        transition: all 0.3s ease;
      }

      .btn-primary:hover {
        background: linear-gradient(90deg, #ff6b81, #e63946);
        transform: translateY(-1px);
      }

      .btn-outline-light {
        background: linear-gradient(90deg, #ff6b81, #e63946);
        border: 1px solid #eb2525ff;
        background: white;
      }

      .btn-outline-light:hover {
       background: linear-gradient(90deg, #ff6b81, #e63946);
        color: white;
      }

      .form-control {
        border-radius: 10px;
        border: 1px solid #d1d5db;
        transition: all 0.2s ease;
      }

      .form-control:focus {
        border-color: #eb2525ff;
        box-shadow: 0 0 0 0.2rem rgba(37,99,235,0.25);
      }

      .alert {
        border-radius: 10px;
        font-size: 0.9rem;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  function validateEmail(e) {
    return /\S+@\S+\.\S+/.test(e);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (!email || !validateEmail(email)) {
      setMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }
    setSending(true);
    try {
      await API.post("/auth/forgot-password", { email });
      setMessage({ type: "success", text: "OTP sent to your email. Check your inbox." });
      setTimeout(() => navigate("/reset-password", { state: { email } }), 1500);
    } catch (err) {
      console.error(err);
      const text = "Failed to send OTP. Try again.";
      setMessage({ type: "error", text: String(text) });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 login-bg">
      <div className="card shadow-sm" style={{ width: 480 }}>
        <div className="card-body p-4">
          <h4 className="mb-3 text-center fw-semibold">Forgot Password</h4>

          {message && (
            <div
              className={`alert ${message.type === "error" ? "alert-danger" : "alert-success"}`}
              role="alert"
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-medium">Registered Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div className="d-flex gap-2">
              <button
                className="btn btn-primary w-100"
                type="submit"
                disabled={sending}
              >
                {sending ? "Sending OTP..." : "Send OTP"}
              </button>
              <button
                type="button"
                className="btn btn-outline-light text-danger"
                onClick={() => navigate("/login")}
              >
                Back to login
              </button>
            </div>
          </form>

          <div className="text-center mt-3">
            <small className="text-muted">
              Remembered your password?{" "}
              <a href="/login" className="text-decoration-none fw-semibold text-primary">
                Log in
              </a>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
