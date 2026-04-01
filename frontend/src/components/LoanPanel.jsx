import React, { useEffect, useMemo, useState } from "react";
import API from "../api";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence } from "framer-motion";

const normalizePanValue = (value = "") =>
  value.replace(/\s+/g, "").toUpperCase().slice(0, 12);

const normalizeAdharValue = (value = "") =>
  value.replace(/\D/g, "").slice(0, 14);

const uniqueSuggestions = (values, normalizer) => {
  const seen = new Set();
  return values
    .map((value) => normalizer(value))
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .slice(0, 8);
};

const mergeKycSuggestions = (current = {}, additions = {}) => ({
  pans: uniqueSuggestions(
    [...(current.pans || []), ...(additions.pans || [])],
    normalizePanValue
  ),
  adhars: uniqueSuggestions(
    [...(current.adhars || []), ...(additions.adhars || [])],
    normalizeAdharValue
  ),
});

export default function Loan({ onLoanApplied }) {
  const token = localStorage.getItem("token");
  const username = token ? jwtDecode(token).sub : null;
  const cacheKey = useMemo(
    () => (username ? `loan-form-cache:${username}` : null),
    [username]
  );
  const sessionKycKey = useMemo(
    () => (username ? `session-user-kyc:${username}` : null),
    [username]
  );
  const suggestionKey = useMemo(
    () => (username ? `loan-kyc-suggestions:${username}` : null),
    [username]
  );

  const [income, setIncome] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [adhar, setAdhar] = useState("");
  const [pan, setPan] = useState("");
  const [kycSuggestions, setKycSuggestions] = useState({ pans: [], adhars: [] });
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!cacheKey) return;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;
      const cached = JSON.parse(raw);
      setIncome(cached.income ?? "");
      setCreditScore(cached.creditScore ?? "");
    } catch (err) {
      console.error("Failed to restore cached loan form", err);
    }
  }, [cacheKey]);

  useEffect(() => {
    if (!cacheKey) return;
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        income,
        creditScore,
      })
    );
  }, [cacheKey, creditScore, income]);

  useEffect(() => {
    let cancelled = false;

    const readSuggestionCache = () => {
      if (!suggestionKey) return { pans: [], adhars: [] };
      try {
        const raw = sessionStorage.getItem(suggestionKey);
        if (!raw) return { pans: [], adhars: [] };
        return mergeKycSuggestions({}, JSON.parse(raw));
      } catch (err) {
        console.error("Failed to restore KYC suggestions", err);
        return { pans: [], adhars: [] };
      }
    };

    const writeSuggestionCache = (nextSuggestions) => {
      if (!suggestionKey) return;
      sessionStorage.setItem(suggestionKey, JSON.stringify(nextSuggestions));
    };

    const writeSessionKyc = (accountData) => {
      if (!sessionKycKey) return;
      sessionStorage.setItem(
        sessionKycKey,
        JSON.stringify({
          accountNumber: accountData.accountNumber ?? "",
          adhar: normalizeAdharValue(accountData.adhar ?? ""),
          pan: normalizePanValue(accountData.pan ?? ""),
          type: accountData.type ?? "",
          verified: Boolean(accountData.verified),
        })
      );
    };

    async function restoreKycSuggestions() {
      if (!sessionKycKey) return;
      try {
        const cachedSuggestions = readSuggestionCache();
        const cachedAccount = sessionStorage.getItem(sessionKycKey);
        if (cachedAccount) {
          const parsedAccount = JSON.parse(cachedAccount);
          const nextSuggestions = mergeKycSuggestions(cachedSuggestions, {
            pans: [parsedAccount.pan],
            adhars: [parsedAccount.adhar],
          });
          writeSuggestionCache(nextSuggestions);
          if (!cancelled) {
            setKycSuggestions(nextSuggestions);
          }
          return;
        }

        const res = await API.get("/user/me/account");
        const accountData = res.data ?? {};
        writeSessionKyc(accountData);
        const nextSuggestions = mergeKycSuggestions(cachedSuggestions, {
          pans: [accountData.pan],
          adhars: [accountData.adhar],
        });
        writeSuggestionCache(nextSuggestions);
        if (!cancelled) {
          setKycSuggestions(nextSuggestions);
        }
      } catch (err) {
        console.error("Failed to restore session KYC", err);
        if (!cancelled) {
          setKycSuggestions(readSuggestionCache());
        }
      }
    }

    restoreKycSuggestions();
    return () => {
      cancelled = true;
    };
  }, [sessionKycKey, suggestionKey]);

  const rememberKycSuggestions = (nextPan, nextAdhar) => {
    if (!suggestionKey) return;
    setKycSuggestions((current) => {
      const nextSuggestions = mergeKycSuggestions(current, {
        pans: [nextPan],
        adhars: [nextAdhar],
      });
      sessionStorage.setItem(suggestionKey, JSON.stringify(nextSuggestions));
      return nextSuggestions;
    });
  };

  const cacheSessionKycSelection = (nextPan, nextAdhar) => {
    if (!sessionKycKey) return;
    try {
      const existing = sessionStorage.getItem(sessionKycKey);
      const base = existing ? JSON.parse(existing) : {};
      sessionStorage.setItem(
        sessionKycKey,
        JSON.stringify({
          ...base,
          pan: normalizePanValue(nextPan),
          adhar: normalizeAdharValue(nextAdhar),
        })
      );
    } catch (err) {
      console.error("Failed to cache selected KYC", err);
    }
  };

  const resetForm = ({ clearCache = false, preserveCachedFields = false } = {}) => {
    setIncome((current) => (preserveCachedFields ? current : ""));
    setCreditScore((current) => (preserveCachedFields ? current : ""));
    setRequestedAmount("");
    setAdhar("");
    setPan("");
    setEligibility(null);
    setError("");
    if (clearCache && cacheKey) {
      localStorage.removeItem(cacheKey);
    }
  };

  const getApiError = (err, fallback) => {
    const data = err?.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data?.message) return data.message;
    return fallback;
  };

  const handleCheckEligibility = async () => {
    const normalizedPan = normalizePanValue(pan);
    const normalizedAdhar = normalizeAdharValue(adhar);

    if (!income || !creditScore || !requestedAmount || !normalizedAdhar || !normalizedPan) {
      setError("Please fill all fields.");
      return;
    }

    if (Number(requestedAmount) > Number(income) * 10) {
      setError("Requested amount cannot exceed 10x your monthly income.");
      return;
    }

    if (Number(creditScore) < 300 || Number(creditScore) > 850) {
      setError("Credit score must be between 300 and 850.");
      return;
    }

    if (normalizedAdhar.length < 10 || normalizedAdhar.length > 14) {
      setError("Aadhaar number must be between 10 and 14 digits.");
      return;
    }

    if (normalizedPan.length < 10 || normalizedPan.length > 12) {
      setError("PAN number must be between 10 and 12 characters.");
      return;
    }

    if (!username) {
      setError("Please log in first");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await API.post("/loan/check", {
        username,
        income,
        creditScore,
        requestedAmount,
        adhar: normalizedAdhar,
        pan: normalizedPan,
      });
      setAdhar(normalizedAdhar);
      setPan(normalizedPan);
      rememberKycSuggestions(normalizedPan, normalizedAdhar);
      cacheSessionKycSelection(normalizedPan, normalizedAdhar);
      setEligibility(res.data);
    } catch (err) {
      setError(getApiError(err, "Error checking eligibility"));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLoan = async () => {
    if (!eligibility || !eligibility.id) {
      setError("Please check eligibility first");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await API.post(`/loan/apply/${eligibility.id}`);
      setEligibility(res.data);
      setShowSuccess(true);
      onLoanApplied?.();
      setTimeout(() => setShowSuccess(false), 1800);
    } catch (err) {
      setError(getApiError(err, "Error applying for loan"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        className="card border-0 shadow-lg p-4 position-relative overflow-hidden"
        style={{
          width: 800,
          borderRadius: "1rem",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(6px)",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <img
          src="https://cdn-icons-png.flaticon.com/512/684/684831.png"
          alt="Loan Icon"
          style={{
            position: "absolute",
            right: "40px",
            top: "30px",
            width: "120px",
            opacity: 0.08,
            zIndex: 0,
          }}
        />
        <img
          src="https://cdn-icons-png.flaticon.com/512/2920/2920277.png"
          alt="Money Background"
          style={{
            position: "absolute",
            left: "-30px",
            bottom: "-20px",
            width: "160px",
            opacity: 0.06,
            zIndex: 0,
          }}
        />

        <div
          className="d-flex justify-content-between align-items-center mb-3"
          style={{ zIndex: 1 }}
        >
          <div>
            <h5 className="fw-bold text-danger">Loan Application</h5>
            <p className="small text-muted mb-0">
              Check your eligibility and apply instantly
            </p>
          </div>
          <motion.button
            className="btn btn-outline-danger btn-sm"
            onClick={() => resetForm({ clearCache: true })}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Reset
          </motion.button>
        </div>

        <div className="row g-3 position-relative" style={{ zIndex: 2 }}>
          {[
            {
              label: "Monthly Income",
              value: income,
              set: setIncome,
              type: "number",
              placeholder: "Enter monthly income",
            },
            {
              label: "Credit Score",
              value: creditScore,
              set: setCreditScore,
              type: "number",
              placeholder: "Enter credit score",
            },
            {
              label: "Requested Loan Amount (INR)",
              value: requestedAmount,
              set: setRequestedAmount,
              type: "number",
              placeholder: "Enter loan amount",
            },
          ].map((field, idx) => (
            <div className="col-md-6" key={idx}>
              <label className="form-label fw-semibold">{field.label}</label>
              <input
                type={field.type}
                className="form-control border-danger"
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
              />
            </div>
          ))}

          <div className="col-md-6">
            <label className="form-label fw-semibold">Aadhaar Number</label>
            <input
              type="text"
              className="form-control border-danger"
              placeholder="Type or choose a remembered Aadhaar"
              value={adhar}
              list="loan-adhar-suggestions"
              inputMode="numeric"
              maxLength={14}
              autoComplete="off"
              onChange={(e) => setAdhar(normalizeAdharValue(e.target.value))}
              onBlur={() => rememberKycSuggestions(pan, adhar)}
            />
            <datalist id="loan-adhar-suggestions">
              {kycSuggestions.adhars.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
            <div className="form-text">
              We keep remembered Aadhaar values for this login session and show them here as suggestions.
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold">PAN Number</label>
            <input
              type="text"
              className="form-control border-danger"
              placeholder="Type or choose a remembered PAN"
              value={pan}
              list="loan-pan-suggestions"
              maxLength={12}
              autoComplete="off"
              onChange={(e) => setPan(normalizePanValue(e.target.value))}
              onBlur={() => rememberKycSuggestions(pan, adhar)}
            />
            <datalist id="loan-pan-suggestions">
              {kycSuggestions.pans.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
            <div className="form-text">
              Choose a remembered PAN from the dropdown or enter an updated one for this session.
            </div>
          </div>

          <div className="col-12 mt-1">
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                background: "#fff8f8",
                border: "1px solid #f0d1d4",
                color: "#6b5560",
                fontSize: 13,
              }}
            >
              Saved KYC values are suggested like a browser dropdown. We do not auto-fill them into the form, so the user can choose a remembered value or enter a corrected one.
            </div>
          </div>

          <div className="col-12 mt-3 d-flex gap-3">
            <motion.button
              onClick={handleCheckEligibility}
              className="primary px-4"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? "Checking..." : "Check Eligibility"}
            </motion.button>
            <motion.button
              type="button"
              className="ghost"
              onClick={() =>
                resetForm({ clearCache: false, preserveCachedFields: true })
              }
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              Clear
            </motion.button>
          </div>

          {error && (
            <div className="alert mt-3 alert-danger fw-semibold">{error}</div>
          )}

          {eligibility && (
            <motion.div
              className="alert mt-4 p-3 rounded bg-light border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="fw-bold mb-1">Eligibility Result:</p>
              <p>Status: {eligibility.eligible ? "Eligible" : "Not Eligible"}</p>
              <p>
                Max Allowed: Rs{" "}
                {Number(eligibility.maxAmount ?? 0).toLocaleString("en-IN")}
              </p>
              <p>Probability: {(eligibility.probability * 100).toFixed(2)}%</p>
              {eligibility.eligible && (
                <motion.button
                  onClick={handleApplyLoan}
                  className="mt-3 w-100 primary fw-semibold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Apply for Loan
                </motion.button>
              )}
            </motion.div>
          )}
        </div>

        <div className="mt-4 py-3">
          <p className="small text-black fw-semibold mb-0">
            Fast - Secure - Verified by Financial AI System
          </p>
        </div>
      </motion.div>

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
                border: "2px solid #ffbcbc",
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                style={{
                  fontSize: "30px",
                  color: "#22c55e",
                  marginBottom: "10px",
                }}
              >
                Success
              </motion.div>
              Loan Application Submitted Successfully!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
