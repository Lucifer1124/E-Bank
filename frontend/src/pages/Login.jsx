
import React, { useState, useEffect } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
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
        transform: translateY(-1px);
      }

      .btn-outline-light {
        background: white;
        border: 1px solid #eb2525ff;
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
        box-shadow: 0 0 0 0.2rem rgba(235,37,37,0.25);
      }

      .alert {
        border-radius: 10px;
        font-size: 0.9rem;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await API.post("/auth/login", form);
      const token = res.data.token ?? res.data?.accessToken ?? null;
      if (!token) throw new Error("No token returned");
      localStorage.setItem("token", token);
      const payload = jwtDecode(token);
      const role =
        payload.role || payload?.authorities || payload?.roles || payload?.roleName;
      if (String(role ?? "").toUpperCase().includes("ADMIN")) navigate("/admin");
      else navigate("/user");
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Login failed. Check username/password or server." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 login-bg">
      <div className="card shadow-sm" style={{ width: 480 }}>
        <div className="card-body p-4">
          <h4 className="mb-3 text-center fw-semibold">Welcome Back</h4>
          <p className="text-center text-muted mb-3">Sign in to continue</p>

          {message && (
            <div
              className={`alert ${
                message.type === "error" ? "alert-danger" : "alert-success"
              }`}
              role="alert"
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-medium">Username</label>
              <input
                type="text"
                className="form-control"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-medium">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <button
                type="button"
                className="btn btn-outline-light text-danger"
                onClick={() => navigate("/forgot-password")}
              >
                Reset
              </button>
            </div>
          </form>

          <div className="text-center mt-3">
            <small className="text-muted">
              Don't have an account?{" "}
              <a href="/" className="text-decoration-none fw-semibold text-danger">
                Sign Up
              </a>
              <a href="/forgot-password" className="text-decoration-none fw-semibold text-black"> , Forgot Password?</a>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
