import { useState, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const CuriosityPanel = lazy(() => import("./curiosity/CuriosityPanel"));

export default function GlobalCuriosity() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();

  const isWriting =
    location.pathname.includes("/app") ||
    location.pathname.includes("/auto-bestseller");

  if (!isWriting) return null;
  if (isMobile && location.pathname.includes("/app")) return null;

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

      {open && (
        <Suspense fallback={null}>
          <CuriosityPanel onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
