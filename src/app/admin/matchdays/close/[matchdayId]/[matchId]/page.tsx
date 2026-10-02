"use client";

import { useState, useEffect } from "react";
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Matchday, Match } from "../../../page";

const computeMatchPoints = (
  predGoals: { home: number; away: number },
  realGoals: { home: number; away: number },
  predMvpLower: string,
  validMvpVotesLower: string[]
): { exact: number; sign: number; mvp: number } => {
  let exact = 0;
  let sign = 0;
  let mvp = 0;

  if (predGoals.home === realGoals.home && predGoals.away === realGoals.away) {
    exact = 3;
  } else {
    const predSign = predGoals.home > predGoals.away ? "1" : predGoals.home < predGoals.away ? "2" : "X";
    const realSign = realGoals.home > realGoals.away ? "1" : realGoals.home < realGoals.away ? "2" : "X";
    if (predSign === realSign) sign = 1;
  }

  if (predMvpLower && validMvpVotesLower.includes(predMvpLower)) {
    mvp = 1;
  }

  return { exact, sign, mvp };
};

export default function EditMatchPage({ params }: { params: Promise<{ matchdayId: string, matchId: string }> }) {
  const router = useRouter();
  const { matchdayId, matchId } = use(params);

  const [matchday, setMatchday] = useState<Matchday | null>(null);
  const [matchIndex, setMatchIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<string[]>([]);

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [kickoffTime, setKickoffTime] = useState("");
  const [status, setStatus] = useState<"pending" | "finished">("pending");
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");
  const [officialMvp, setOfficialMvp] = useState("");

  const [uniqueMvpVotes, setUniqueMvpVotes] = useState<string[]>([]);
  const [selectedValidMvps, setSelectedValidMvps] = useState<Record<string, boolean>>({});
  const [customMvpInput, setCustomMvpInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [recalcMessage, setRecalcMessage] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [matchdayId, matchId]);

  const fetchData = async () => {
    try {
      const [mdDoc, tSnap, predSnap] = await Promise.all([
        getDoc(doc(db, "matchdays", matchdayId)),
        getDocs(query(collection(db, "teams"), orderBy("name", "asc"))),
        getDocs(query(collection(db, "predictions"), where("matchId", "==", matchId)))
      ]);

      const tList: string[] = [];
      tSnap.forEach(d => {
        const n = (d.data() as any).name;
        if (n) tList.push(n);
      });
      setTeams(tList);

      if (mdDoc.exists()) {
        const mdData = { id: mdDoc.id, ...mdDoc.data() } as Matchday;
        setMatchday(mdData);
        const idx = mdData.matches.findIndex((m: Match) => m.id === matchId);
        setMatchIndex(idx);

        if (idx !== -1) {
          const m = mdData.matches[idx];
          setHomeTeam(m.homeTeam);
          setAwayTeam(m.awayTeam);
          setKickoffTime(m.kickoffTime);
          setStatus(m.status);
          if (m.homeGoals !== null) setHomeGoals(m.homeGoals.toString());
          if (m.awayGoals !== null) setAwayGoals(m.awayGoals.toString());
          if (m.officialMvp) setOfficialMvp(m.officialMvp);

          const initialSelected: Record<string, boolean> = {};
          if (m.validMvpVotes) {
            m.validMvpVotes.forEach((v: string) => { initialSelected[v] = true; });
          }
          setSelectedValidMvps(initialSelected);
        }
      }

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
    setSelectedValidMvps(prev => ({ ...prev, [vote]: !prev[vote] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchday || matchIndex === -1) return;
    if (!homeTeam.trim() || !awayTeam.trim() || !kickoffTime) {
      alert("Rellena equipo local, visitante y fecha/hora.");
      return;
    }
    if (status === "finished") {
      if (homeGoals === "" || awayGoals === "" || !officialMvp.trim()) {
        alert("Si el partido está Finalizado, rellena goles y MVP oficial.");
        return;
      }
    }

    setSaving(true);
    setRecalcMessage("");
    try {
      const validVotesArray = Object.keys(selectedValidMvps).filter(k => selectedValidMvps[k]);
      const newMatches = [...matchday.matches];
      newMatches[matchIndex] = {
        ...newMatches[matchIndex],
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        kickoffTime,
        status,
        homeGoals: status === "finished" ? parseInt(homeGoals) : null,
        awayGoals: status === "finished" ? parseInt(awayGoals) : null,
        officialMvp: status === "finished" ? officialMvp.trim() : null,
        validMvpVotes: status === "finished" ? validVotesArray : []
      };

      const batch = writeBatch(db);
      batch.update(doc(db, "matchdays", matchday.id), { matches: newMatches });

      let processedCount = 0;
      if (status === "finished") {
        const validVotesLower = validVotesArray.map(v => v.toLowerCase());
        const realHome = parseInt(homeGoals);
        const realAway = parseInt(awayGoals);

        const predSnap = await getDocs(query(collection(db, "predictions"), where("matchId", "==", matchId)));
        predSnap.forEach(predDoc => {
          const d = predDoc.data();
          const { exact, sign, mvp } = computeMatchPoints(
            { home: d.homeGoals ?? 0, away: d.awayGoals ?? 0 },
            { home: realHome, away: realAway },
            (d.mvpVote || "").toLowerCase(),
            validVotesLower
          );
          const total = exact + sign + mvp;
          batch.update(predDoc.ref, {
            pointsExact: exact,
            pointsSign: sign,
            pointsMvp: mvp,
            pointsTotal: total
          });
          processedCount++;
        });
      }

      if (processedCount > 490) {
        throw new Error("Batch cerca de límite 500; se requiere lote adicional.");
      }

      await batch.commit();
      setRecalcMessage(
        status === "finished"
          ? `✔ Guardado correctamente. Puntos recalculados en ${processedCount} predicciones.`
          : "✔ Partido actualizado correctamente."
      );
      setTimeout(() => router.push("/admin/matchdays"), 1200);
    } catch (err: any) {
      console.error(err);
      alert("Error al guardar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !matchday || matchIndex === -1) {
    return <div className="p-6 text-slate-400">Cargando...</div>;
  }

  const match = matchday.matches[matchIndex];
  const wasFinished = match.status === "finished";
  const teamOptions = teams.length > 0 ? teams : [homeTeam, awayTeam, "Alavés", "Barcelona", "Real Madrid"];

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition-colors">
          ← Volver
        </button>
        <div>
          <h1 className="text-2xl font-bold">
            {wasFinished ? "✏️ Editar Partido (disputado)" : "✏️ Editar / Cerrar Partido"}
          </h1>
          <p className="text-xs text-slate-400">
            Cambia cualquier campo. Si lo guardas como <strong className="text-emerald-300">Finalizado</strong>, se recalculan TODOS los puntos de las predicciones.
          </p>
        </div>
      </div>

      <div className="bg-slate-800 p-6 md:p-8 rounded-xl border border-slate-700 shadow-xl">
        <div className="text-center mb-8 pb-6 border-b border-slate-700">
          <p className="text-indigo-400 text-sm font-semibold mb-2">{matchday.name}</p>
          <p className="text-xs text-slate-400 mb-3">Estado actual: {wasFinished ? "Finalizado" : "Pendiente"}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">1. Datos del Partido</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 items-end">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Equipo Local</label>
                <select
                  required
                  value={homeTeam}
                  onChange={e => setHomeTeam(e.target.value)}
                  className="w-full rounded-md bg-slate-900 border border-slate-600 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Selecciona</option>
                  {Array.from(new Set([...teamOptions, homeTeam, awayTeam])).sort().map(t =>
                    <option key={t} value={t}>{t}</option>
                  )}
                </select>
                <div className="mt-1.5">
                  <input
                    type="text"
                    placeholder="O escribe uno nuevo (Copa, selección...)"
                    value={homeTeam}
                    onChange={e => setHomeTeam(e.target.value)}
                    className="w-full rounded-md bg-slate-900/60 border border-dashed border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-center items-center pb-10 text-slate-500 font-light text-2xl">
                vs
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Equipo Visitante</label>
                <select
                  required
                  value={awayTeam}
                  onChange={e => setAwayTeam(e.target.value)}
                  className="w-full rounded-md bg-slate-900 border border-slate-600 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Selecciona</option>
                  {Array.from(new Set([...teamOptions, homeTeam, awayTeam])).sort().map(t =>
                    <option key={t} value={t}>{t}</option>
                  )}
                </select>
                <div className="mt-1.5">
                  <input
                    type="text"
                    placeholder="O escribe uno nuevo..."
                    value={awayTeam}
                    onChange={e => setAwayTeam(e.target.value)}
                    className="w-full rounded-md bg-slate-900/60 border border-dashed border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Fecha y Hora de Inicio (bloquea predicciones)</label>
                <input
                  type="datetime-local"
                  required
                  value={kickoffTime}
                  onChange={e => setKickoffTime(e.target.value)}
                  className="w-full rounded-md bg-slate-900 border border-slate-600 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Estado</label>
                <div className="flex gap-2">
                  <label className={`flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                    status === "pending"
                      ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-300 font-semibold"
                      : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-700/40"
                  }`}>
                    <input type="radio" className="hidden" checked={status === "pending"} onChange={() => setStatus("pending")} />
                    Pendiente
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                    status === "finished"
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold"
                      : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-700/40"
                  }`}>
                    <input type="radio" className="hidden" checked={status === "finished"} onChange={() => setStatus("finished")} />
                    ✔ Finalizado
                  </label>
                </div>
              </div>
            </div>
          </div>

          {status === "finished" && (
            <>
              <div className="pt-6 border-t border-slate-700">
                <h3 className="text-lg font-semibold mb-4 text-white">2. Resultado Oficial</h3>
                <div className="flex justify-center gap-6">
                  <div className="flex flex-col items-center">
                    <label className="text-xs text-slate-400 mb-2 max-w-[120px] truncate" title={homeTeam}>{homeTeam || "Local"}</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={homeGoals}
                      onChange={e => setHomeGoals(e.target.value)}
                      className="w-20 text-center rounded-lg bg-slate-900 border border-slate-600 p-3 text-2xl font-bold text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-3xl text-slate-600 font-light pt-6">-</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="text-xs text-slate-400 mb-2 max-w-[120px] truncate" title={awayTeam}>{awayTeam || "Visitante"}</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={awayGoals}
                      onChange={e => setAwayGoals(e.target.value)}
                      className="w-20 text-center rounded-lg bg-slate-900 border border-slate-600 p-3 text-2xl font-bold text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-700">
                <h3 className="text-lg font-semibold mb-4 text-white">3. MVP del Partido (+1 punto extra)</h3>
                <div className="mb-6">
                  <label className="block text-sm text-slate-400 mb-2">Nombre oficial del MVP (requerido)</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Ej. Lamine Yamal"
                      value={officialMvp}
                      onChange={e => setOfficialMvp(e.target.value)}
                      className="flex-1 rounded-lg bg-slate-900 border border-slate-600 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      disabled={!officialMvp.trim()}
                      onClick={() => {
                        const name = officialMvp.trim();
                        if (!name) return;
                        setUniqueMvpVotes(prev => prev.includes(name) ? prev : [...prev, name]);
                        setSelectedValidMvps(prev => ({ ...prev, [name]: true }));
                      }}
                      className="rounded-lg bg-indigo-600/80 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 text-sm font-bold text-white whitespace-nowrap transition-colors"
                    >
                      ✅ Validar este como MVP
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    💡 <strong>Pulsa "Validar este como MVP"</strong> para añadir automáticamente el nombre oficial a la lista de respuestas válidas (así aunque nadie lo escriba exactamente igual, o no haya apuestas todavía, el cálculo de puntos funcionará).
                  </p>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium text-slate-300">Variaciones válidas del MVP (marcadas con ✓ suman +1 punto)</p>
                      <p className="text-xs text-slate-500">
                        Lista de todos los nombres que han escrito los usuarios, más los que añadas manualmente.
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Añadir variación manual..."
                        value={customMvpInput}
                        onChange={e => setCustomMvpInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const name = customMvpInput.trim();
                            if (!name) return;
                            setUniqueMvpVotes(prev => prev.includes(name) ? prev : [...prev, name]);
                            setSelectedValidMvps(prev => ({ ...prev, [name]: true }));
                            setCustomMvpInput("");
                          }
                        }}
                        className="flex-1 sm:w-56 rounded-md bg-slate-900 border border-slate-600 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={!customMvpInput.trim()}
                        onClick={() => {
                          const name = customMvpInput.trim();
                          if (!name) return;
                          setUniqueMvpVotes(prev => prev.includes(name) ? prev : [...prev, name]);
                          setSelectedValidMvps(prev => ({ ...prev, [name]: true }));
                          setCustomMvpInput("");
                        }}
                        className="rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-bold text-slate-200 whitespace-nowrap"
                      >
                        ➕ Añadir
                      </button>
                    </div>
                  </div>

                  {Object.keys(selectedValidMvps).length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {Object.keys(selectedValidMvps).filter(k => selectedValidMvps[k]).map(v => (
                        <span
                          key={`valid-${v}`}
                          className="inline-flex items-center gap-2 bg-emerald-500/15 text-emerald-300 text-xs font-bold rounded-full px-3 py-1 border border-emerald-500/30"
                        >
                          ✓ {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {uniqueMvpVotes.length === 0 ? (
                    <p className="text-sm text-slate-500 italic bg-slate-950/60 border border-dashed border-slate-700 rounded p-3">
                      Aún no hay votos de MVP de usuarios. Usa <strong>"Validar este como MVP"</strong> arriba o añade variaciones manuales con el botón <strong>➕ Añadir</strong>.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {uniqueMvpVotes.map(vote => (
                        <label
                          key={vote}
                          className={`flex items-center gap-3 p-2.5 rounded cursor-pointer transition-colors border ${
                            selectedValidMvps[vote]
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : "hover:bg-slate-800 border-transparent"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                            checked={!!selectedValidMvps[vote]}
                            onChange={() => handleToggleValidMvp(vote)}
                          />
                          <span className="text-sm text-slate-200">{vote}</span>
                          {selectedValidMvps[vote] && (
                            <span className="ml-auto text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
                              válido +1pt
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {recalcMessage && (
            <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-4 py-3 text-emerald-300 text-sm font-medium">
              {recalcMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/30 disabled:opacity-50 mt-6"
          >
            {saving
              ? (status === "finished" ? "Guardando y recalculando puntos..." : "Guardando...")
              : (status === "finished"
                ? (wasFinished ? "💾 Guardar cambios y recalcular puntos" : "✔ Cerrar partido y calcular puntos")
                : "💾 Guardar cambios")}
          </button>
        </form>
      </div>
    </div>
  );
}
