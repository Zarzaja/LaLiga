"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Team } from "@/app/admin/teams/page";

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  status: 'pending' | 'finished';
  homeGoals: number | null;
  awayGoals: number | null;
  officialMvp: string | null;
  validMvpVotes: string[];
}

export interface Matchday {
  id: string;
  name: string;
  createdAt: number;
  matches: Match[];
}

const emptyMatch = (id: string): Match => ({
  id, homeTeam: "", awayTeam: "", kickoffTime: "",
  status: "pending", homeGoals: null, awayGoals: null, officialMvp: null, validMvpVotes: []
});

export default function MatchdaysAdminPage() {
  const [matchdays, setMatchdays] = useState<Matchday[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newMatchdayName, setNewMatchdayName] = useState("");
  const [newMatches, setNewMatches] = useState<Match[]>([
    emptyMatch("m1"), emptyMatch("m2"), emptyMatch("m3")
  ]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [mdSnap, tSnap] = await Promise.all([
        getDocs(query(collection(db, "matchdays"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "teams"), orderBy("name", "asc")))
      ]);
      const mds: Matchday[] = [];
      mdSnap.forEach(d => mds.push({ id: d.id, ...d.data() } as Matchday));
      setMatchdays(mds);

      const tList: string[] = [];
      tSnap.forEach(d => {
        const n = (d.data() as any).name;
        if (n) tList.push(n);
      });
      setTeams(tList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreateMatchday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatchdayName) return;
    
    for (const m of newMatches) {
      if (!m.homeTeam || !m.awayTeam || !m.kickoffTime) {
        alert("Rellena todos los datos de los 3 partidos.");
        return;
      }
    }

    try {
      await addDoc(collection(db, "matchdays"), {
        name: newMatchdayName,
        createdAt: Date.now(),
        matches: newMatches
      });
      setNewMatchdayName("");
      setNewMatches([emptyMatch("m1"), emptyMatch("m2"), emptyMatch("m3")]);
      fetchAll();
    } catch (err) {
      console.error("Error creating matchday", err);
    }
  };

  const teamOptions = teams.length > 0
    ? teams
    : ["Alavés", "Athletic Club", "Atlético de Madrid", "Barcelona", "Real Madrid", "Valencia", "Sevilla"]; // fallback mínimo

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-bold mb-8">Gestión de Jornadas</h1>
      
      <section className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 border-b border-slate-700 pb-2">
          <h2 className="text-xl font-semibold">Crear Nueva Jornada</h2>
          {teams.length === 0 && (
            <Link
              href="/admin/teams"
              className="inline-flex self-start sm:self-auto items-center gap-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              ⚠️ Aún no hay equipos — configúralos aquí
            </Link>
          )}
        </div>
        
        <form onSubmit={handleCreateMatchday} className="space-y-8">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Nombre de la Jornada</label>
            <input
              type="text"
              required
              placeholder="Ej. Jornada 1"
              className="w-full md:w-1/3 rounded-lg bg-slate-900 border border-slate-600 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={newMatchdayName}
              onChange={e => setNewMatchdayName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {newMatches.map((match, index) => (
              <div key={match.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <h3 className="font-medium text-indigo-400 mb-4">Partido {index + 1}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Local</label>
                    <select
                      required
                      className="w-full rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white"
                      value={match.homeTeam}
                      onChange={e => {
                        const m = [...newMatches];
                        m[index].homeTeam = e.target.value;
                        setNewMatches(m);
                      }}
                    >
                      <option value="">Selecciona equipo</option>
                      {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Visitante</label>
                    <select
                      required
                      className="w-full rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white"
                      value={match.awayTeam}
                      onChange={e => {
                        const m = [...newMatches];
                        m[index].awayTeam = e.target.value;
                        setNewMatches(m);
                      }}
                    >
                      <option value="">Selecciona equipo</option>
                      {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha y Hora</label>
                    <input
                      type="datetime-local"
                      required
                      className="w-full rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white"
                      value={match.kickoffTime}
                      onChange={e => {
                        const m = [...newMatches];
                        m[index].kickoffTime = e.target.value;
                        setNewMatches(m);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Guardar Jornada
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-6">Jornadas Existentes</h2>
        {loading ? (
          <p className="text-slate-400 animate-pulse">Cargando...</p>
        ) : matchdays.length === 0 ? (
          <p className="text-slate-400 italic">No hay jornadas creadas.</p>
        ) : (
          <div className="space-y-6">
            {matchdays.map(md => (
              <div key={md.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">{md.name}</h3>
                  <span className="text-xs text-slate-400">Creada el {new Date(md.createdAt).toLocaleDateString()}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {md.matches.map((m, i) => (
                    <div key={m.id} className="bg-slate-900 rounded-lg p-4 border border-slate-700 flex flex-col">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-400">P{i + 1}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${m.status === 'finished' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {m.status === 'finished' ? 'Finalizado' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{m.homeTeam} vs {m.awayTeam}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(m.kickoffTime).toLocaleString()}</p>
                      
                      {m.status === 'finished' && (
                        <div className="mt-3 pt-3 border-t border-slate-700 text-sm space-y-0.5">
                          <p><span className="text-slate-400">Resultado:</span> <strong className="text-white">{m.homeGoals} - {m.awayGoals}</strong></p>
                          <p><span className="text-slate-400">MVP:</span> <span className="text-slate-200">{m.officialMvp}</span></p>
                        </div>
                      )}
                      
                      <Link 
                        href={`/admin/matchdays/close/${md.id}/${m.id}`}
                        className={`mt-4 block text-center text-xs rounded px-3 py-2 transition-colors font-medium ${
                          m.status === 'pending'
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            : 'bg-slate-700 hover:bg-slate-600 text-indigo-200 border border-slate-600'
                        }`}
                      >
                        {m.status === 'pending' ? 'Cerrar / Editar' : '✏️ Editar Partido'}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
