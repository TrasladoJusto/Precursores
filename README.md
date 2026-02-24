# Análisis y guía de uso

Este repositorio contiene una aplicación web estática para registro y administración de asistentes a la "Escuela del Servicio de Precursor". A continuación se presenta un análisis técnico conciso, recomendaciones de uso y los pasos siguientes que propongo.

## Análisis técnico resumido

- Estructura principal:
  - `index.html`: formulario público para precursos.
  - `admin.html`: panel administrativo con login, vistas para dashboard, lista de registros, constructor de formulario y exportación.
  - `script.js`: lógica del formulario público (validación, progreso, persistencia en `localStorage`).
  - `admin.js`: lógica del panel administrativo (autenticación, CRUD sobre registros, exportación, constructor de formulario).
  - `styles.css`: estilos y componentes visuales.
- Almacenamiento: `localStorage` para registros y configuración; `sessionStorage` para sesión administrativa.
- Dependencias externas: `jsPDF` (CDN) para exportar PDF.
- Seguridad: autenticación mínima en frontend (credenciales en el código). No es apto para datos sensibles.

## Observaciones relevantes

- El proyecto funciona sin servidor (ideal para prototipos), pero los datos se almacenan localmente en el navegador.
- Exportar datos periódicamente es obligatorio para backup.
- Para producción o datos sensibles es necesario añadir backend, autenticación segura y almacenamiento centralizado.

## Qué hice ahora

- He consolidado la orientación de uso en este `README.md` y marqué el plan de trabajo interno.

## Siguientes pasos propuestos (requieren confirmación)

1. Eliminar todas las «ayudas guiadas» y comentarios explicativos que quedan dentro de `index.html`, `admin.html`, `script.js`, `admin.js` y `styles.css`, de modo que esos archivos contengan solo código y no instrucciones ni pistas visibles al usuario.
2. Mantener una copia de seguridad de los archivos originales antes de limpiar (se puede crear una carpeta `backup/` con los originales).
3. Ejecutar pruebas funcionales en navegador local (abrir `index.html` y `admin.html`) y verificar que:
   - el formulario publica y guarda registros,
   - el panel admin permite login y ver/editar/eliminar registros,
   - las exportaciones (JSON/Excel/PDF) funcionan.
4. Si lo deseas, puedo automatizar la limpieza (remover comentarios y textos de ayuda) y dejar solo código ordenado ahora.

Por favor confirma si quieres que proceda a eliminar las ayudas guiadas y comentarios de los archivos fuente. Realizaré una copia de seguridad antes de aplicar cambios y luego actualizaré el repositorio.

---

Si confirmas, procederé a: crear `backup/` con los archivos originales y luego limpiar `index.html`, `admin.html`, `script.js`, `admin.js` y `styles.css` para dejar únicamente código.
