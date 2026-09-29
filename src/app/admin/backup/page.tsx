"use client";

import { useState } from "react";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function BackupAdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [fileToImport, setFileToImport] = useState<File | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setMessage({ text: "Generando copia de seguridad...", type: "info" });
    try {
      const backupData: any = {
        users: {},
        matchdays: {}
      };

      // Export users
      const usersSnap = await getDocs(collection(db, "users"));
      usersSnap.forEach(d => {
        backupData.users[d.id] = d.data();
      });

      // Export matchdays
      const matchdaysSnap = await getDocs(collection(db, "matchdays"));
      matchdaysSnap.forEach(d => {
        backupData.matchdays[d.id] = d.data();
      });

      // Create JSON file and trigger download
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `backup-porra-${date}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      setMessage({ text: "Copia de seguridad descargada con éxito.", type: "success" });
    } catch (err: any) {
      console.error(err);
      setMessage({ text: `Error al exportar: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToImport) return;

    if (!confirm("⚠️ ¡ADVERTENCIA CRÍTICA!\n\nRestaurar una copia de seguridad sobrescribirá TODOS los datos actuales de la base de datos (usuarios, jornadas y predicciones).\n\n¿Estás completamente seguro de continuar?")) {
      return;
    }

    setLoading(true);
    setMessage({ text: "Restaurando base de datos. Por favor, no cierres esta ventana...", type: "info" });

    try {
      const text = await fileToImport.text();
      const backupData = JSON.parse(text);

      const batch = writeBatch(db);
      let opCount = 0;

      // Import users
      if (backupData.users) {
        for (const [id, data] of Object.entries(backupData.users)) {
          const ref = doc(db, "users", id);
          batch.set(ref, data);
          opCount++;
        }
      }

      // Import matchdays
      if (backupData.matchdays) {
        for (const [id, data] of Object.entries(backupData.matchdays)) {
          const ref = doc(db, "matchdays", id);
          batch.set(ref, data);
          opCount++;
        }
      }

      // Firestore limits batch sizes to 500 operations. 
      // Si la BD crece mucho, habría que dividirlo en varios batches, pero para esta app pequeña está bien así.
      if (opCount > 500) {
        throw new Error("El archivo de backup es demasiado grande para un solo lote (>500 operaciones). Contacta con el desarrollador.");
      }

      await batch.commit();
      
      setMessage({ text: "Base de datos restaurada correctamente.", type: "success" });
      setFileToImport(null);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: `Error al restaurar: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Centro de Copias de Seguridad</h1>
      
      {message.text && (
        <div className={`mb-8 p-4 rounded-lg border ${
          message.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
          message.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-400' :
          'bg-blue-500/20 border-blue-500/50 text-blue-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Exportar */}
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-xl flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Exportar Datos</h2>
          <p className="text-slate-400 text-sm mb-6">
            Descarga un archivo JSON con toda la base de datos (incluyendo las imágenes de los escudos). Mantenlo en un lugar seguro.
          </p>
          <button
            onClick={handleExport}
            disabled={loading}
            className="mt-auto w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            Descargar Backup Completo
          </button>
        </div>

        {/* Importar */}
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-xl flex flex-col items-center text-center border-t-4 border-t-red-500">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Restaurar Datos</h2>
          <p className="text-slate-400 text-sm mb-6">
            Sube un archivo JSON de respaldo para sobrescribir toda la base de datos. <strong className="text-red-400">Esta acción no se puede deshacer.</strong>
          </p>
          <form onSubmit={handleImport} className="w-full mt-auto flex flex-col gap-4">
            <input 
              type="file" 
              accept=".json"
              required
              onChange={e => setFileToImport(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-indigo-400 hover:file:bg-slate-600"
            />
            <button
              type="submit"
              disabled={loading || !fileToImport}
              className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              Restaurar Base de Datos
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
