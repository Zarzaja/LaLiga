# STATUS.md - PORRA LA LIGA (Memoria Relevo Ultra-Concisa)

## STACK (3 líneas)
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + React 19
- Firebase: Firestore Database + Authentication (proyecto: porras-la-liga)
- Imágenes: Canvas cliente → WebP 200x200px 0.8 → Base64 en Firestore (SIN Storage)

## ESQUEMA FIRESTORE (8 líneas)
- users/{uid}: teamName(único), playerName, teamShield(DataURL), isAdmin:bool
- teams/{id}: name, shield?(DataURL). Seed LaLiga 26/27 (20 equipos)
- matchdays/{id}: name ("Jornada 1"), createdAt, matches:Match[3]
  - Match: id(único `${matchdayId}_m${idx}`), homeTeam, awayTeam, kickoffTime, status, homeGoals, awayGoals, officialMvp, validMvpVotes:string[]
- predictions/{uid_matchdayId_matchId}: userId, matchdayId, matchId, homeGoals, awayGoals, mvpVote, pointsExact, pointsSign, pointsMvp, pointsTotal
- Admin = NEXT_PUBLIC_ADMIN_EMAIL o primer usuario.

## CHECKLIST FASES
[x] Fase 1: Init + Reglas multi-IDE (AGENTS, .cursorrules, GEMINI, STATUS)
[x] Fase 2: Auth (login/register/recuperar) + Perfil + escudo WebP
[x] Fase 3: Admin (Jornadas/Usuarios/Equipos/Backup predictions+resumen+teams)
[x] Fase 4: Predicciones + Editor Partido General. Finalizado → recálculo writeBatch pts
[x] Fase 5: Leaderboard (pts→plenos→mvps) + tabs jornada + diseño
[x] Mejoras POST: Equipos dinámicos LaLiga26/27 con escudos + Editor cerrados recálculo
[x] Fix Colisión Jornadas: Clave compuesta `uid_matchdayId_matchId` en predicciones, auto-migración, query por matchdayId en editor, IDs únicos de partido y backup con teams en chunks.

## ÚLTIMO CAMBIO (1-2 líneas)
Solucionado bug colisión de jornadas: predicciones indexadas por (matchdayId, matchId), doc ID único `${uid}_${mdId}_${mId}`, auto-migración legacy, recálculo acotado por jornada y partidos con ID único.

## SIGUIENTE PASO EXACTO (1-2 líneas)
En la app: volver a guardar o cerrar los partidos de Jornada 8 y 9; los puntos y predicciones de cada jornada permanecerán 100% aislados e intactos.

## MAPA ARCHIVOS CLAVE
- src/lib/firebase.ts, src/lib/imageCompression.ts, src/lib/teamsSeed.ts
- src/context/AuthContext.tsx, src/components/AdminGuard.tsx
- src/app/page.tsx · src/app/leaderboard/page.tsx (deduped preds) · src/app/profile/page.tsx
- src/app/play/page.tsx (clave compuesta `${mdId}_${mId}` + doc ID único + auto-migración)
- src/app/(auth)/login/page.tsx, register/page.tsx
- src/app/admin/matchdays/page.tsx (IDs únicos de partido `${matchdayId}_m${idx}`)
- src/app/admin/teams/page.tsx (CRUD + upload escudos PNG WebP)
- src/app/admin/backup/page.tsx (backup/restore users, matchdays, predictions, teams con chunks)
- src/app/admin/matchdays/close/[matchdayId]/[matchId]/page.tsx (query y recálculo filtrado por matchdayId)
