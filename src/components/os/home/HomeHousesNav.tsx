import { Home } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { OS_HOUSES } from "@/lib/os/os-house-registry";

export function HomeHousesNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const onDashboard = location.pathname === "/dashboard";

  return (
    <nav aria-label="Case Scriptora OS" className="mt-6 rounded-[1.5rem] bg-white/[0.03] p-3 sm:p-4">
      <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Case</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition ${
            onDashboard ? "bg-white text-slate-950" : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.08em]">Home</span>
        </button>

        {OS_HOUSES.map((house) => {
          const Icon = house.icon;
          const active = location.pathname === house.path;
          return (
            <button
              key={house.id}
              type="button"
              onClick={() => navigate(house.path)}
              className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition ${
                active ? "bg-white text-slate-950" : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-bold leading-tight">
                {house.label.replace("Casa ", "")}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
