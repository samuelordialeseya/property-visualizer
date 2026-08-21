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
        collapsed ? "w-[64px]" : "w-64"
      }`}
    >
      {/* Toggle button — sits on the edge of the sidebar */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 grid h-6 w-6 place-items-center rounded-full border border-zinc-200 bg-white shadow-sm text-zinc-500 transition hover:bg-[var(--color-verde-50)] hover:text-[var(--color-verde-600)] hover:border-[var(--color-verde-300)]"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Brand */}
      <div
        className={`flex items-center border-b border-zinc-100 transition-all duration-300 ${
          collapsed ? "justify-center px-0 py-5" : "gap-3 px-5 py-5"
        }`}
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--color-verde-600)] text-white shadow-sm">
          <Building2 size={18} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-[14px] font-semibold leading-tight text-[var(--color-verde-700)] tracking-[-0.01em] whitespace-nowrap">
              Property<br />Visualizer
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 space-y-1 p-2`}>
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
              className={`flex w-full items-center rounded-xl transition text-[14px] font-medium ${
                collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3"
              } ${
                isActive
                  ? "bg-[var(--color-verde-50)] text-[var(--color-verde-700)]"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <Icon
                size={18}
                className={`shrink-0 ${isActive ? "text-[var(--color-verde-600)]" : "text-zinc-400"}`}
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
