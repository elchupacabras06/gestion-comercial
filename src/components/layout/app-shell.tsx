import Link from "next/link";
import { ReactNode } from "react";
import type { SessionUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";
import { LayoutDashboard, ShoppingCart, Package, Users, UserCog } from "lucide-react";

const nav = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, admin: true },
];

export function AppShell({ children, user }: { children: ReactNode; user: SessionUser }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b bg-white p-4 md:min-h-screen md:border-b-0 md:border-r">
        <div className="mb-6">
          <Link href="/" className="block">
            <p className="text-lg font-semibold">Gestión Comercial</p>
            <p className="text-xs text-muted-foreground">Segundo parcial Prog IV</p>
          </Link>
        </div>
        <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {nav.filter((i) => !i.admin || user?.rol === "admin").map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b bg-white px-4 py-3 md:px-6">
          <div />
          <div className="flex items-center gap-3 text-sm">
            <Link href="/perfil" className="text-muted-foreground hover:text-foreground">{user.nombre} ({user.rol})</Link>
            <LogoutButton />
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
