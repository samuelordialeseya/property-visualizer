import { Home, Building2, Settings, LogOut, ChevronRight, ChevronLeft, PanelLeft } from "lucide-react";
import { useUserProfile } from "@/hooks/useFirestore";

export default function Sidebar({ user, activeView, setActiveView, onLogout, collapsed, onToggleCollapse }) {
  const { profile } = useUserProfile(user?.uid);
  const managerName = profile?.manager_name || user?.email?.split('@')[0] || "User";
  const initial = managerName.charAt(0).toUpperCase();
  const navItems = [
    { id: "dashboard",  label: "Dashboard",  icon: Home },
    { id: "properties", label: "Properties", icon: Building2 },
    { id: "settings",   label: "Settings",   icon: Settings },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-zinc-200 bg-[#f4f4f5] transition-all duration-300 ease-in-out shrink-0 ${
        collapsed ? "w-[80px]" : "w-[280px]"
      }`}
    >
      {/* Toggle button — sits on the edge of the sidebar */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 grid h-6 w-6 place-items-center rounded-full border border-zinc-200 bg-white shadow-sm text-zinc-500 transition hover:bg-[var(--color-blue-50)] hover:text-[var(--color-blue-600)] hover:border-[var(--color-blue-300)]"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Brand */}
      <div
        onClick={() => setActiveView("dashboard")}
        className="relative flex items-center justify-center cursor-pointer h-[118px] px-3 select-none overflow-hidden"
        title="Go to Dashboard"
      >
        {/* Full horizontal logo */}
        <div
          className={`absolute inset-0 flex items-center justify-center pt-6 transition-all duration-300 ease-in-out ${
            collapsed
              ? "opacity-0 scale-90 pointer-events-none"
              : "opacity-100 scale-100 pointer-events-auto"
          }`}
        >
          <img
            src="/branding/logo-horizontal.png"
            alt="Property Visualizer"
            className="h-[65px] w-auto max-w-[210px] object-contain hover:opacity-90 transition-opacity"
          />
        </div>

        {/* Collapsed building icon */}
        <div
          className={`absolute inset-0 flex items-center justify-center pt-2 transition-all duration-300 ease-in-out ${
            collapsed
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-75 pointer-events-none"
          }`}
        >
          <img
            src="/branding/building-icon.png"
            alt="Property Visualizer"
            className="h-10 w-auto object-contain hover:scale-105 transition-transform"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 space-y-3 px-4 mt-4`}>
        {navItems.map((item) => {
          const isActive =
            activeView === item.id ||
            (item.id === "properties" && (activeView === "property_detail" || activeView === "3d_view"));
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              title={collapsed ? item.label : undefined}
              className={`flex w-full items-center rounded-[14px] transition text-[15px] font-medium ${
                collapsed ? "justify-center px-0 py-3.5" : "gap-4 px-5 py-3.5"
              } ${
                isActive
                  ? "bg-white text-[var(--color-blue-700)] shadow-sm border border-zinc-200/60"
                  : "text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900 border border-transparent"
              }`}
            >
              <Icon
                size={18}
                className={`shrink-0 ${isActive ? "text-[var(--color-blue-600)]" : "text-zinc-400"}`}
              />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer / Profile */}
      <div className="border-t border-zinc-200 p-3 mt-auto">
        <div 
          onClick={() => setActiveView("settings")}
          title={collapsed ? "Profile Settings" : undefined}
          className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} cursor-pointer hover:bg-zinc-200/50 p-2 rounded-xl transition`}
        >
          <div className="h-8 w-8 bg-[#0b3860] rounded-full flex items-center justify-center text-white text-[13px] font-bold font-['Sora'] shadow-sm shrink-0">
            {initial}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-zinc-900 truncate">{managerName}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
