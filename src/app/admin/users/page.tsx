"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/context/AuthContext";

interface AdminUser extends UserProfile {
  id: string;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const data: AdminUser[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as AdminUser);
      });
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveTeamName = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        teamName: editTeamName
      });
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      alert("Error al actualizar el nombre del equipo.");
    }
  };

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-bold mb-8">Gestión de Usuarios</h1>
      
      <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Escudo</th>
                <th className="px-6 py-4 font-medium">Apodo</th>
                <th className="px-6 py-4 font-medium">Equipo</th>
                <th className="px-6 py-4 font-medium">Rol</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 animate-pulse">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      {user.teamShield ? (
                        <img src={user.teamShield} alt="Escudo" className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-400">N/A</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">{user.playerName}</td>
                    <td className="px-6 py-4">
                      {editingId === user.id ? (
                        <input
                          type="text"
                          className="w-full rounded bg-slate-900 border border-slate-600 px-2 py-1 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={editTeamName}
                          onChange={e => setEditTeamName(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <span className="text-slate-300">{user.teamName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.isAdmin ? (
                        <span className="inline-flex items-center rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/30">Admin</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-400">User</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === user.id ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleSaveTeamName(user.id)}
                            className="text-green-400 hover:text-green-300 text-xs font-medium"
                          >
                            Guardar
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="text-slate-400 hover:text-slate-300 text-xs font-medium"
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
                          className="text-indigo-400 hover:text-indigo-300 text-xs font-medium"
                        >
                          Editar Equipo
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
