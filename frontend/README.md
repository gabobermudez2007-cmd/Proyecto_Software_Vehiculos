# FleetCare — Frontend

Interfaz del **Registro de Mantenimientos de una Flota de Vehículos** (Proyecto 4).
Angular 19 + TypeScript, con un sistema de diseño propio (SCSS + variables CSS) y vehículos 3D procedurales (three.js).

## Cómo ejecutarlo

Requisitos: Node.js 20.11+ (o 22) y el backend corriendo en `http://localhost:8080`.

```bash
cd frontend
npm install
npm start
```

Abre http://localhost:4200.

## Módulos

| Ruta | Qué hace |
|------|----------|
| `/panel` | Centro de control: vehículo 3D destacado, flota, servicios vencidos y actividad reciente |
| `/vehiculos` | Galería con búsqueda y filtros, alta, edición y baja |
| `/vehiculos/:id` | Ficha individual con vista 3D, alertas e historial |
| `/mantenimientos` | Formulario de registro de servicios |
| `/historial` | Historial cronológico por vehículo |
| `/alertas` | Alertas jerarquizadas por gravedad (crítica, vencida, en el límite) |

Las estadísticas, la gráfica de frecuencia y el reporte CSV los desarrolla el resto del equipo
y se enchufan en este mismo menú.

## Estructura

```
src/
  styles/        sistema de diseño (tokens, base, componentes, movimiento)
  app/core/      modelos, API, estado de la flota, utilidades
  app/shared/    componentes reutilizables (modal, 3D, contadores, alertas…)
  app/pages/     una página por módulo
```

## Configuración

- URL del backend: `src/app/core/config.ts` (`API_URL`).
- El backend debe permitir CORS desde `http://localhost:4200` (variable `CORS_ORIGENES`).
- Usa los endpoints `/api/vehiculos`, `/api/mantenimientos`, `/api/alertas`, `/api/tipos-servicio` y `/api/talleres`.
