import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { t } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn("[404]", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="mx-auto max-w-md px-6 text-center">
        <p className="text-6xl font-black tracking-tight text-foreground/20">404</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{t("not_found_title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("not_found_desc")}</p>
        <Link
          to={user ? "/dashboard" : "/"}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {user ? t("home") : t("return_home")}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
