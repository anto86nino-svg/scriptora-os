import { useEffect, useState } from "react";

const hints = [
  "Qui puoi aumentare la tensione...",
  "Questa scena è troppo statica.",
  "Aggiungi un conflitto emotivo.",
  "Ottimo ritmo narrativo.",
  "Potresti rendere il dialogo più naturale."
];

export default function MollyLive() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setMsg(hints[Math.floor(Math.random() * hints.length)]);
        setTimeout(() => setMsg(null), 5000);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  if (!msg) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "80px",
      right: "24px",
      zIndex: 9999,
      background: "rgba(20,20,40,0.95)",
      color: "white",
      padding: "10px 14px",
      borderRadius: "10px",
      fontSize: "13px",
      maxWidth: "260px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
    }}>
      🤖 Molly: {msg}
    </div>
  );
}
