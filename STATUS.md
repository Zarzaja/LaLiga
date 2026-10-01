# STATUS.md - PORRA LA LIGA (Memoria de Relevo Ultra-Concisa)

## STACK (3 líneas)
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + React 19
- Firebase: Firestore Database + Authentication (proyecto: porras-la-liga)
- Imágenes: Canvas cliente → WebP 200x200px calidad 0.8 → Base64 en documento Firestore (SIN Storage)

## ESQUEMA FIRESTORE (8 líneas)
- users/{uid}: teamName (único), playerName, teamShield (DataURL), isAdmin:bool
- matchdays/{id}: name (ej."Jornada 1"), createdAt:number, matches:Match[] (3)
  - Match embebido: id, homeTeam, awayTeam, kickoffTime, status(pending|finished), homeGoals, awayGoals, officialMvp, validMvpVotes:string[]
- predictions/{userId_matchId}: userId, matchdayId, matchId, homeGoals, awayGoals, mvpVote (lowercase)
- IDs predicciones = `${uid}_${matchId}`. Admin: email NEXT_PUBLIC_ADMIN_EMAIL o 1er usuario

## CHECKLIST FASES
[x] Fase 1: Inicialización + Git/Reglas multi-IDE (STATUS.md, AGENTS.md, .cursorrules, GEMINI.md)
[~] Fase 2: Auth (login/register OK, FALTA recuperar contraseña) + Perfil con escudo WebP (OK)
[~] Fase 3: Admin Jornadas (OK) + Usuarios (OK) + Backup/Restore (solo users/matchdays, FALTA predictions y resumen previo)
[~] Fase 4: Predicciones (bloqueo horario OK, guardar OK) + Cierre partido validación MVP checkboxes (OK). FALTA cálculo AUTOMÁTICO de puntos (3pts pleno, 1pt signo, +1pt MVP)
[ ] Fase 5: Clasificación General (orden pts→plenos→MVPs) + vista por jornadas + diseño pulido

## ÚLTIMO CAMBIO (1 línea)
Creado .cursorrules + actualizados AGENTS.md/GEMINI.md con reglas multi-IDE completas. Consolidado STATUS.md con avance real.

## SIGUIENTE PASO EXACTO (1 línea)
Añadir enlace "Recuperar contraseña" en login (sendPasswordResetEmail) + actualizar backup/restore para incluir colección "predictions" y resumen previo antes de restaurar.

## MAPA ARCHIVOS CLAVE
- src/lib/firebase.ts, src/lib/imageCompression.ts
- src/context/AuthContext.tsx, src/components/AdminGuard.tsx
- src/app/page.tsx | src/app/play/page.tsx | src/app/profile/page.tsx
- src/app/(auth)/login/page.tsx | src/app/(auth)/register/page.tsx
- src/app/admin/layout.tsx | src/app/admin/matchdays/page.tsx | src/app/admin/users/page.tsx | src/app/admin/backup/page.tsx
- src/app/admin/matchdays/close/[matchdayId]/[matchId]/page.tsx
