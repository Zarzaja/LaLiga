"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/context/AuthContext";
import { Matchday } from "@/app/admin/matchdays/page";

interface AdminUser extends UserProfile {
  id: string;
}

interface ManualAdjustment {
  id: string;
  userId: string;
  matchdayId: string;
  matchId: string;
  pointsTotal: number;
  exactCount?: number;
  signCount?: number;
  mvpCount?: number;
  note?: string;
  createdAt?: number;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [matchdays, setMatchdays] = useState<Matchday[]>([]);
  const [userPointsMap, setUserPointsMap] = useState<Record<string, number>>({});
  const [adjustmentsByUser, setAdjustmentsByUser] = useState<Record<string, ManualAdjustment[]>>({});
  const [loading, setLoading] = useState(true);

  // Edit team name inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState("");

  // Modal: Add points
  const [pointsUser, setPointsUser] = useState<AdminUser | null>(null);
  const [targetMatchdayId, setTargetMatchdayId] = useState<string>("");
  const [inputTotalPoints, setInputTotalPoints] = useState<string>("3");
  const [inputExactCount, setInputExactCount] = useState<string>("0");
  const [inputSignCount, setInputSignCount] = useState<string>("0");
  const [inputMvpCount, setInputMvpCount] = useState<string>("0");
  const [inputNote, setInputNote] = useState<string>("Recuperación de puntos Jornada 8");
  const [savingPoints, setSavingPoints] = useState<boolean>(false);

