"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Search,
  ShieldCheck,
  LogOut,
  SearchCheck,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/search", label: "New Search", icon: Search },
];

const COLLAPSE_STORAGE_KEY = "prospectr-sidebar-collapsed";

export default function Sidebar({
  userName,
  userRole,
  signOutAction,
}: {
  userName: string;
  userRole: "admin" | "partner";
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Default false on both server and first client render to avoid a hydration
  // mismatch; the real persisted value (if any) is applied after mount.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Reading localStorage can only happen after mount (the server has no
    // access to it), so this necessarily runs as a post-hydration effect —
    // there's no way to derive this from props/render.
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navItems = userRole === "admin" ? [...NAV_ITEMS, { href: "/admin", label: "Admin", icon: ShieldCheck }] : NAV_ITEMS;

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
            <SearchCheck className="h-4 w-4 text-white" strokeWidth={2.25} />
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-900">Prospectr</span>
        </div>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:transition-[width] lg:duration-150 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-[76px]" : "lg:w-64"}`}
      >
        <div className={`flex items-center gap-2 px-5 py-5 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600">
            <SearchCheck className="h-5 w-5 text-white" strokeWidth={2.25} />
          </div>
          {!collapsed && <span className="text-lg font-semibold tracking-tight text-slate-900 lg:inline">Prospectr</span>}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2 ${
                  collapsed ? "lg:justify-center lg:px-0" : ""
                } ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 lg:h-4 lg:w-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} strokeWidth={2} />
                <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={toggleCollapsed}
          className={`mx-3 mb-2 hidden items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 lg:flex ${
            collapsed ? "lg:justify-center lg:px-0" : ""
          }`}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4 flex-shrink-0" /> : <PanelLeftClose className="h-4 w-4 flex-shrink-0" />}
          {!collapsed && "Collapse"}
        </button>

        <div className="border-t border-slate-200 p-3">
          <div className={`flex items-center gap-3 rounded-lg px-2 py-2 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
              {initials}
            </div>
            <div className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
              <p className="truncate text-sm font-medium text-slate-900">{userName}</p>
              <p className="truncate text-xs capitalize text-slate-500">{userRole}</p>
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              title={collapsed ? "Sign out" : undefined}
              className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 lg:py-2 ${
                collapsed ? "lg:justify-center lg:px-0" : ""
              }`}
            >
              <LogOut className="h-5 w-5 flex-shrink-0 lg:h-4 lg:w-4 text-slate-400" strokeWidth={2} />
              <span className={collapsed ? "lg:hidden" : ""}>Sign out</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
