# STATUS.md - PORRA LA LIGA (Memoria Relevo Ultra-Concisa)

## STACK (3 líneas)
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + React 19
- Firebase: Firestore Database + Authentication (proyecto: porras-la-liga)
- Imágenes: Canvas cliente → WebP 200x200px 0.8 → Base64 en Firestore (SIN Storage)

## ESQUEMA FIRESTORE (8 líneas)
- users/{uid}: teamName(único), playerName, teamShield(DataURL), isAdmin:bool
- matchdays/{id}: name ("Jornada 1"), createdAt, matches:Match[3] embebidos
  - Match: id, homeTeam, awayTeam, kickoffTime, status(pending|finished), homeGoals, awayGoals, officialMvp, validMvpVotes:string[]
- predictions/{uid_matchId}: userId, matchdayId, matchId, homeGoals, awayGoals, mvpVote(lowercase), pointsExact, pointsSign, pointsMvp, pointsTotal
- Admin = NEXT_PUBLIC_ADMIN_EMAIL o primer usuario.

## CHECKLIST FASES
[x] Fase 1: Init Next/Tailwind + Git/Reglas multi-IDE (AGENTS, .cursorrules, GEMINI, STATUS)
[x] Fase 2: Auth (login/register/recuperar-contraseña OK) + Perfil + escudo WebP
[x] Fase 3: Admin (Jornadas, Usuarios OK) · Backup-Restore (users/matchdays/predictions + resumen previo)
[x] Fase 4: Predicciones (bloqueo horario OK) · Cierre partido (MVP checkboxes OK) · CÁLCULO PUNTOS AUTOMÁTICO: exacto3 / signo1 / mvp+1 en writeBatch
[x] Fase 5: Leaderboard /clasificación General (orden: pts→plenos→mvps) + Tabs por jornada + Diseño deportivo + enlace Home

## ÚLTIMO CAMBIO (1 línea)
Implementado cálculo automático de puntos al cerrar partido, Leaderboard /leaderboard con tabs por jornada, recuperar contraseña y Backup completo predictions + resumen previo.

## SIGUIENTE PASO EXACTO (1 línea)
Comprobar en navegador real la app con Firebase: crear usuario/admin → jornada → predecir → cerrar partido y validar que suma puntos y muestra clasificación. Si falla algo, iterar puliendo bugs. Opcional: logout en Home/Profile.

## MAPA ARCHIVOS CLAVE
- src/lib/firebase.ts, src/lib/imageCompression.ts
- src/context/AuthContext.tsx, src/components/AdminGuard.tsx
- src/app/page.tsx · src/app/play/page.tsx · src/app/profile/page.tsx · src/app/leaderboard/page.tsx (NUEVO)
- src/app/(auth)/login/page.tsx (recuperar password), register/page.tsx
- src/app/admin/layout.tsx · matchdays/page.tsx · users/page.tsx · backup/page.tsx
- src/app/admin/matchdays/close/[matchdayId]/[matchId]/page.tsx (cálculo pts)