  // Modal: History
  const [historyUser, setHistoryUser] = useState<AdminUser | null>(null);
  const [deletingAdjId, setDeletingAdjId] = useState<string | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [uSnap, mSnap, pSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "matchdays"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "predictions"))
      ]);

      const usersList: AdminUser[] = [];
      uSnap.forEach(d => {
        usersList.push({ id: d.id, ...d.data() } as AdminUser);
      });
      setUsers(usersList);

      const mdsList: Matchday[] = [];
      mSnap.forEach(d => {
        mdsList.push({ id: d.id, ...d.data() } as Matchday);
      });
      setMatchdays(mdsList);

      // Compute total points per user and collect manual adjustments
      const ptsMap: Record<string, number> = {};
      const adjMap: Record<string, ManualAdjustment[]> = {};
      usersList.forEach(u => {
        ptsMap[u.id] = 0;
        adjMap[u.id] = [];
      });

      // Deduplicate predictions by userId + matchdayId + matchId
      const dedupedPreds = new Map<string, any>();
      pSnap.forEach(d => {
        const p = d.data() as any;
        if (!p.userId) return;
        const key = `${p.userId}_${p.matchdayId || "all"}_${p.matchId}`;
        const existing = dedupedPreds.get(key);
        if (!existing || (p.pointsTotal ?? 0) >= (existing.data.pointsTotal ?? 0)) {
          dedupedPreds.set(key, { id: d.id, data: p });
        }
      });

      dedupedPreds.forEach(({ id, data: p }) => {
        const uid = p.userId;
        const total = p.pointsTotal !== undefined
          ? p.pointsTotal
          : ((p.pointsExact || 0) + (p.pointsSign || 0) + (p.pointsMvp || 0));

        if (ptsMap[uid] !== undefined) {
          ptsMap[uid] += total;
        } else {
          ptsMap[uid] = total;
        }

        if (p.isManualAdjustment || (p.matchId && p.matchId.startsWith("manual_"))) {
          if (!adjMap[uid]) adjMap[uid] = [];
          adjMap[uid].push({
            id,
            userId: uid,
            matchdayId: p.matchdayId || "general",
            matchId: p.matchId,
            pointsTotal: total,
            exactCount: p.exactCount,
            signCount: p.signCount,
            mvpCount: p.mvpCount,
            note: p.note || p.mvpVote || "Ajuste manual",
            createdAt: p.createdAt
          });
        }
      });

      setUserPointsMap(ptsMap);
      setAdjustmentsByUser(adjMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSaveTeamName = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        teamName: editTeamName
      });
      setEditingId(null);
      fetchAllData();
    } catch (err) {
      alert("Error al actualizar el nombre del equipo.");
    }
  };

  const handleOpenAddPoints = (user: AdminUser) => {
    setPointsUser(user);
    setTargetMatchdayId(matchdays.length > 0 ? matchdays[0].id : "general");
    setInputTotalPoints("3");
    setInputExactCount("0");
    setInputSignCount("0");
    setInputMvpCount("0");
    setInputNote("Recuperación de puntos Jornada 8");
  };

  const handleAutoCalcTotal = () => {
    const exact = parseInt(inputExactCount || "0") * 3;
    const sign = parseInt(inputSignCount || "0") * 1;
    const mvp = parseInt(inputMvpCount || "0") * 1;
    setInputTotalPoints((exact + sign + mvp).toString());
  };

  const handleSavePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointsUser) return;
    const pts = parseInt(inputTotalPoints);
    if (isNaN(pts)) {
      alert("Introduce una cantidad válida de puntos.");
      return;
    }

    setSavingPoints(true);
    try {
      const matchId = `manual_${Date.now()}`;
      const mdId = targetMatchdayId || "general";
      const docId = `${pointsUser.id}_${mdId}_${matchId}`;

      const adjData = {
        userId: pointsUser.id,
        matchdayId: mdId,
        matchId,
        homeGoals: 0,
        awayGoals: 0,
        mvpVote: inputNote.trim() || "Ajuste manual de admin",
        pointsExact: parseInt(inputExactCount || "0") * 3,
        pointsSign: parseInt(inputSignCount || "0") * 1,
        pointsMvp: parseInt(inputMvpCount || "0") * 1,
        pointsTotal: pts,
        exactCount: parseInt(inputExactCount || "0"),
        signCount: parseInt(inputSignCount || "0"),
        mvpCount: parseInt(inputMvpCount || "0"),
        isManualAdjustment: true,
        note: inputNote.trim() || "Ajuste manual de admin",
        createdAt: Date.now()
      };

      await setDoc(doc(db, "predictions", docId), adjData);
      setPointsUser(null);
      await fetchAllData();
      alert(`✔ Se han añadido ${pts} puntos a ${pointsUser.playerName}.`);
    } catch (err: any) {
      console.error(err);
      alert("Error al guardar puntos: " + err.message);
    } finally {
      setSavingPoints(false);
    }
  };

  const handleDeleteAdjustment = async (adjId: string) => {
    if (!confirm("¿Seguro que deseas eliminar este ajuste de puntos? Los puntos se restarán.")) return;
    setDeletingAdjId(adjId);
    try {
      await deleteDoc(doc(db, "predictions", adjId));
      await fetchAllData();
    } catch (err: any) {
      alert("Error al eliminar ajuste: " + err.message);
    } finally {
      setDeletingAdjId(null);
    }
  };

  const getMatchdayName = (mdId: string) => {
    if (mdId === "general") return "Puntos Generales";
    const found = matchdays.find(m => m.id === mdId);
    return found ? found.name : mdId;
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestión de Usuarios y Puntos</h1>
          <p className="text-sm text-slate-400 mt-1">
            Visualiza los jugadores, edita sus nombres de equipo y añade o ajusta puntos manualmente.
          </p>
        </div>
      </div>
      
      <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/60 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Escudo</th>
                <th className="px-6 py-4 font-medium">Jugador</th>
                <th className="px-6 py-4 font-medium">Equipo</th>
                <th className="px-6 py-4 font-medium text-center">Puntos Actuales</th>
                <th className="px-6 py-4 font-medium">Rol</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 animate-pulse">
                    Cargando usuarios y puntos...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                users.map(user => {
                  const pts = userPointsMap[user.id] || 0;
                  const adjs = adjustmentsByUser[user.id] || [];

                  return (
                    <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        {user.teamShield ? (
                          <img src={user.teamShield} alt="Escudo" className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-400">N/A</div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {user.playerName}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === user.id ? (
                          <input
                            type="text"
                            className="w-full rounded bg-slate-900 border border-slate-600 px-2 py-1 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                            value={editTeamName}
                            onChange={e => setEditTeamName(e.target.value)}
                            autoFocus
                          />
                        ) : (
                          <span className="text-slate-300">{user.teamName}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center rounded-lg bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 text-sm border border-emerald-500/30">
                            {pts} pts
                          </span>
                          {adjs.length > 0 && (
                            <button
                              onClick={() => setHistoryUser(user)}
                              className="text-[11px] text-amber-400 hover:text-amber-300 underline mt-1"
                              title="Ver historial de ajustes manuales"
                            >
                              {adjs.length} ajuste{adjs.length > 1 ? "s" : ""} (+{adjs.reduce((acc, a) => acc + a.pointsTotal, 0)})
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.isAdmin ? (
                          <span className="inline-flex items-center rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/30">Admin</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-400">User</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenAddPoints(user)}
                            className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
                          >
                            ➕ Añadir Puntos
                          </button>

                          {editingId === user.id ? (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleSaveTeamName(user.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-2 py-1 rounded"
                              >
                                Guardar
                              </button>
                              <button 
                                onClick={() => setEditingId(null)}
                                className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium px-2 py-1 rounded"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setEditingId(user.id);
                                setEditTeamName(user.teamName);
                              }}
                              className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              ✏️ Equipo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Añadir Puntos */}
      {pointsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>➕ Añadir Puntos Manuales</span>
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Jugador: <strong className="text-indigo-300">{pointsUser.playerName}</strong> ({pointsUser.teamName})
                </p>
              </div>
              <button
                onClick={() => setPointsUser(null)}
                className="text-slate-400 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePoints} className="space-y-4">
              {/* Selector Jornada */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ¿A qué Jornada aplicar estos puntos?
                </label>
                <select
                  value={targetMatchdayId}
                  onChange={e => setTargetMatchdayId(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  {matchdays.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} (se verá en su pestaña y en General)
                    </option>
                  ))}
                  <option value="general">Puntos Generales (solo clasificación general)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 Selecciona por ejemplo <strong>Jornada 8</strong> para que le compute en dicha jornada y en la general.
                </p>
              </div>

              {/* Puntos Totales */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700">
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Puntos a sumar
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="1"
                    required
                    value={inputTotalPoints}
                    onChange={e => setInputTotalPoints(e.target.value)}
                    className="w-28 text-center text-2xl font-bold rounded-lg bg-slate-800 border border-indigo-500/50 p-2 text-white focus:border-indigo-400 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">
                    puntos totales que se añadirán al casillero de este jugador.
                  </span>
                </div>
              </div>

              {/* Desglose opcional */}
              <div className="border border-slate-700/80 rounded-xl p-3 bg-slate-900/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Desglose de aciertos (para criterios de desempate)
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoCalcTotal}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Calcular total de aciertos
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Plenos (+3pts)</label>
                    <input
                      type="number"
                      min="0"
                      value={inputExactCount}
                      onChange={e => setInputExactCount(e.target.value)}
                      className="w-full text-center rounded bg-slate-800 border border-slate-600 p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Signos 1X2 (+1pt)</label>
                    <input
                      type="number"
                      min="0"
                      value={inputSignCount}
                      onChange={e => setInputSignCount(e.target.value)}
                      className="w-full text-center rounded bg-slate-800 border border-slate-600 p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">MVPs (+1pt)</label>
                    <input
                      type="number"
                      min="0"
                      value={inputMvpCount}
                      onChange={e => setInputMvpCount(e.target.value)}
                      className="w-full text-center rounded bg-slate-800 border border-slate-600 p-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Motivo o Nota
                </label>
                <input
                  type="text"
                  required
                  value={inputNote}
                  onChange={e => setInputNote(e.target.value)}
                  placeholder="Ej. Recuperación puntos Jornada 8"
                  className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setPointsUser(null)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-semibold text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPoints}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {savingPoints ? "Guardando..." : "Guardar Puntos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Historial de Ajustes */}
      {historyUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Historial de Ajustes Manuales
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Jugador: <strong className="text-indigo-300">{historyUser.playerName}</strong> ({historyUser.teamName})
                </p>
              </div>
              <button
                onClick={() => setHistoryUser(null)}
                className="text-slate-400 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {(!adjustmentsByUser[historyUser.id] || adjustmentsByUser[historyUser.id].length === 0) ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                Este jugador no tiene ajustes manuales registrados.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {adjustmentsByUser[historyUser.id].map(adj => (
                  <div
                    key={adj.id}
                    className="flex items-center justify-between bg-slate-900/70 p-3.5 rounded-xl border border-slate-700"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400 text-base">
                          +{adj.pointsTotal} pts
                        </span>
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-medium">
                          {getMatchdayName(adj.matchdayId)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {adj.note || "Ajuste manual"}
                      </p>
                      {(adj.exactCount || adj.signCount || adj.mvpCount) ? (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Desglose: {adj.exactCount || 0} plenos, {adj.signCount || 0} signos, {adj.mvpCount || 0} MVPs
                        </p>
                      ) : null}
                    </div>

                    <button
                      onClick={() => handleDeleteAdjustment(adj.id)}
                      disabled={deletingAdjId === adj.id}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs px-2.5 py-1.5 rounded-lg border border-red-500/30 transition-colors disabled:opacity-50"
                      title="Eliminar este ajuste y restar los puntos"
                    >
                      {deletingAdjId === adj.id ? "..." : "🗑️ Eliminar"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-5 border-t border-slate-700 mt-6">
              <button
                type="button"
                onClick={() => setHistoryUser(null)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-semibold text-slate-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
