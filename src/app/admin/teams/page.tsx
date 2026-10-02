"use client";

import { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LA_LIGA_26_27_SEED } from "@/lib/teamsSeed";
import { compressImage } from "@/lib/imageCompression";

export interface Team {
  id: string;
  name: string;
  shield?: string;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamShield, setNewTeamShield] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingShield, setEditingShield] = useState<string>("");
  const fileInputAddRef = useRef<HTMLInputElement | null>(null);
  const fileInputEditRef = useRef<HTMLInputElement | null>(null);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "teams"), orderBy("name", "asc"));
      const snap = await getDocs(q);
      const data: Team[] = [];
      snap.forEach(d => {
        const raw = d.data() as any;
        data.push({ id: d.id, name: raw.name || "", shield: raw.shield || undefined });
      });
      setTeams(data);
    } catch (err) {
      console.error(err);
      alert("Error cargando equipos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleShieldFile = async (
    file: File,
    setter: (b64: string) => void
  ) => {
    setSaving(true);
    try {
      const b64 = await compressImage(file);
      setter(b64);
    } catch (e) {
      alert("Error al procesar la imagen: " + (e as any).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    if (!confirm("Esto añadirá automáticamente los 20 equipos de LaLiga 26/27 que falten (no duplica nombres). Continuar?")) {
      return;
    }
    setSaving(true);
    try {
      const currentNames = new Set(teams.map(t => t.name.toLowerCase()));
      for (const n of LA_LIGA_26_27_SEED) {
        if (!currentNames.has(n.toLowerCase())) {
          await addDoc(collection(db, "teams"), { name: n });
          currentNames.add(n.toLowerCase());
        }
      }
      await fetchTeams();
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setSaving(true);
    try {
      const payload: any = { name: newTeamName.trim() };
      if (newTeamShield) payload.shield = newTeamShield;
      await addDoc(collection(db, "teams"), payload);
      setNewTeamName("");
      setNewTeamShield("");
      if (fileInputAddRef.current) fileInputAddRef.current.value = "";
      await fetchTeams();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setSaving(true);
    try {
      const payload: any = { name: editingName.trim() };
      if (editingShield) payload.shield = editingShield;
      await updateDoc(doc(db, "teams", id), payload);
      setEditingId(null);
      setEditingName("");
      setEditingShield("");
      await fetchTeams();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("⚠️ Borrar este equipo? No afectará a jornadas ya creadas (solo a las nuevas). Continuar?")) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "teams", id));
      await fetchTeams();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Equipos y Escudos</h1>
          <p className="text-sm text-slate-400 mt-1">
            Añade, edita o borra equipos y sus escudos (PNG/JPG). Las imágenes se comprimen automáticamente a WebP 200×200 px.
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={loading || saving}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 whitespace-nowrap self-start md:self-auto"
        >
          🚀 Cargar LaLiga 26/27 (20 eq)
        </button>
      </div>

      {/* Añadir equipo */}
      <section className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl mb-8">
        <h2 className="text-lg font-semibold mb-4 border-b border-slate-700 pb-2">Añadir Equipo Nuevo</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs text-slate-400 mb-1">Nombre del Equipo</label>
            <input
              type="text"
              required
              placeholder="Ej. Real Unión, Selección Española..."
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs text-slate-400 mb-1">Escudo (PNG/JPG)</label>
            <input
              ref={fileInputAddRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async e => {
                const f = e.target.files?.[0];
                if (f) await handleShieldFile(f, setNewTeamShield);
              }}
              className="block w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-indigo-400 hover:file:bg-slate-600"
            />
          </div>
          <div className="md:col-span-1 flex items-center justify-center">
            {newTeamShield ? (
              <img src={newTeamShield} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-slate-600 bg-slate-900" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-700/60 border border-dashed border-slate-600 text-slate-500 text-xs flex items-center justify-center text-center leading-tight">Sin escudo</div>
            )}
          </div>
          <div className="md:col-span-2 flex gap-2">
            {newTeamShield && (
              <button
                type="button"
                onClick={() => { setNewTeamShield(""); if (fileInputAddRef.current) fileInputAddRef.current.value = ""; }}
                className="px-3 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-slate-200"
              >
                Quitar
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 font-semibold text-white transition-colors disabled:opacity-50"
            >
              {saving ? "..." : "Añadir"}
            </button>
          </div>
        </form>
      </section>

      {/* Lista */}
      <section className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 md:px-6 py-4 font-semibold w-20">Escudo</th>
                <th className="px-4 md:px-6 py-4 font-semibold">Nombre</th>
                <th className="px-4 md:px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-slate-400 animate-pulse">Cargando equipos...</td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-slate-400">
                    No hay equipos. Pulsa arriba <strong>"Cargar LaLiga 26/27"</strong> o añade uno manualmente.
                  </td>
                </tr>
              ) : (
                teams.map(t => (
                  <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 md:px-6 py-4">
                      {editingId === t.id ? (
                        <div className="flex flex-col items-center gap-2">
                          {editingShield ? (
                            <img src={editingShield} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-700/60 border border-dashed border-slate-600 text-slate-500 text-[10px] flex items-center justify-center leading-tight text-center">Sin</div>
                          )}
                          <input
                            ref={fileInputEditRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={async e => {
                              const f = e.target.files?.[0];
                              if (f) await handleShieldFile(f, setEditingShield);
                            }}
                            className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-slate-700 file:text-indigo-400"
                          />
                          {editingShield && (
                            <button
                              type="button"
                              onClick={() => { setEditingShield(""); if (fileInputEditRef.current) fileInputEditRef.current.value = ""; }}
                              className="text-[10px] text-red-400 hover:text-red-300"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                      ) : (
                        t.shield ? (
                          <img src={t.shield} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 shadow" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-700/60 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400 leading-tight text-center">Sin escudo</div>
                        )
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      {editingId === t.id ? (
                        <input
                          autoFocus
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          className="w-full rounded bg-slate-900 border border-slate-600 px-3 py-1.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="font-medium text-white">{t.name}</span>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-4">
                        {editingId === t.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(t.id)}
                              disabled={saving}
                              className="text-green-400 hover:text-green-300 text-xs font-semibold"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setEditingName(""); setEditingShield(""); }}
                              className="text-slate-400 hover:text-slate-300 text-xs font-semibold"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditingId(t.id); setEditingName(t.name); setEditingShield(t.shield || ""); }}
                              className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              disabled={saving}
                              className="text-red-400 hover:text-red-300 text-xs font-semibold"
                            >
                              Borrar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {teams.length > 0 && (
          <div className="bg-slate-900/40 px-6 py-3 text-xs text-slate-400 border-t border-slate-700">
            Total: <strong className="text-slate-200">{teams.length}</strong> equipos disponibles para nuevas jornadas.
          </div>
        )}
      </section>
    </div>
  );
}
