# STATUS.md - PORRA LA LIGA (Memoria Relevo Ultra-Concisa)

## STACK (3 líneas)
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + React 19
- Firebase: Firestore Database + Authentication (proyecto: porras-la-liga)
- Imágenes: Canvas cliente → WebP 200x200px 0.8 → Base64 en Firestore (SIN Storage)

## ESQUEMA FIRESTORE (8 líneas)
- users/{uid}: teamName(único), playerName, teamShield(DataURL), isAdmin:bool
- teams/{id}: name, shield?(DataURL). Seed LaLiga 26/27 (Deportivo Coruña sustituye Valladolid + 19 más)
- matchdays/{id}: name ("Jornada 1"), createdAt, matches:Match[3] embebidos
  - Match: id, homeTeam, awayTeam, kickoffTime, status(pending|finished), homeGoals, awayGoals, officialMvp, validMvpVotes:string[]
- predictions/{uid_matchId}: userId, matchdayId, matchId, homeGoals, awayGoals, mvpVote, pointsExact, pointsSign, pointsMvp, pointsTotal
- Admin = NEXT_PUBLIC_ADMIN_EMAIL o primer usuario.

## CHECKLIST FASES
[x] Fase 1: Init + Reglas multi-IDE (AGENTS, .cursorrules, GEMINI, STATUS)
[x] Fase 2: Auth (login/register/recuperar) + Perfil + escudo WebP
[x] Fase 3: Admin (Jornadas/Usuarios/Equipos/Backup predictions+resumen)
[x] Fase 4: Predicciones + Editor Partido General. Finalizado → recálculo writeBatch pts
[x] Fase 5: Leaderboard (pts→plenos→mvps) + tabs jornada + diseño
[x] Mejoras POST: Equipos dinámicos LaLiga26/27 con escudos + Editor cerrados recálculo
[x] Fix Oct1: (1) play/page nav ← Inicio / 🏆 / Perfil; (2) Admin Teams upload escudo PNG WebP; (3) Editor partido MVP: botón validar oficial + variaciones manuales

## ÚLTIMO CAMBIO (1 línea)
3 Fixes: botones navegación ← Inicio + Clasificación en Play; Admin Teams permite subir PNG/WebP escudo comprimido; Editor MVP arreglado con "Validar oficial" + variaciones custom aunque no haya apuestas previas.

## SIGUIENTE PASO EXACTO (1 línea)
Test real en navegador: subir escudos en admin/teams, cerrar partido usando "Validar este como MVP" (sin apuestas), verificar que el jugador que escriba MVP se le suma +1 y aparece el badge válido. Luego: opcional barra nav global sticky + logout.

## MAPA ARCHIVOS CLAVE
- src/lib/firebase.ts, src/lib/imageCompression.ts, src/lib/teamsSeed.ts
- src/context/AuthContext.tsx, src/components/AdminGuard.tsx
- src/app/page.tsx · src/app/leaderboard/page.tsx · src/app/profile/page.tsx
- src/app/play/page.tsx (escudos en tarjetas + nav inicio/clasif)
- src/app/(auth)/login/page.tsx (recuperar password), register/page.tsx
- src/app/admin/layout.tsx (sidebar con Equipos)
- src/app/admin/matchdays/page.tsx (lee teams Firestore + Editar en TODOS)
- src/app/admin/teams/page.tsx (CRUD + upload escudos PNG WebP)
- src/app/admin/users/page.tsx · backup/page.tsx (predictions + resumen)
- src/app/admin/matchdays/close/[matchdayId]/[matchId]/page.tsx (Editor + ✅ Validar MVP oficial + variaciones custom)
