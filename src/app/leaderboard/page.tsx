"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, UserProfile } from "@/context/AuthContext";
import { Matchday } from "@/app/admin/matchdays/page";
import Link from "next/link";

interface PredictionWithPoints {
  userId: string;
  matchdayId: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  mvpVote: string;
  pointsExact?: number;
  pointsSign?: number;
  pointsMvp?: number;
  pointsTotal?: number;
}

interface UserStanding {
  userId: string;
  profile?: UserProfile;
  totalPoints: number;
  exactCount: number;
  signCount: number;
  mvpCount: number;
  lastMatchdayPoints: number;
}

export default function LeaderboardPage() {
  const { loading: authLoading } = useAuth();
  const [matchdays, setMatchdays] = useState<Matchday[]>([]);
  const [predictions, setPredictions] = useState<PredictionWithPoints[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [selectedMatchdayId, setSelectedMatchdayId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const mdSnap = await getDocs(query(collection(db, "matchdays"), orderBy("createdAt", "asc")));
      const mds: Matchday[] = [];
      mdSnap.forEach(d => mds.push({ id: d.id, ...d.data() } as Matchday));
      setMatchdays(mds);

      const predSnap = await getDocs(collection(db, "predictions"));
      const preds: PredictionWithPoints[] = [];
      predSnap.forEach(d => preds.push(d.data() as PredictionWithPoints));
      setPredictions(preds);

      const userIds = Array.from(new Set(preds.map(p => p.userId)));
      const profMap: Record<string, UserProfile> = {};
      await Promise.all(
        userIds.map(async uid => {
          const snap = await getDoc(doc(db, "users", uid));
          if (snap.exists()) profMap[uid] = snap.data() as UserProfile;
        })
      );
      setProfiles(profMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const lastMatchdayId = useMemo(() => {
    if (matchdays.length === 0) return null;
    return [...matchdays].sort((a, b) => b.createdAt - a.createdAt)[0].id;
  }, [matchdays]);

  const standings = useMemo<UserStanding[]>(() => {
    const map: Record<string, UserStanding> = {};
    const userPreds = selectedMatchdayId === "all"
      ? predictions
      : predictions.filter(p => p.matchdayId === selectedMatchdayId);

    userPreds.forEach(p => {
      const uid = p.userId;
      if (!map[uid]) {
        map[uid] = {
          userId: uid,
          profile: profiles[uid],
          totalPoints: 0,
          exactCount: 0,
          signCount: 0,
          mvpCount: 0,
          lastMatchdayPoints: 0
        };
      }
      const exact = p.pointsExact || 0;
      const sign = p.pointsSign || 0;
      const mvp = p.pointsMvp || 0;
      const total = p.pointsTotal || (exact + sign + mvp);

      map[uid].totalPoints += total;
      if (exact === 3) map[uid].exactCount += 1;
      if (sign === 1) map[uid].signCount += 1;
      if (mvp === 1) map[uid].mvpCount += 1;
    });

    if (selectedMatchdayId === "all" && lastMatchdayId) {
      predictions.filter(p => p.matchdayId === lastMatchdayId).forEach(p => {
        const uid = p.userId;
        if (!map[uid]) {
          map[uid] = {
            userId: uid, profile: profiles[uid],
            totalPoints: 0, exactCount: 0, signCount: 0, mvpCount: 0, lastMatchdayPoints: 0
          };
        }
        const exact = p.pointsExact || 0;
        const sign = p.pointsSign || 0;
        const mvp = p.pointsMvp || 0;
        const total = p.pointsTotal || (exact + sign + mvp);
        map[uid].lastMatchdayPoints += total;
      });
    }

    const list = Object.values(map);
    list.sort((a, b) =>
      b.totalPoints - a.totalPoints ||
      b.exactCount - a.exactCount ||
      b.mvpCount - a.mvpCount
    );
    return list;
  }, [predictions, profiles, selectedMatchdayId, lastMatchdayId]);

  const tabOptions = [
    { id: "all", name: "Clasificación General" },
    ...matchdays.map(m => ({ id: m.id, name: m.name }))
  ];

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
              🏆 Clasificación
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {selectedMatchdayId === "all"
                ? "Orden: Puntos totales → Plenos (3pts) → MVPs acertados"
                : `Desglose de la ${matchdays.find(m => m.id === selectedMatchdayId)?.name}`}
            </p>
          </div>
          <Link 
            href="/"
            className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-700"
          >
            ← Inicio
          </Link>
        </div>

        {/* Tabs / Selector de jornada */}
        <div className="mb-8 overflow-x-auto pb-2 -mx-1">
          <div className="flex gap-2 px-1 min-w-max">
            {tabOptions.map(tab => {
              const active = selectedMatchdayId === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedMatchdayId(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                      : "bg-slate-800/70 text-slate-300 hover:bg-slate-700 border border-slate-700"
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden backdrop-blur-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/70 text-slate-400 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-3 md:px-6 py-4 text-left font-semibold">Pos</th>
                  <th className="px-3 md:px-6 py-4 text-left font-semibold">Equipo</th>
                  <th className="px-3 md:px-4 py-4 text-center font-semibold">Pts</th>
                  <th className="hidden md:table-cell px-4 py-4 text-center font-semibold">Plenos</th>
                  <th className="hidden lg:table-cell px-4 py-4 text-center font-semibold">Signos</th>
                  <th className="hidden md:table-cell px-4 py-4 text-center font-semibold">MVPs</th>
                  <th className="px-3 md:px-4 py-4 text-center font-semibold">
                    {selectedMatchdayId === "all" ? "Últ. J." : "Jor."}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/70">
                {standings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                      {matchdays.length === 0
                        ? "Aún no hay jornadas creadas."
                        : selectedMatchdayId === "all"
                          ? "Aún no hay predicciones puntuadas. Cierra el primer partido para ver la clasificación."
                          : "Nadie hizo predicciones en esta jornada."}
                    </td>
                  </tr>
                ) : (
                  standings.map((s, idx) => {
                    const medalColor =
                      idx === 0 ? "from-yellow-400 to-amber-600" :
                      idx === 1 ? "from-slate-300 to-slate-500" :
                      idx === 2 ? "from-amber-700 to-amber-900" : null;
                    return (
                      <tr key={s.userId} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-3 md:px-6 py-4">
                          {medalColor ? (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br ${medalColor} text-slate-900 font-extrabold text-sm shadow-lg`}>
                              {idx + 1}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-700/50 text-slate-300 font-semibold">
                              {idx + 1}
                            </span>
                          )}
                        </td>
                        <td className="px-3 md:px-6 py-4">
                          <div className="flex items-center gap-3">
                            {s.profile?.teamShield ? (
                              <img
                                src={s.profile.teamShield}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover border-2 border-slate-600"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-500 text-xs">?</div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate max-w-[200px]">
                                {s.profile?.teamName || "Equipo sin nombre"}
                              </p>
                              <p className="text-xs text-slate-400 truncate max-w-[200px]">
                                {s.profile?.playerName || `#${s.userId.slice(0, 6)}`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-4 text-center">
                          <span className="inline-block min-w-[2.5rem] text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
                            {s.totalPoints}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-green-500/15 text-green-400 font-bold text-xs border border-green-500/30">
                            {s.exactCount}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-blue-500/15 text-blue-400 font-bold text-xs border border-blue-500/30">
                            {s.signCount}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 font-bold text-xs border border-amber-500/30">
                            {s.mvpCount}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-4 text-center text-slate-300 font-semibold">
                          {selectedMatchdayId === "all" ? (
                            <span className={`px-2 py-0.5 rounded text-xs ${s.lastMatchdayPoints >= 9 ? "bg-emerald-500/20 text-emerald-300" : s.lastMatchdayPoints >= 6 ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-700/60 text-slate-300"}`}>
                              +{s.lastMatchdayPoints}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-slate-500 space-y-1">
          <p>Máx. por partido: 4 pts (3 pleno o 1 signo + 1 MVP) · Máx. por jornada (3 partidos): 12 pts</p>
          <p>Clasificación general se actualiza automáticamente cuando el Admin cierra cada partido.</p>
        </div>
      </div>
    </div>
  );
}
