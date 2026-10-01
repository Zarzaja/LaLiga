"use client";

import { useState } from "react";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface BackupSummary {
  users: number;
  matchdays: number;
  predictions: number;
}

export default function BackupAdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const [previewSummary, setPreviewSummary] = useState<BackupSummary | null>(null);
  const [confirmedRestore, setConfirmedRestore] = useState(false);

  const COLLECTIONS = ["users", "matchdays", "predictions"] as const;

  const handleExport = async () => {
    setLoading(true);
    setMessage({ text: "Generando copia de seguridad...", type: "info" });
    try {
      const backupData: any = {
        exportedAt: new Date().toISOString(),
        version: 1,
        users: {},
        matchdays: {},
        predictions: {}
      };

      for (const col of COLLECTIONS) {
        const snap = await getDocs(collection(db, col));
        snap.forEach(d => {
          backupData[col][d.id] = d.data();
        });
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `backup-porra-${date}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      const counts = COLLECTIONS.reduce<any>((acc, c) => {
        acc[c] = Object.keys(backupData[c]).length;
        return acc;
      }, {});
      setMessage({
        text: `Backup descargado: ${counts.users} usuarios · ${counts.matchdays} jornadas · ${counts.predictions} predicciones.`,
        type: "success"
      });
    } catch (err: any) {
      console.error(err);
      setMessage({ text: `Error al exportar: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!fileToImport) return;
    setMessage({ text: "", type: "" });
    try {
      const text = await fileToImport.text();
      const backupData = JSON.parse(text);
      const summary: BackupSummary = {
        users: backupData.users ? Object.keys(backupData.users).length : 0,
        matchdays: backupData.matchdays ? Object.keys(backupData.matchdays).length : 0,
        predictions: backupData.predictions ? Object.keys(backupData.predictions).length : 0
      };
      setPreviewSummary(summary);
      setConfirmedRestore(false);
    } catch (err: any) {
      setPreviewSummary(null);
      setMessage({ text: `El archivo no es un backup JSON válido: ${err.message}`, type: "error" });
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToImport || !previewSummary) return;
    if (!confirmedRestore) {
      setMessage({ text: "Primero marca la casilla de confirmación para autorizar la restauración.", type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "Restaurando base de datos. No cierres esta ventana...", type: "info" });

    try {
      const text = await fileToImport.text();
      const backupData = JSON.parse(text);

      const allOps: { ref: any; data: any }[] = [];

      for (const col of COLLECTIONS) {
        const colData = backupData[col];
        if (colData) {
          for (const [id, data] of Object.entries<any>(colData)) {
            allOps.push({ ref: doc(db, col, id), data });
          }
        }
      }

      if (allOps.length > 500) {
        throw new Error("Backup demasiado grande para un solo batch (>500 ops).");
      }

      const batch = writeBatch(db);
      allOps.forEach(op => batch.set(op.ref, op.data));

      await batch.commit();
      
      setMessage({ text: "Base de datos restaurada correctamente. Recarga la app.", type: "success" });
      setFileToImport(null);
      setPreviewSummary(null);
      setConfirmedRestore(false);
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
            Descarga un archivo JSON con <strong className="text-slate-200">TODAS</strong> las colecciones (usuarios, jornadas y predicciones) incluyendo los escudos.
          </p>
          <button
            onClick={handleExport}
            disabled={loading}
            className="mt-auto w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Generando..." : "Descargar Backup Completo"}
          </button>
        </div>

        {/* Importar */}
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-xl flex flex-col items-center border-t-4 border-t-red-500">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Restaurar Datos</h2>
          <p className="text-slate-400 text-sm mb-6">
            Sube un JSON de respaldo. Se muestra un resumen antes de sobrescribir la BD.
          </p>
          <form onSubmit={handleImport} className="w-full mt-auto flex flex-col gap-4">
            <div>
              <input 
                type="file" 
                accept=".json"
                required
                onChange={e => {
                  const f = e.target.files?.[0] || null;
                  setFileToImport(f);
                  setPreviewSummary(null);
                  setConfirmedRestore(false);
                }}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-indigo-400 hover:file:bg-slate-600"
              />
            </div>

            {fileToImport && !previewSummary && (
              <button
                type="button"
                onClick={handlePreview}
                className="w-full rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
              >
                Analizar y mostrar resumen
              </button>
            )}

            {previewSummary && (
              <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-4 space-y-2 text-sm">
                <p className="text-xs uppercase tracking-wider font-bold text-slate-400 border-b border-slate-700 pb-1 mb-2">
                  Resumen del archivo
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Usuarios</span>
                  <span className="font-bold text-white">{previewSummary.users}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Jornadas</span>
                  <span className="font-bold text-white">{previewSummary.matchdays}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Predicciones</span>
                  <span className="font-bold text-white">{previewSummary.predictions}</span>
                </div>
                <label className="flex items-start gap-3 mt-4 pt-3 border-t border-slate-700 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={confirmedRestore}
                    onChange={e => setConfirmedRestore(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 text-red-600 focus:ring-red-500 bg-slate-800"
                  />
                  <span className="text-slate-300">
                    <strong className="text-red-400">⚠️ Confirmo</strong> que este backup sobrescribirá <em>TODOS</em> los datos actuales y que tengo una copia actual por si acaso.
                  </span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !fileToImport || !previewSummary || !confirmedRestore}
              className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Restaurando..." : "Restaurar Base de Datos"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
