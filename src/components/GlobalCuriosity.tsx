import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import CuriosityPanel from "./curiosity/CuriosityPanel";

export default function GlobalCuriosity() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isWriting =
    location.pathname.includes("/app") ||
    location.pathname.includes("/auto-bestseller");

  if (!isWriting) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="scriptora-studio-button"
        title="Apri Studio"
      >
        <Sparkles className="h-4 w-4" />
        <span>Studio</span>
      </button>

      {open && <CuriosityPanel onClose={() => setOpen(false)} />}
    </>
  );
}
