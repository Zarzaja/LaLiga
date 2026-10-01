<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# REGLAS ESTRICTAS - PORRA DE LA LIGA (MULTI-IDE PROTOCOL)

## 1. MEMORIA DE RELEVO OBLIGATORIA
- ANTES de escribir código: leer `STATUS.md` (raíz). Es la memoria ultra-concisa (<=50 líneas) con fase actual, último cambio y siguiente paso.
- DESPUÉS de cada fase/tarea funcional y verificar compilación: SOBREESCRIBIR `STATUS.md` con:
  - Stack (3 líneas): Next.js 16 + App Router + TS + Tailwind 4 / Firebase Firestore + Auth / Imágenes WebP Base64 en Firestore
  - Esquema Firestore (8-10 líneas)
  - Checklist Fases [x]/[~]/[ ]
  - Último cambio (1-2 líneas) + Siguiente paso EXACTO (1-2 líneas)
  - Mapa de archivos clave (rutas principales)

## 2. CONTROL DE VERSIONES (GIT/GITHUB)
- Repo: https://github.com/Zarzaja/LaLiga (rama main)
- COMMITS ATÓMICOS POR FASE: cada fase del plan = 1 commit = 1 push
- Formato: `git add . && git commit -m "feat: descripción clara" && git push`
- ANTES de tocar código delicado que funciona: confirmar commit limpio (git status) para poder revertir
- NUNCA hacer push sin antes pasar `npm run build` exitosamente

## 3. PROTECCIÓN DE DATOS (FIREBASE)
- PROHIBIDO: scripts que borren colecciones o reseteen Firestore SIN backup previo (.json descargado)
- PROHIBIDO: usar Firebase Storage para escudos. Toda imagen se COMPRIME en CLIENTE (Canvas 200x200px WebP calidad 0.8) y se guarda como DataURL Base64 en el documento Firestore.
- Admin: email en variable de entorno o primer usuario registrado (isAdmin: true)

## 4. STACK TECNOLÓGICO
- Front: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + React 19
- Backend BaaS: Firebase (Firestore Database + Firebase Authentication)
- Deploy optimizado para Vercel (gratuito)
- Sin Supabase. Sin Storage externo.

## 5. FUNCIONALIDADES CLAVE (por si hay dudas)
A: Usuarios → Registro/Login Email + Recuperar Contraseña + Perfil (Nombre equipo ÚNICO, Jugador, Escudo comprimido)
B: Jornadas → Admin crea 3 partidos/jornada con Local, Visitante, Fecha/Hora exacta. Cierre automático por horario.
C: Predicciones → Goles Local + Goles Visitante + MVP. Puntuación: Exacto (3pts), Ganador/empate (1pt), MVP (+1pt). Admin valida MVPs con checkboxes.
D: Clasificación → Orden: Puntos Totales, Plenos (3pts), MVPs acertados. Vista general + por jornada.
E: Panel Admin → Gestión jornadas/partidos/usuarios + Backup & Restore (.json) con writeBatch y resumen previo.

## 6. ARCHIVOS DE REGLAS SINCRONIZADOS
- `AGENTS.md` = fuente maestro
- `.cursorrules` = copia idéntica de AGENTS.md
- `GEMINI.md` = copia idéntica de AGENTS.md
- Cualquier cambio en reglas se hace en AGENTS.md y luego se copia a los demás.
