import { Home, Building2, Settings, LogOut, ChevronRight, ChevronLeft, PanelLeft } from "lucide-react";

export default function Sidebar({ activeView, setActiveView, onLogout, collapsed, onToggleCollapse }) {
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
        className={`flex items-center transition-all duration-300 ${
          collapsed ? "justify-center px-0 py-8" : "gap-3 px-6 py-8"
        }`}
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-blue-600)] text-white shadow-sm">
          <Building2 size={20} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-[16px] font-bold leading-tight text-[var(--color-blue-700)] tracking-tight whitespace-nowrap">
              Property Visualizer
            </div>
          </div>
        )}
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

      {/* Footer / Logout */}
      <div className="border-t border-zinc-100 p-2">
        <button
          onClick={onLogout}
          title={collapsed ? "Log out" : undefined}
          className={`flex w-full items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 ${
            collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-2.5"
          }`}
        >
          <LogOut size={16} className="shrink-0 text-zinc-400" />
          {!collapsed && <span className="text-[13px] font-semibold whitespace-nowrap">Log out</span>}
        </button>
      </div>
    </aside>
  );
}
