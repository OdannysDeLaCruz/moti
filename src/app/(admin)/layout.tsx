"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Bike, IdCard, Users, Wallet, Settings, Menu } from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/lib/auth-context";

const ADMIN_NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/rides", label: "Servicios", icon: Bike },
  { href: "/admin/drivers", label: "Conductores", icon: IdCard },
  { href: "/admin/clients", label: "Clientes", icon: Users },
  { href: "/admin/commissions", label: "Comisiones", icon: Wallet },
  { href: "/admin/config", label: "Configuración", icon: Settings },
];

const SECTION_TITLES: Array<[string, string]> = [
  ["/admin/dashboard", "Dashboard"],
  ["/admin/rides", "Servicios"],
  ["/admin/drivers", "Conductores"],
  ["/admin/clients", "Clientes"],
  ["/admin/commissions", "Comisiones"],
  ["/admin/config", "Configuración"],
  ["/admin/verify", "Verificar Conductores"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useAuthGuard("ADMIN");
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  const title = SECTION_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "Panel Admin";

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="admin-shell">
      {navOpen && <div className="admin-sidebar-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className={`admin-sidebar${navOpen ? " open" : ""}`}>
        <div className="admin-sidebar-brand">⚙️ Panel Admin</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-sidebar-link${active ? " active" : ""}`}
                onClick={() => setNavOpen(false)}
              >
                <Icon size={20} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="btn btn-ghost btn-sm btn-full" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <div className="admin-topbar">
          <button className="admin-hamburger" onClick={() => setNavOpen(true)} aria-label="Abrir menú">
            <Menu size={22} />
          </button>
          <span style={{ flex: 1, fontWeight: 700, fontSize: "17px" }}>{title}</span>
          <button className="admin-topbar-logout" onClick={handleLogout}>
            Salir
          </button>
        </div>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
