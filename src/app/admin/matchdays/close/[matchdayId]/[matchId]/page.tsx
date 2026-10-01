"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Matchday, Match } from "../../../page";

export default function CloseMatchPage({ params }: { params: Promise<{ matchdayId: string, matchId: string }> }) {
  const router = useRouter();
  const { matchdayId, matchId } = use(params);

  const [matchday, setMatchday] = useState<Matchday | null>(null);
  const [matchIndex, setMatchIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");
  const [officialMvp, setOfficialMvp] = useState("");
  
  const [uniqueMvpVotes, setUniqueMvpVotes] = useState<string[]>([]);
  const [selectedValidMvps, setSelectedValidMvps] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [matchdayId, matchId]);

  const fetchData = async () => {
    try {
      // Fetch matchday
      const mdDoc = await getDoc(doc(db, "matchdays", matchdayId));
      if (mdDoc.exists()) {
        const mdData = { id: mdDoc.id, ...mdDoc.data() } as Matchday;
        setMatchday(mdData);
        const idx = mdData.matches.findIndex((m: Match) => m.id === matchId);
        setMatchIndex(idx);
        
        if (idx !== -1) {
          const m = mdData.matches[idx];
          if (m.homeGoals !== null) setHomeGoals(m.homeGoals.toString());
          if (m.awayGoals !== null) setAwayGoals(m.awayGoals.toString());
          if (m.officialMvp) setOfficialMvp(m.officialMvp);
          
          const initialSelected: Record<string, boolean> = {};
          if (m.validMvpVotes) {
            m.validMvpVotes.forEach((v: string) => {
              initialSelected[v] = true;
            });
          }
          setSelectedValidMvps(initialSelected);
        }
      }

      // Fetch predictions to get MVP votes
      const q = query(collection(db, "predictions"), where("matchId", "==", matchId));
      const predSnap = await getDocs(q);
      const mvpSet = new Set<string>();
      predSnap.forEach(d => {
        const vote = d.data().mvpVote;
        if (vote) mvpSet.add(vote);
      });
      setUniqueMvpVotes(Array.from(mvpSet));
      
    } catch (err) {
      console.error(err);
      alert("Error cargando los datos del partido");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleValidMvp = (vote: string) => {
    setSelectedValidMvps(prev => ({
      ...prev,
      [vote]: !prev[vote]
    }));
  };

  const handleCloseMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchday || matchIndex === -1) return;
    if (homeGoals === "" || awayGoals === "" || !officialMvp.trim()) {
      alert("Debes rellenar todos los campos del resultado oficial.");
      return;
    }

    setSaving(true);
    try {
      const validVotesArray = Object.keys(selectedValidMvps).filter(k => selectedValidMvps[k]);
      
      const newMatches = [...matchday.matches];
      newMatches[matchIndex] = {
        ...newMatches[matchIndex],
        status: "finished",
        homeGoals: parseInt(homeGoals),
        awayGoals: parseInt(awayGoals),
        officialMvp: officialMvp.trim(),
        validMvpVotes: validVotesArray
      };

      await updateDoc(doc(db, "matchdays", matchday.id), {
        matches: newMatches
      });

      router.push("/admin/matchdays");
    } catch (err) {
      console.error(err);
      alert("Error al cerrar el partido.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !matchday || matchIndex === -1) {
    return <div className="p-6 text-slate-400">Cargando...</div>;
  }

  const match = matchday.matches[matchIndex];

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition-colors">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold">Cerrar Partido</h1>
      </div>
      
      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-xl">
        <div className="text-center mb-8 pb-6 border-b border-slate-700">
          <p className="text-indigo-400 text-sm font-semibold mb-2">{matchday.name}</p>
          <h2 className="text-3xl font-extrabold">{match.homeTeam} <span className="text-slate-500 font-light">vs</span> {match.awayTeam}</h2>
          <p className="text-slate-400 text-sm mt-2">{new Date(match.kickoffTime).toLocaleString()}</p>
        </div>

        <form onSubmit={handleCloseMatch} className="space-y-8">
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">1. Resultado Oficial</h3>
            <div className="flex justify-center gap-6">
              <div className="flex flex-col items-center">
                <label className="text-xs text-slate-400 mb-2">{match.homeTeam}</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="w-20 text-center rounded-lg bg-slate-900 border border-slate-600 p-3 text-2xl font-bold text-white focus:border-indigo-500 focus:outline-none"
                  value={homeGoals}
                  onChange={e => setHomeGoals(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-center">
                <span className="text-3xl text-slate-600 font-light pt-6">-</span>
              </div>
              <div className="flex flex-col items-center">
                <label className="text-xs text-slate-400 mb-2">{match.awayTeam}</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="w-20 text-center rounded-lg bg-slate-900 border border-slate-600 p-3 text-2xl font-bold text-white focus:border-indigo-500 focus:outline-none"
                  value={awayGoals}
                  onChange={e => setAwayGoals(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-700">
            <h3 className="text-lg font-semibold mb-4 text-white">2. MVP del Partido</h3>
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">Nombre oficial del MVP</label>
              <input
                type="text"
                required
                placeholder="Ej. Lamine Yamal"
                className="w-full rounded-lg bg-slate-900 border border-slate-600 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={officialMvp}
                onChange={e => setOfficialMvp(e.target.value)}
              />
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <p className="text-sm font-medium text-slate-300 mb-3">
                Validar respuestas de los usuarios
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Marca a continuación todas las variaciones que consideras válidas para el MVP que acabas de escribir. (Ignora las incorrectas).
              </p>
              
              {uniqueMvpVotes.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Nadie apostó MVP en este partido.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {uniqueMvpVotes.map(vote => (
                    <label key={vote} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                        checked={!!selectedValidMvps[vote]}
                        onChange={() => handleToggleValidMvp(vote)}
                      />
                      <span className="text-sm text-slate-200">{vote}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/30 disabled:opacity-50 mt-8"
          >
            {saving ? "Guardando y Cerrando..." : "Confirmar Cierre de Partido"}
          </button>
        </form>
      </div>
    </div>
  );
}
