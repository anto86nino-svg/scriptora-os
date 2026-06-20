import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import CuriosityPanel from "./curiosity/CuriosityPanel";

export default function GlobalCuriosity({ docked = false }: { docked?: boolean }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isWriting =
    location.pathname.includes("/app");

  if (!isWriting) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={docked ? "scriptora-dock-inline-btn w-full justify-center" : "scriptora-studio-button"}
        title="Apri Studio"
      >
        <Sparkles className="h-4 w-4" />
        <span className={docked ? "" : "scriptora-studio-button-label"}>Studio</span>
      </button>

      {open && <CuriosityPanel onClose={() => setOpen(false)} />}
    </>
  );
}
