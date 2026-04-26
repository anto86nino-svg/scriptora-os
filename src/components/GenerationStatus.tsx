import { useEffect, useState } from "react";

const messages = [
  "Sta creando la scena...",
  "Sta aumentando la tensione...",
  "Sta costruendo il conflitto...",
  "Sta raffinando lo stile...",
  "Sta rendendo il capitolo coinvolgente..."
];

export default function GenerationStatus() {
  const [msg, setMsg] = useState(messages[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsg(messages[Math.floor(Math.random() * messages.length)]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      color: "#aaa",
      fontSize: "14px",
      background: "rgba(0,0,0,0.4)",
      padding: "6px 12px",
      borderRadius: "8px"
    }}>
      {msg}
    </div>
  );
}
