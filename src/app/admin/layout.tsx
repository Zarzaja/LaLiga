"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuth();

  const links = [
    { name: "Jornadas y Partidos", href: "/admin/matchdays" },
    { name: "Gestión de Equipos", href: "/admin/teams" },
    { name: "Gestión de Usuarios", href: "/admin/users" },
    { name: "Backup & Restore", href: "/admin/backup" },
  ];

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Panel Admin
            </h2>
            <p className="text-xs text-slate-400 mt-1">Porras La Liga</p>
          </div>
          
          <nav className="flex-1 p-4 flex flex-col gap-2">
            {links.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-500/20" 
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-slate-700">
            <Link 
              href="/" 
              className="flex items-center justify-center px-4 py-2 bg-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-600 transition-colors"
            >
              Volver a la App
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
