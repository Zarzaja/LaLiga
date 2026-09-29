"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function Home() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="w-full max-w-md rounded-2xl bg-slate-800/50 p-8 shadow-2xl backdrop-blur-lg border border-slate-700">
        <h1 className="mb-6 text-center text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
          Porras La Liga
        </h1>
        
        {user ? (
          <div className="flex flex-col items-center gap-6">
            <p className="text-center text-slate-300">
              ¡Bienvenido de vuelta, {profile?.playerName || user.email}!
            </p>
            {profile?.teamShield && (
              <img src={profile.teamShield} alt="Escudo de tu equipo" className="w-32 h-32 object-contain rounded-full border-4 border-indigo-500" />
            )}
            <div className="flex w-full gap-4">
              <Link 
                href="/profile" 
                className="w-full rounded-lg bg-slate-700 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-slate-600"
              >
                Mi Perfil
              </Link>
            </div>
            {profile?.isAdmin && (
              <div className="flex w-full mt-2">
                <Link 
                  href="/admin/matchdays" 
                  className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                >
                  Panel de Administración
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="mb-4 text-center text-slate-400">
              Demuestra a tus amigos quién sabe más de fútbol.
            </p>
            <Link 
              href="/login" 
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-center font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30"
            >
              Iniciar Sesión
            </Link>
            <Link 
              href="/register" 
              className="w-full rounded-lg bg-slate-700 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-slate-600"
            >
              Crear Cuenta
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
