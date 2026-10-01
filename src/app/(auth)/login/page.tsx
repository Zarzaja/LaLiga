"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: any) {
      const code = err?.code;
      if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
        setError("Email o contraseña incorrectos.");
      } else {
        setError("Error al iniciar sesión. Revisa los datos.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Introduce tu email arriba y pulsa aquí para recuperar la contraseña.");
      return;
    }
    setResetLoading(true);
    setError("");
    setMessage("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage(`¡Correo enviado! Revisa tu bandeja de entrada (y spam) de ${email} para restablecer la contraseña.`);
    } catch (err: any) {
      setError("No se pudo enviar el correo. Revisa que el email sea correcto.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 p-8 shadow-2xl border border-slate-700">
        <h2 className="mb-6 text-center text-3xl font-bold text-white">Iniciar Sesión</h2>
        
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 p-3 text-sm text-red-400 border border-red-500/50">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-lg bg-emerald-500/20 p-3 text-sm text-emerald-400 border border-emerald-500/50">
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Contraseña</label>
            <input
              type="password"
              required
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetLoading}
            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline disabled:opacity-50"
          >
            {resetLoading ? "Enviando correo..." : "¿Has olvidado la contraseña?"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-indigo-400 hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}
