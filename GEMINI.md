# Reglas Estrictas del Proyecto: Porras de La Liga

Este archivo contiene las directrices fundamentales del proyecto. **Debe ser leído y respetado** antes de hacer cualquier modificación en el código o en la base de datos.

## 1. Control de Versiones y Salvaguardas (Git/GitHub)

- **Commits atómicos por fases (Puntos de guardado):** NUNCA se deben hacer cambios masivos sin guardar. Cada vez que se termine una funcionalidad o fase y se compruebe que compila sin errores (`npm run build` o linter), se debe hacer automáticamente un commit descriptivo y un `git push`.
- **Salvaguarda antes de cambios delicados:** Siempre que se vaya a modificar algo que ya funciona, primero hay que asegurarse de que el estado actual está commiteado en Git para poder hacer `git revert` o `git checkout` si el cambio sale mal.

## 2. Base de Datos y Protección de Datos (Firebase)

- **Prohibición de borrado masivo:** Queda terminantemente prohibido ejecutar scripts o código que hagan borrado masivo de colecciones en la base de datos (Firestore) sin usar la función de backup previo y obtener confirmación explícita del usuario.
- **Gestión de Imágenes (Escudos):** NO se deben usar buckets externos (Firebase Storage u otros). Las imágenes de los equipos se deben comprimir automáticamente en el cliente usando HTML5 Canvas a un tamaño máximo de `200x200px` en formato `WebP` (calidad 0.8) y guardarse como Data URL (Base64) directamente en el documento del usuario en Firestore.

## 3. Backups

- El Panel de Administración debe incluir un Centro de Copias de Seguridad capaz de exportar TODA la base de datos en un solo archivo JSON y restaurarla.
- Cualquier operación destructiva o de cambio de estado importante (como cerrar una jornada) debe recomendar o ejecutar un backup automático.
