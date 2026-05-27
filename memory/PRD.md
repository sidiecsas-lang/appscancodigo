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

## Implementado (27 May 2026)
- [x] CAMBIO 1: Nuevos campos en proforma: client_id_number (Cédula/RUC) y client_city (Ciudad)
  - Backend: QuoteCreate, QuoteResponse, QuoteItemResponse actualizados
  - Frontend: QuoterPage.js con nuevos campos en formulario, ProformasPage.js muestra los campos en detalle
  - PDF incluye Cédula/RUC y Ciudad del cliente
- [x] CAMBIO 2: Nombre del vendedor en PDF (ya existía, se mantuvo + se agregaron nuevos campos)
- [x] CAMBIO 3: Edición de proforma ya generada
  - Backend: PUT /api/quotes/{quote_id}/items (solo edita si status != 'pagado')
  - Frontend: Botón 'Editar Proforma' + modal completo con búsqueda de productos y edición de ítems
  - Botón 'Descargar PDF actualizado' aparece tras guardar
- [x] CAMBIO 4: Solo Precio 1 + precio manual opcional por ítem
  - Se eliminó lógica bulto/precio2/precio3 del cotizador
  - Ícono lápiz para editar precio, badge 'Precio especial' cuando es diferente
  - ScannerPage modal solo muestra Precio 1
  - Backend: QuoteItemCreate.manual_price, price_was_manual en items

## Backlog P0
- [ ] Historial de cotizaciones del usuario (vista paginada)

## Backlog P1
- [ ] Landing page pública para instalación de la PWA
- [ ] Notificaciones push para proformas vencidas
- [ ] Modo offline completo
- [ ] Exportar métricas a Excel

## Deuda Técnica
- [ ] Service Worker: cache names estáticos no coinciden con hashes de CRA en producción (usar workbox)
- [ ] Íconos PWA: mismo PNG para 192 y 512 (generar resoluciones reales)
- [ ] Backend monolítico en server.py (separar routes/, models/, services/)
- [ ] JWT_SECRET con fallback hardcodeado (quitar fallback)

## Credenciales de Prueba
- Admin: `admin` / `admin123`
- Empleado: `empleado1` / `emp123`
