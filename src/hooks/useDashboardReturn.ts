import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getDashboardReturnPath,
  mergeRouteState,
  readDashboardReturnState,
  type DashboardReturnContext,
} from "@/lib/one-flow/dashboard-return-context";

export function useDashboardReturn() {
  const location = useLocation();
  const navigate = useNavigate();

  const returnContext = useMemo(
    () => readDashboardReturnState(location.state),
    [location.state],
  );

  const goBackToDashboard = useCallback(() => {
    navigate(getDashboardReturnPath(returnContext));
  }, [navigate, returnContext]);

  const navigateWithReturn = useCallback(
    (path: string, extra?: Record<string, unknown>) => {
      navigate(path, { state: mergeRouteState(returnContext, extra) });
    },
    [navigate, returnContext],
  );

  return {
    returnContext,
    goBackToDashboard,
    navigateWithReturn,
    dashboardBackPath: getDashboardReturnPath(returnContext),
  };
}

export type { DashboardReturnContext };
