# Manrique Importadora - PWA & Admin Panel

## Problema Original
Crear una PWA instalable en Android/iOS para Manrique Importadora (productos de belleza) con:
- PWA para empleados: Login, Escáner de códigos de barras, Cotizador inteligente con 3 precios
- Panel Administrativo: Dashboard métricas, CRUD productos con carga masiva Excel, Gestión usuarios

## Arquitectura
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (MongoDB async)
- **Database**: MongoDB
- **Auth**: JWT con sesión persistente

## Usuarios
1. **Administrador**: Acceso completo al panel admin y PWA
2. **Empleado**: Solo acceso a PWA (escáner + cotizador)

## Requisitos Core
- ✅ Login con user_code + password
- ✅ Escáner de códigos de barras (html5-qrcode)
- ✅ Cotizador con lógica de precios:
  - 1-11 unidades: Precio 3
  - 12+ unidades: Precio 2
  - Bulto (toggle): Precio 1
- ✅ Generación de PDF (jspdf)
- ✅ Compartir vía Web Share API / WhatsApp
- ✅ Panel Admin con métricas
- ✅ CRUD de productos con carga masiva Excel/CSV
- ✅ Gestión de usuarios

## Implementado (25 Feb 2026)
- [x] Backend FastAPI con 15+ endpoints
- [x] Frontend React PWA con manifest.json y Service Worker
- [x] Login page con diseño elegante
- [x] Scanner page con html5-qrcode
- [x] Quoter page con cálculo automático de precios
- [x] Admin Dashboard con métricas
- [x] Admin Products con tabla y carga masiva
- [x] Admin Users con CRUD completo
- [x] 57 productos cargados desde Excel
- [x] Tests: 28 backend + 35 frontend (100% passing)

## Backlog P0
- [ ] Modal de producto en escáner con botón "Agregar a cotización"
- [ ] Historial de cotizaciones del usuario

## Backlog P1
- [ ] Notificaciones push
- [ ] Modo offline completo
- [ ] Exportar métricas a Excel

## Credenciales de Prueba
- Admin: `admin` / `admin123`
- Empleado: `empleado1` / `emp123`
