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
- predictions/{uid_matchdayId_matchId}: userId, matchdayId, matchId, homeGoals, awayGoals, mvpVote, pointsExact, pointsSign, pointsMvp, pointsTotal, exactCount, signCount, mvpCount, isManualAdjustment, note
- Admin = NEXT_PUBLIC_ADMIN_EMAIL o primer usuario.

## CHECKLIST FASES
[x] Fase 1: Init + Reglas multi-IDE (AGENTS, .cursorrules, GEMINI, STATUS)
[x] Fase 2: Auth (login/register/recuperar) + Perfil + escudo WebP
[x] Fase 3: Admin (Jornadas/Usuarios/Equipos/Backup predictions+resumen+teams)
[x] Fase 4: Predicciones + Editor Partido General. Finalizado → recálculo writeBatch pts
[x] Fase 5: Leaderboard (pts→plenos→mvps) + tabs jornada + diseño
[x] Mejoras POST: Equipos dinámicos LaLiga26/27 con escudos + Editor cerrados recálculo
[x] Fix Colisión Jornadas: Clave compuesta `uid_matchdayId_matchId` en predicciones + auto-migración
[x] Ajuste Manual de Puntos: Admin puede sumar/restar puntos por jornada a jugadores con desglose y notas

## ÚLTIMO CAMBIO (1-2 líneas)
Añadida gestión manual de puntos en admin/users: selector de jornada (ej. Jornada 8), puntos directos o desglose plenos/signos/MVPs, notas e historial con eliminación.

## SIGUIENTE PASO EXACTO (1-2 líneas)
Entrar en /admin/users, pulsar "➕ Añadir Puntos" en los jugadores afectados, elegir "Jornada 8" y sumarles los puntos perdidos. Se reflejarán al instante en la Jornada 8 y en la Clasificación General.

## MAPA ARCHIVOS CLAVE
- src/lib/firebase.ts, src/lib/imageCompression.ts, src/lib/teamsSeed.ts
- src/context/AuthContext.tsx, src/components/AdminGuard.tsx
- src/app/page.tsx · src/app/leaderboard/page.tsx · src/app/profile/page.tsx
- src/app/play/page.tsx (clave compuesta `${mdId}_${mId}` + doc ID único)
- src/app/admin/users/page.tsx (gestión usuarios + añadir puntos manuales + historial ajustes)
- src/app/admin/matchdays/page.tsx · src/app/admin/teams/page.tsx · src/app/admin/backup/page.tsx
- src/app/admin/matchdays/close/[matchdayId]/[matchId]/page.tsx
