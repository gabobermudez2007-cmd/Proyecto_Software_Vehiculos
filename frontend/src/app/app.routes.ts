import { Routes } from '@angular/router';

// Cada pantalla se descarga de forma diferida (lazy loading) para acelerar la primera carga.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'panel' },
  {
    path: 'panel',
    data: { titulo: 'Centro de control' },
    loadComponent: () => import('./pages/panel-page').then((m) => m.PanelPage),
  },
  {
    path: 'vehiculos',
    data: { titulo: 'Flota de vehículos' },
    loadComponent: () => import('./pages/vehiculos-page').then((m) => m.VehiculosPage),
  },
  {
    path: 'vehiculos/:id',
    data: { titulo: 'Ficha del vehículo' },
    loadComponent: () => import('./pages/vehiculo-detalle-page').then((m) => m.VehiculoDetallePage),
  },
  {
    path: 'mantenimientos',
    data: { titulo: 'Registro de servicios' },
    loadComponent: () => import('./pages/mantenimientos-page').then((m) => m.MantenimientosPage),
  },
  {
    path: 'historial',
    data: { titulo: 'Historial de mantenimientos' },
    loadComponent: () => import('./pages/historial-page').then((m) => m.HistorialPage),
  },
  {
    path: 'alertas',
    data: { titulo: 'Alertas de mantenimiento' },
    loadComponent: () => import('./pages/alertas-page').then((m) => m.AlertasPage),
  },
  {
    path: 'estadisticas',
    data: { titulo: 'Estadísticas de la flota' },
    loadComponent: () => import('./pages/estadisticas-page').then((m) => m.EstadisticasPage),
  },
  {
    path: 'reportes',
    data: { titulo: 'Reporte de costos' },
    loadComponent: () => import('./pages/reportes-page').then((m) => m.ReportesPage),
  },
  {
    path: 'gestion',
    data: { titulo: 'Gestión de datos' },
    loadComponent: () => import('./pages/gestion-page').then((m) => m.GestionPage),
  },
  { path: '**', redirectTo: 'panel' },
];
