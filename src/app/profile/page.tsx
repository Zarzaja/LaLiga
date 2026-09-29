"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth, UserProfile } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { doc, setDoc, collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { compressImage } from "@/lib/imageCompression";

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();

  const [teamName, setTeamName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [shieldBase64, setShieldBase64] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (profile) {
      setTeamName(profile.teamName);
      setPlayerName(profile.playerName);
      setShieldBase64(profile.teamShield);
    }
  }, [user, profile, loading, router]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImage(file);
      setShieldBase64(compressedDataUrl);
    } catch (err) {
      setError("Error al procesar la imagen.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setError("");

    try {
      // Comprobar si debemos hacerlo admin (si no hay usuarios, o su email es el configurado)
      let isAdmin = false;
      
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      if (adminEmail && user.email === adminEmail) {
        isAdmin = true;
      } else {
        // Chequear si es el primer usuario
        const usersSnapshot = await getDocs(query(collection(db, "users"), limit(1)));
        if (usersSnapshot.empty) {
          isAdmin = true;
        } else if (profile?.isAdmin) {
          isAdmin = true; // Mantener si ya lo era
        }
      }

      const userData: UserProfile = {
        teamName,
        playerName,
        teamShield: shieldBase64,
        isAdmin,
      };

      await setDoc(doc(db, "users", user.uid), userData);
      await refreshProfile();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Error al guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  if (loading || (!user && !loading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-slate-800 p-8 shadow-2xl border border-slate-700">
        <h2 className="mb-6 text-center text-3xl font-bold text-white">Configura tu Equipo</h2>
        
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 p-3 text-sm text-red-400 border border-red-500/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          
          <div className="flex flex-col items-center gap-4">
            <div 
              className="group relative flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-dashed border-slate-600 bg-slate-700 hover:border-indigo-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {shieldBase64 ? (
                <img src={shieldBase64} alt="Escudo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-center text-xs text-slate-400 group-hover:text-indigo-400">
                  Subir<br/>Escudo
                </span>
              )}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageChange}
            />
            <p className="text-xs text-slate-500">La imagen se ajustará y comprimirá automáticamente.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Nombre del Equipo</label>
            <input
              type="text"
              required
              placeholder="Ej. Real Barriles FC"
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="mb-1 block text-sm text-slate-400">Tu Apodo / Nombre</label>
            <input
              type="text"
              required
              placeholder="Ej. Jose"
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={saving || !shieldBase64 || !teamName || !playerName}
            className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : "Guardar Perfil"}
          </button>
        </form>
      </div>
    </main>
  );
}
