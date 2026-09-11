"use client";
import { Home, Building2, Settings } from "lucide-react";

export default function BottomNav({ activeView, setActiveView }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "properties", label: "Properties", icon: Building2 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 flex md:hidden items-center justify-around bg-white/95 backdrop-blur-xl border-t border-zinc-200/80 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      {navItems.map((item) => {
        const isActive =
          activeView === item.id ||
          (item.id === "properties" && (activeView === "property_detail" || activeView === "3d_view"));
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer relative min-w-[72px] ${
              isActive
                ? "text-[#0b3860]"
                : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <div className={`p-1 rounded-full transition-colors ${isActive ? "bg-[#e1ebf4]" : "bg-transparent"}`}>
              <Icon
                size={20}
                className={`transition-transform duration-200 ${isActive ? "text-[#0b3860] scale-105" : "text-zinc-400"}`}
              />
            </div>
            <span
              className={`text-[10px] font-bold font-['Manrope'] mt-0.5 tracking-tight ${
                isActive ? "text-[#0b3860]" : "text-zinc-500 font-medium"
              }`}
            >
              {item.label}
            </span>
            {isActive && (
              <span className="absolute -bottom-1 w-8 h-0.5 bg-[#0b3860] rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
