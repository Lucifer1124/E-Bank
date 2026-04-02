// src/pages/AddMoney.jsx
import React, { useState } from "react";
import API from "../api";
import { jwtDecode } from "jwt-decode";
import { motion } from "framer-motion";
import "bootstrap/dist/css/bootstrap.min.css";

export default function AddMoney({ onSuccess }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  async function handleAddMoney(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setMsg("Enter a valid amount");
      return;
    }
    setLoading(true);
    setMsg("");
    const res = await loadRazorpayScript();
    if (!res) {
      alert("Razorpay SDK failed to load. Are you online?");
      setLoading(false);
      return;
    }

    try {
      const orderRes = await API.post("/payment/create-order", {
        amount: Number(amount),
      });
      const order = orderRes.data;

      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        handler: async function (response) {
          try {
            const token = localStorage.getItem("token");
            let username = null;
            if (token) {
              const decoded = jwtDecode(token);
              username = decoded.sub;
            }

            const verifyRes = await API.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: Number(amount),
              username,
            });

            if (verifyRes.data.success) {
              setMsg("Money added successfully!");
              setAmount("");
              if (onSuccess) onSuccess();
            } else {
              setMsg("Payment verification failed.");
            }
          } catch (err) {
            console.error(err);
            setMsg("Error verifying payment.");
          }
        },
        prefill: {
          name: "Demo User",
          email: "demo@example.com",
          contact: "9999999999",
        },
        theme: { color: "#8672ff" },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error(err);
      setMsg("Error initiating payment");
    } finally {
      setLoading(false);
    }
  }

  // Framer Motion Variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 },
  };

  return (
    <motion.div
      className="card border-0 shadow-lg p-4 position-relative overflow-hidden panel"
      style={{
        backgroundSize: "cover",
        color: "black",
        borderRadius: 20,
        overflow: "hidden",
        width: 800,
      }}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
    >
      <h5 className="text-danger fw-bold">Add Money to Wallet</h5>
      <p className="text-light-emphasis">
        Instantly add funds to your account using{" "}
        <img
          style={{ width: 100 }}
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQQm61y_1zYU15YuP51hPr52IgbM35xwCc3YOyl0L4Jw5xkdHeWQ1If78_nF1l6_pUIDI&usqp=CAU"
          alt="Razorpay"
        />
      </p>

      <motion.form
        onSubmit={handleAddMoney}
        className="bg-white p-4 rounded mt-3"
        style={{ color: "#333", maxWidth: 600 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 } }}
      >
        <div className="mb-3">
          <input
            type="number"
            className="form-control"
            placeholder="Enter amount (INR)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="d-flex gap-2">
          <motion.button
            className="primary"
            type="submit"
            disabled={loading}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            {loading ? "Processing..." : "Add Money"}
          </motion.button>
          <motion.button
            type="button"
            className="ghost"
            onClick={() => setAmount("")}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            Clear
          </motion.button>
        </div>

        {msg && (
          <motion.div
            className={`mt-3 alert ${
              msg.includes("successfully") ? "alert-success" : "alert-danger"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {msg}
          </motion.div>
        )}
      </motion.form>

      <div className="mt-4">
        <small className="text-black">Secure payment powered by Razorpay</small>
      </div>
    </motion.div>
  );
}
