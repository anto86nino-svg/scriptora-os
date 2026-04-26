import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import CuriosityPanel from "./curiosity/CuriosityPanel";

const messages = [
  "Capitolo in scrittura...",
  "Sta creando la scena...",
  "Sta aumentando la tensione...",
  "Sta costruendo il conflitto...",
  "Sta raffinando lo stile...",
  "Sta rendendo il testo piu coinvolgente..."
];

export default function GlobalCuriosity() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(messages[0]);
  const location = useLocation();

  // 👉 Mostra SOLO nelle pagine di scrittura
  const isWriting =
    location.pathname.includes("/app") ||
    location.pathname.includes("/auto-bestseller");

  useEffect(() => {
    if (!isWriting) return;

    const interval = setInterval(() => {
      setMsg(messages[Math.floor(Math.random() * messages.length)]);
    }, 3500);

    return () => clearInterval(interval);
  }, [isWriting]);

  if (!isWriting) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "white",
          padding: "10px 14px",
          fontSize: "13px",
          borderRadius: "999px",
          border: "none",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          cursor: "pointer",
          opacity: 0.95,
        }}
      >
        {msg}
      </button>

      {open && <CuriosityPanel onClose={() => setOpen(false)} />}
    </>
  );
}
