
import React, { useEffect, useState } from "react";
import API from "../api";
import { useLocation, useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state && location.state.email) || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

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
        background: linear-gradient(90deg, #c1b8b9ff, #e8c9ccff);
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

  useEffect(() => {
    if (!initialEmail) {
      setEmail("");
    }
  }, [initialEmail]);

  function validateForm() {
    if (!email) return "Email is required.";
    if (!otp) return "OTP is required.";
    if (!newPassword) return "New password is required.";
    if (newPassword.length < 6) return "Password must be at least 6 characters.";
    if (newPassword !== confirm) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    const err = validateForm();
    if (err) {
      setMessage({ type: "error", text: err });
      return;
    }
    setSubmitting(true);
    try {
      await API.post("/auth/reset-password", { email, otp, newPassword });
      setMessage({ type: "success", text: "Password reset successful. Redirecting to login..." });
      setTimeout(() => navigate("/login"), 1400);
    } catch (err) {
      console.error(err);
      const text = "Reset failed. Check OTP and try again.";
      setMessage({ type: "error", text: String(text) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 login-bg">
      <div className="card shadow-sm" style={{ width: 520 }}>
        <div className="card-body p-4">
          <h4 className="mb-3 text-center fw-semibold">Reset Password</h4>

          {message && (
            <div
              className={`alert ${message.type === "error" ? "alert-danger" : "alert-success"}`}
              role="alert"
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-12 mb-3">
                <label className="form-label small fw-medium">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  placeholder="Registered email"
                  required
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label small fw-medium">OTP</label>
                <input
                  className="form-control"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.trim())}
                  placeholder="Enter OTP sent to email"
                  required
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label small fw-medium">New Password</label>
                <div className="input-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-light text-danger"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="col-md-12 mb-3">
                <label className="form-label small fw-medium">Confirm Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  required
                />
              </div>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? "Resetting..." : "Reset Password"}
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
              Didn’t get OTP? Go back to{" "}
              <a href="/forgot-password" className="text-decoration-none fw-semibold text-primary">
                Forgot Password
              </a>{" "}
              to request again.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
