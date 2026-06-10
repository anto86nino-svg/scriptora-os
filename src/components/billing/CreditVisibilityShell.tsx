import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { GlobalCreditBar } from "./GlobalCreditBar";
import { InsufficientCreditsPaywall } from "./InsufficientCreditsPaywall";

const HIDDEN_PATHS = new Set(["/", "/auth", "/pricing", "/install"]);
const WRITER_PATH = "/app";
const USAGE_PATH = "/usage";
const DASHBOARD_PATH = "/dashboard";

export function CreditVisibilityShell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();

  if (!user) {
    return <InsufficientCreditsPaywall />;
  }

  const hideBar = HIDDEN_PATHS.has(pathname) || pathname === USAGE_PATH || pathname === DASHBOARD_PATH;
  const isWriter = pathname === WRITER_PATH;

  return (
    <>
      {!hideBar && isWriter && isMobile && <GlobalCreditBar variant="compact" />}
      {!hideBar && isWriter && !isMobile && <GlobalCreditBar variant="bar" />}
      {!hideBar && !isWriter && <GlobalCreditBar variant="bar" />}
      <InsufficientCreditsPaywall />
    </>
  );
}
