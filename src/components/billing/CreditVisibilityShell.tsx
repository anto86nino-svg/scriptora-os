import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { GlobalCreditBar } from "./GlobalCreditBar";
import { InsufficientCreditsPaywall } from "./InsufficientCreditsPaywall";

const HIDDEN_PATHS = new Set(["/", "/auth", "/pricing", "/install"]);
const WRITER_PATH = "/app";
const USAGE_PATH = "/usage";

export function CreditVisibilityShell() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user || HIDDEN_PATHS.has(pathname)) return <InsufficientCreditsPaywall />;
  if (pathname === WRITER_PATH || pathname === USAGE_PATH) return <InsufficientCreditsPaywall />;

  return (
    <>
      <GlobalCreditBar variant="bar" />
      <InsufficientCreditsPaywall />
    </>
  );
}
