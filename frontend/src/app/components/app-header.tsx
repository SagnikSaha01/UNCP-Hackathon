import React from "react";
import { NavLink } from "react-router";
import { LayoutDashboard, Target, Stethoscope, Info, BookOpen } from "lucide-react";

const tabs = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/baseline", label: "Baseline", icon: Target },
  { to: "/post-op", label: "Post-op test", icon: Stethoscope },
  { to: "/research", label: "Research references", icon: BookOpen },
  { to: "/about", label: "About us", icon: Info },
];

function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0a0f1e]/95 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-1">
        <NavLink to="/" className="flex items-center gap-2 mr-6 text-white/90 font-semibold hover:text-white">
          <span className="bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] bg-clip-text text-transparent">AURA</span>
        </NavLink>
        <nav className="flex items-center gap-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors " +
                (isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white/90 hover:bg-white/5")
              }
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

export { AppHeader };
