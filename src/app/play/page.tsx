"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, query, orderBy, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, UserProfile } from "@/context/AuthContext";
import { Matchday, Match } from "@/app/admin/matchdays/page";
import Link from "next/link";

interface Prediction {
  userId: string;
  matchdayId: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  mvpVote: string;
}

interface UserPredictionWithProfile extends Prediction {
  userProfile?: UserProfile;
}

export default function PlayPage() {
  const { user, profile, loading } = useAuth();
  const [matchdays, setMatchdays] = useState<Matchday[]>([]);
  const [myPredictions, setMyPredictions] = useState<Record<string, Prediction>>({});
  const [otherPredictions, setOtherPredictions] = useState<Record<string, UserPredictionWithProfile[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  // States for inputs: { matchId: { homeGoals, awayGoals, mvpVote } }
  const [inputs, setInputs] = useState<Record<string, { homeGoals: string, awayGoals: string, mvpVote: string }>>({});

  useEffect(() => {
    if (!loading && user) {
      loadData();
    }
  }, [loading, user]);

  const loadData = async () => {
    setFetching(true);
    try {
      // 1. Fetch matchdays
      const q = query(collection(db, "matchdays"), orderBy("createdAt", "desc"));
      const mdSnap = await getDocs(q);
      const mds: Matchday[] = [];
      mdSnap.forEach(d => mds.push({ id: d.id, ...d.data() } as Matchday));
      setMatchdays(mds);

      // 2. Fetch my predictions
      if (user) {
        const pSnap = await getDocs(collection(db, "predictions"));
        const myPreds: Record<string, Prediction> = {};
        const others: Record<string, UserPredictionWithProfile[]> = {};
        const profilesCache: Record<string, UserProfile> = {};

        for (const d of pSnap.docs) {
          const pred = d.data() as Prediction;
          if (pred.userId === user.uid) {
            myPreds[pred.matchId] = pred;
          } else {
            // It's another user's prediction
            if (!others[pred.matchId]) others[pred.matchId] = [];
            
            // Get profile if not cached
            if (!profilesCache[pred.userId]) {
              const profDoc = await getDoc(doc(db, "users", pred.userId));
              if (profDoc.exists()) {
                profilesCache[pred.userId] = profDoc.data() as UserProfile;
              }
            }
            others[pred.matchId].push({ ...pred, userProfile: profilesCache[pred.userId] });
          }
        }
        
        setMyPredictions(myPreds);
        setOtherPredictions(others);

        // Populate inputs with my predictions
        const newInputs: Record<string, any> = {};
        mds.forEach(md => {
          md.matches.forEach(m => {
            const p = myPreds[m.id];
            newInputs[m.id] = {
              homeGoals: p ? p.homeGoals.toString() : "",
              awayGoals: p ? p.awayGoals.toString() : "",
              mvpVote: p ? p.mvpVote : ""
            };
          });
        });
        setInputs(newInputs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleSavePrediction = async (matchdayId: string, matchId: string) => {
    if (!user) return;
    const inp = inputs[matchId];
    if (inp.homeGoals === "" || inp.awayGoals === "" || !inp.mvpVote.trim()) {
      alert("Por favor, rellena los goles de ambos equipos y el MVP.");
      return;
    }

    setSavingId(matchId);
    try {
      const pred: Prediction = {
        userId: user.uid,
        matchdayId,
        matchId,
        homeGoals: parseInt(inp.homeGoals),
        awayGoals: parseInt(inp.awayGoals),
        mvpVote: inp.mvpVote.trim().toLowerCase()
      };
      await setDoc(doc(db, "predictions", `${user.uid}_${matchId}`), pred);
      setMyPredictions(prev => ({ ...prev, [matchId]: pred }));
    } catch (err) {
      alert("Error al guardar predicción");
    } finally {
      setSavingId(null);
    }
  };

  const updateInput = (matchId: string, field: string, value: string) => {
    setInputs(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value }
    }));
  };

  if (loading || fetching) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 p-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Debes iniciar sesión para jugar</h2>
        <Link href="/login" className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white">Ir a Login</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Jornadas Activas</h1>
          <Link href="/profile" className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-700">Mi Perfil</Link>
        </div>

        {matchdays.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
            <p className="text-slate-400">Aún no hay jornadas creadas.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {matchdays.map(md => (
              <section key={md.id} className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-4">{md.name}</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {md.matches.map((m, i) => {
                    const isPast = new Date() >= new Date(m.kickoffTime);
                    const inp = inputs[m.id] || { homeGoals: "", awayGoals: "", mvpVote: "" };
                    const hasPredicted = !!myPredictions[m.id];
                    const others = otherPredictions[m.id] || [];

                    return (
                      <div key={m.id} className={`rounded-xl p-5 border ${isPast ? 'bg-slate-800/80 border-slate-700' : 'bg-indigo-900/20 border-indigo-500/30'} flex flex-col relative overflow-hidden`}>
                        {isPast && (
                          <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                            Cerrado
                          </div>
                        )}
                        
                        <div className="text-center mb-4 mt-2">
                          <p className="text-xs text-slate-400 mb-1">{new Date(m.kickoffTime).toLocaleString()}</p>
                          <div className="flex items-center justify-center gap-3 font-bold text-lg">
                            <span className="flex-1 text-right">{m.homeTeam}</span>
                            <span className="text-slate-500">vs</span>
                            <span className="flex-1 text-left">{m.awayTeam}</span>
                          </div>
                        </div>

                        {/* Input Area */}
                        <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                          <div className="flex justify-center gap-4 mb-4">
                            <input
                              type="number"
                              min="0"
                              disabled={isPast || savingId === m.id}
                              className="w-16 text-center rounded-md bg-slate-800 border border-slate-600 p-2 text-xl font-bold text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                              value={inp.homeGoals}
                              onChange={e => updateInput(m.id, "homeGoals", e.target.value)}
                            />
                            <span className="text-2xl text-slate-500 font-light">-</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isPast || savingId === m.id}
                              className="w-16 text-center rounded-md bg-slate-800 border border-slate-600 p-2 text-xl font-bold text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                              value={inp.awayGoals}
                              onChange={e => updateInput(m.id, "awayGoals", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1 text-center">MVP del Partido</label>
                            <input
                              type="text"
                              disabled={isPast || savingId === m.id}
                              placeholder="Ej. Lamine Yamal"
                              className="w-full text-center rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                              value={inp.mvpVote}
                              onChange={e => updateInput(m.id, "mvpVote", e.target.value)}
                            />
                          </div>
                        </div>

                        {!isPast && (
                          <button
                            onClick={() => handleSavePrediction(md.id, m.id)}
                            disabled={savingId === m.id}
                            className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                              hasPredicted 
                                ? "bg-slate-700 text-white hover:bg-slate-600 border border-slate-600" 
                                : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                            } disabled:opacity-50`}
                          >
                            {savingId === m.id ? "Guardando..." : hasPredicted ? "Actualizar Predicción" : "Guardar Predicción"}
                          </button>
                        )}

                        {/* Predicciones de amigos (sólo si ha pasado la hora) */}
                        {isPast && (
                          <div className="mt-4 border-t border-slate-700 pt-4">
                            <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Predicciones de amigos</h4>
                            {others.length === 0 ? (
                              <p className="text-xs text-slate-500 italic">Nadie más ha apostado.</p>
                            ) : (
                              <ul className="space-y-2">
                                {others.map(op => (
                                  <li key={op.userId} className="flex items-center justify-between bg-slate-900 rounded p-2 text-xs">
                                    <div className="flex items-center gap-2">
                                      {op.userProfile?.teamShield && (
                                        <img src={op.userProfile.teamShield} alt="" className="w-5 h-5 rounded-full object-cover" />
                                      )}
                                      <span className="text-slate-300 truncate max-w-[80px]" title={op.userProfile?.playerName}>
                                        {op.userProfile?.playerName || "Usuario"}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <span className="font-bold text-white">{op.homeGoals} - {op.awayGoals}</span>
                                      <span className="text-[10px] text-slate-500 truncate max-w-[80px]" title={op.mvpVote}>{op.mvpVote}</span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
