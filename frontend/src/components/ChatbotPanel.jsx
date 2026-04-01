
import React, { useState } from "react";
import API from "../api";
import { motion } from "framer-motion";

export default function ChatbotPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (e) => {
    e?.preventDefault();
    if (!input) return;
    const userMsg = { role: "user", text: input, time: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await API.post("/chatbot", { query: userMsg.text });
      const botText = res.data || "No response";
      setMessages((m) => [
        ...m,
        { role: "bot", text: String(botText), time: new Date().toISOString() },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Chatbot unavailable", time: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Framer Motion variants
  const panelVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const messageVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 },
  };

  return (
    <motion.div
      className="card border-0 shadow-lg p-4 position-relative overflow-hidden panel"
      style={{ width: 800 }}
      initial="hidden"
      animate="visible"
      variants={panelVariants}
    >
      <div
        className="fw-bold text-danger"
        style={{
          fontSize: 20,
          background: "linear-gradient(135deg, #ff6b81 0%, #e63946 100%)",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        Ai Assistant
      </div>
      <div className="small-muted" style={{ marginTop: 8 }}>
        Ask about transfers, balance or account help.
      </div>

      <div className="chat-wrap" style={{ marginTop: 12, display: "flex" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="chat-window" style={{ flex: 1, overflowY: "auto" }}>
            {messages.length === 0 ? (
              <div className="small-muted">No messages yet. Try the sample below.</div>
            ) : (
              messages.map((m, i) => (
                <motion.div
                  key={i}
                  className={`chat-msg ${m.role}`}
                  initial="hidden"
                  animate="visible"
                  variants={messageVariants}
                >
                  <div className="bubble" style={{marginTop: 5}}>{m.text}</div>
                </motion.div>
              ))
            )}
          </div>

          <form className="chat-input d-flex gap-2 mt-2" onSubmit={send}>
            <input
              className="input flex-grow-1"
              placeholder="Ask the assistant..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <motion.button
              className="primary"
              type="submit"
              disabled={loading}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              {loading ? "Sending..." : "Send"}
            </motion.button>
          </form>
        </div>

        <aside style={{ width: 260, marginLeft: 12 }}>
          <div className="panel p-3">
            <div style={{ fontWeight: 700 }}>Tips</div>
            <ul style={{ marginTop: 8 }}>
              <li className="small-muted">"Show my recent transactions"</li>
              <li className="small-muted">"How to transfer to another bank"</li>
              <li className="small-muted">"What is my balance?"</li>
            </ul>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
