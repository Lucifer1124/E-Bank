
import React from "react";
import AddMoney from "./AddMoney";
import { motion } from "framer-motion";

export default function DashboardPanel({ active, setActive, onAddMoneySuccess }) {
  const services = [
    {
      title: "Instant Transfers",
      desc: "Send money securely and instantly to any account in our network.",
      img: "https://cdn-icons-png.flaticon.com/512/2331/2331963.png",
    },
    {
      title: "Add Funds",
      desc: "Top up your account in seconds with Razorpay or UPI.",
      img: "https://cdn-icons-png.flaticon.com/512/6404/6404933.png",
    },
    {
      title: "Loan Management",
      desc: "Check eligibility, apply for loans, and manage repayments easily.",
      img: "https://cdn-icons-png.flaticon.com/512/3126/3126618.png",
    },
    {
      title: "Transaction History",
      desc: "View all your deposits, withdrawals, and transfers in one place.",
      img: "https://cdn-icons-png.flaticon.com/512/1170/1170678.png",
    },
    {
      title: "Security & Fraud Detection",
      desc: "Your safety is our priority — advanced monitoring for every transaction.",
      img: "https://cdn-icons-png.flaticon.com/512/1040/1040254.png",
    },
  ];

  // Framer Motion variants
  const panelVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4 },
    }),
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 },
  };

  return (
    <motion.div
      className="panel card border-0 shadow p-4"
      style={{
        width: 780,
        backgroundColor: "white",
        borderRadius: 18,
        backgroundImage:
          "url('https://www.transparenttextures.com/patterns/white-wall-3.png'), linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)",
        backgroundSize: "cover",
        position: "relative",
        overflow: "hidden",
      }}
      initial="hidden"
      animate="visible"
      variants={panelVariants}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')",
        }}
      />

      <div style={{ position: "relative", zIndex: 2 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <div
              className="fw-bold text-danger"
              style={{
                fontSize: 20,
                background: "linear-gradient(135deg, #ff6b81 0%, #e63946 100%)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Quick Actions
            </div>
            <div className="text-muted small">Common tasks at a glance</div>
          </div>
          <div className="d-flex gap-2">
            <motion.button
              className="primary"
              onClick={() => setActive("transfer")}
              style={{ fontWeight: 600 }}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              Transfer
            </motion.button>
            <motion.button
              className="ghost"
              onClick={() => setActive("addMoney")}
              style={{ fontWeight: 600 }}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              Add Money
            </motion.button>
          </div>
        </div>

        {active === "addMoney" && (
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
          >
            <AddMoney onSuccess={onAddMoneySuccess} />
          </motion.div>
        )}

        <motion.div
          className="text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 } }}
        >
          <motion.img
            src="https://cdn-icons-png.flaticon.com/512/2331/2331949.png"
            alt="Banking Illustration"
            style={{
              width: 120,
              opacity: 0.9,
              filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))",
            }}
            whileHover={{ scale: 1.05 }}
          />
          <h5
            className="fw-bold mt-3 text-danger"
            style={{
              background: "linear-gradient(135deg, #ff6b81 0%, #e63946 100%)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            All-in-One Digital Banking
          </h5>
          <p className="text-muted small" style={{ maxWidth: 420, margin: "auto", lineHeight: 1.5 }}>
            Manage your finances with ease — from deposits and transfers to loans and repayments, all in one seamless dashboard.
          </p>
        </motion.div>

        <div>
          <h6 className="fw-bold text-danger mb-3">Our Services</h6>
          <div
            className="d-flex flex-row overflow-auto"
            style={{ gap: "1rem", scrollSnapType: "x mandatory", paddingBottom: "0.5rem" }}
          >
            {services.map((s, i) => (
              <motion.div
                key={i}
                className="card flex-shrink-0 text-center p-3 border-0"
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                style={{
                  minWidth: 200,
                  maxWidth: 200,
                  scrollSnapAlign: "start",
                  background: "#fff",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                  borderRadius: 12,
                  cursor: "pointer",
                }}
                whileHover={{ translateY: -5, boxShadow: "0 6px 16px rgba(220,53,69,0.25)" }}
              >
                <img src={s.img} alt={s.title} style={{ width: 60, margin: "auto" }} />
                <h6 className="fw-bold text-danger mt-3">{s.title}</h6>
                <p className="text-muted small">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          className="text-center mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.6, delay: 0.1 } }}
        >
          <p className="small text-muted mb-0">
            © 2025 SecureBank — Empowering Your Digital Finance Journey
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
