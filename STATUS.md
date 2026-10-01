# STATUS.md - PORRA LA LIGA (Memoria Relevo Ultra-Concisa)

## STACK (3 líneas)
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + React 19
- Firebase: Firestore Database + Authentication (proyecto: porras-la-liga)
- Imágenes: Canvas cliente → WebP 200x200px 0.8 → Base64 en Firestore (SIN Storage)

## ESQUEMA FIRESTORE (8 líneas)
- users/{uid}: teamName(único), playerName, teamShield(DataURL), isAdmin:bool
- teams/{id}: name (colección editable en admin/teams, seed LaLiga 26/27)
- matchdays/{id}: name ("Jornada 1"), createdAt, matches:Match[3] embebidos
  - Match: id, homeTeam, awayTeam, kickoffTime, status(pending|finished), homeGoals, awayGoals, officialMvp, validMvpVotes:string[]
- predictions/{uid_matchId}: userId, matchdayId, matchId, homeGoals, awayGoals, mvpVote, pointsExact, pointsSign, pointsMvp, pointsTotal
- Admin = NEXT_PUBLIC_ADMIN_EMAIL o primer usuario.

## CHECKLIST FASES
[x] Fase 1: Init Next/Tailwind + Git/Reglas multi-IDE (AGENTS, .cursorrules, GEMINI, STATUS)
[x] Fase 2: Auth (login/register/recuperar-contraseña OK) + Perfil + escudo WebP
[x] Fase 3: Admin (Jornadas/Usuarios/Equipos/Backup-Restore predictions + resumen)
[x] Fase 4: Predicciones + Editor Partido (editar cualquier campo). Finalizado → recálculo writeBatch pts
[x] Fase 5: Leaderboard /clasificación (orden pts→plenos→mvps) + tabs jornada + diseño
[x] Mejoras POST F5: Equipos LaLiga 26/27 dinámicos (colección teams), Editar partidos cerrados con recálculo pts

## ÚLTIMO CAMBIO (1 línea)
Añadida Gestión Equipos (admin/teams) con seed LaLiga 26/27 (20 eq) y Editor Partido General (editar loc/vis/hora/resultado/MVP + writeBatch recalcula puntos).

## SIGUIENTE PASO EXACTO (1 línea)
Test real en navegador: cargar equipos → jornada → predecir → cerrar → editar partido cerrado cambiando resultado → verificar recálculo en leaderboard. Luego opcional: botón logout, navbar sticky, editar perfil propio.

## MAPA ARCHIVOS CLAVE
- src/lib/firebase.ts, src/lib/imageCompression.ts, src/lib/teamsSeed.ts (NUEVO)
- src/context/AuthContext.tsx, src/components/AdminGuard.tsx
- src/app/page.tsx · src/app/play/page.tsx · src/app/profile/page.tsx · src/app/leaderboard/page.tsx
- src/app/(auth)/login/page.tsx, register/page.tsx
- src/app/admin/layout.tsx (con enlace Equipos)
- src/app/admin/matchdays/page.tsx (lee teams Firestore + botón Editar en TODOS)
- src/app/admin/teams/page.tsx (NUEVO, CRUD equipos + seed LaLiga 26/27)
- src/app/admin/users/page.tsx · backup/page.tsx
- src/app/admin/matchdays/close/[matchdayId]/[matchId]/page.tsx (EDITOR GENERAL + recálculo writeBatch)
