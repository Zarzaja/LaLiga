"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LA_LIGA_26_27_SEED } from "@/lib/teamsSeed";

export interface Team {
  id: string;
  name: string;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "teams"), orderBy("name", "asc"));
      const snap = await getDocs(q);
      const data: Team[] = [];
      snap.forEach(d => data.push({ id: d.id, name: (d.data() as any).name } as Team));
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
      await addDoc(collection(db, "teams"), { name: newTeamName.trim() });
      setNewTeamName("");
      await fetchTeams();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "teams", id), { name: editingName.trim() });
      setEditingId(null);
      setEditingName("");
      await fetchTeams();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("⚠️ Borrar este equipo? No afectará a jornadas ya creadas (solo a las nuevas que crees). Continuar?")) {
      return;
    }
    setSaving(true);
    try {
      await deleteDoc(doc(db, "teams", id));
      await fetchTeams();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Equipos</h1>
          <p className="text-sm text-slate-400 mt-1">
            Añade, edita o borra equipos. Útil para incluir selecciones, Copa del Rey o cambios de última hora.
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={loading || saving}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          🚀 Cargar LaLiga 26/27 (20 eq)
        </button>
      </div>

      {/* Añadir equipo */}
      <section className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl mb-8">
        <h2 className="text-lg font-semibold mb-4 border-b border-slate-700 pb-2">Añadir Equipo Nuevo</h2>
        <form onSubmit={handleAdd} className="flex gap-3 flex-col sm:flex-row">
          <input
            type="text"
            required
            placeholder="Ej. Real Unión, Selección Española, Manchester City..."
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            className="flex-1 rounded-lg bg-slate-900 border border-slate-600 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 font-semibold text-white transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Añadir"}
          </button>
        </form>
      </section>

      {/* Lista */}
      <section className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Nombre</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-slate-400 animate-pulse">
                    Cargando equipos...
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-slate-400">
                    No hay equipos guardados. Pulsa arriba <strong>"Cargar LaLiga 26/27"</strong> o añade uno manualmente.
                  </td>
                </tr>
              ) : (
                teams.map(t => (
                  <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4 text-right">
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
                              onClick={() => { setEditingId(null); setEditingName(""); }}
                              className="text-slate-400 hover:text-slate-300 text-xs font-semibold"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditingId(t.id); setEditingName(t.name); }}
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
