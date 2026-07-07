# Plan de integración — Plantillas + Facturas + Navbar

## Contexto

App de cobranza. Flujo real del negocio (ver `notas.md`): se cobra un monto
total por un concepto (ej. paquete vacacional), el cliente abona en partes,
y cada abono genera un nuevo documento con el saldo actualizado hasta llegar
a cero. Esto se implementa como **Facturas** con **movimientos** (abonos/ajustes).

## Alcance de esta fase

1. Navbar con 3 secciones: Home, Mis plantillas, Factura
2. Editor visual de plantillas PDF (`@pdfme/ui` Designer)
3. Flujo de Facturas: crear desde plantilla, o modificar una existente
   agregando/descontando montos, generando PDF con `@pdfme/generator`

## Dependencias nuevas

- `@pdfme/ui` — Designer visual (drag-and-drop de textos/imágenes sobre el PDF)

## Modelo de datos (Supabase / Postgres)

```sql
create table plantillas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  schema jsonb not null,        -- Template pdfme: basePdf + schemas (posiciones/campos)
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table facturas (
  id uuid primary key default gen_random_uuid(),
  plantilla_id uuid references plantillas(id),
  cliente text not null,
  concepto text not null,
  monto_total numeric(12,2) not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagada')),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table movimientos (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid not null references facturas(id) on delete cascade,
  monto numeric(12,2) not null,  -- positivo = abono, negativo = descuento/ajuste
  metodo_pago text,
  nota text,
  created_at timestamptz not null default now()
);
```

- Saldo de una factura = `monto_total - suma(movimientos.monto)` (o `+` si se
  modela como resta directa — decidir signo al implementar, mantener
  consistente con "abono" restando saldo).
- Trigger o cálculo en frontend para marcar `estado = 'pagada'` cuando saldo
  llega a 0. Empezar con cálculo en frontend; mover a trigger SQL si se
  necesita consistencia multi-cliente.
- RLS: políticas por `created_by = auth.uid()` en las 3 tablas (pendiente
  confirmar si la app es single-tenant o multi-usuario con datos separados).

## Storage

- Bucket `plantillas-assets` para imágenes que el usuario sube al crear
  una plantilla (logos, firmas, etc). El PDF generado (factura final) se
  genera on-the-fly en el navegador, no necesita guardarse salvo que se
  quiera histórico descargable — **decidir**: ¿guardamos el PDF generado
  en Storage por cada movimiento, o se regenera on-demand?

## Navbar / Rutas

```
/                    Home
/facturas            Listado completo de facturas
/plantillas          Listado de plantillas
/plantillas/nueva    Designer (crear plantilla)
/plantillas/:id      Designer (editar plantilla existente)
/facturas/nueva      Elegir plantilla → llenar datos → generar factura
/facturas/:id        Ver factura existente, historial de movimientos,
                     agregar/descontar monto, regenerar PDF
```

Todas protegidas por el guard de auth ya existente.

## Componentes nuevos

- `components/AppNavbar.vue` — navbar persistente en `App.vue`
- `views/HomeView.vue` (rehacer) — últimos 10 (por `updated_at`), botón
  "ver todas" → `/facturas`
- `views/facturas/FacturasListView.vue` — listado completo
- `views/facturas/FacturaFormView.vue` — crear/editar factura, registrar
  movimientos, botón generar/descargar PDF
- `views/plantillas/PlantillasListView.vue` — listado de plantillas
- `views/plantillas/PlantillaEditorView.vue` — wrapper del Designer de
  `@pdfme/ui`, guarda `schema` (JSON) en Supabase
- `stores/facturas.ts`, `stores/plantillas.ts` — pinia stores con CRUD
  contra Supabase
- `utils/pdf.ts` — wrapper de `@pdfme/generator` para generar el PDF final
  combinando `plantilla.schema` + datos de la factura

## Orden de implementación

1. Migraciones SQL (3 tablas + RLS) en Supabase
2. Instalar `@pdfme/ui`, montar Designer básico guardando schema en blanco
3. Navbar + rutas + guard (reutiliza el de auth ya existente)
4. CRUD plantillas (crear, listar, editar con Designer)
5. CRUD facturas: crear desde plantilla, listar, ver detalle
6. Movimientos: agregar/descontar monto, recalcular saldo, marcar pagada
7. Generación de PDF final con `@pdfme/generator` usando datos de la factura
8. Home: query últimos 10 + botón ver todas

## Decisiones tomadas (defaults para arrancar)

- **Signo de `movimientos.monto`**: `saldo = monto_total + suma(movimientos.monto)`.
  Abono/descuento se guarda **negativo** (reduce saldo). Cargo extra se
  guarda **positivo** (incrementa saldo). UI expone dos acciones:
  "Registrar abono" (negativo) y "Agregar cargo" (positivo).
- **RLS**: por `created_by = auth.uid()` en las 3 tablas — cada usuario
  ve solo lo suyo. Fácil de relajar después si se necesita compartir.
- **Auditoría**: `plantillas` y `facturas` llevan `created_by` +
  `updated_by` (seteado automático en cada `update`). `movimientos` solo
  `created_by` (son inmutables, no se editan). Así se puede filtrar por
  usuario si hay más de uno creando plantillas/facturas.
- **PDF**: se regenera on-demand en el navegador combinando
  `plantilla.schema` + datos de la factura/movimientos. No se guarda en
  Storage por ahora (menos complejidad, sin costo de storage).
- **Concepto**: texto libre (ej. "Paquete vacacional"), sin estructura fija.
- **Campos custom de plantilla**: la plantilla define campos de
  texto/imagen/tabla con nombre libre. Si el nombre contiene (sin llaves,
  sin importar mayúsculas) "cliente", "concepto", "monto"/"total", "saldo"
  o "fecha" (ej. `{cliente_nombre}`), se auto-llena y sincroniza en vivo
  con lo ya capturado en la factura — no se vuelve a pedir. El resto de
  campos sí se muestra en un formulario dinámico (uno por campo, leyendo
  `plantilla.schema`) para que el usuario los llene/edite cada vez.
  Ver `matchCampoReservado` en `utils/pdf.ts`.
  Los valores se guardan en `facturas.inputs`
  (jsonb) para poder regenerar el PDF sin re-preguntar, pero siguen siendo
  editables antes de cada "Generar PDF".

## Tabla de trackeo y progreso

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 1 | Migraciones SQL (plantillas, facturas, movimientos + RLS) | Hecho | corrida por el usuario en Supabase |
| 2 | Instalar `@pdfme/ui` | Hecho | |
| 3 | Navbar + rutas nuevas | Hecho | `AppNavbar.vue`, oculto en `/login` |
| 4 | CRUD plantillas (listado + Designer crear/editar) | Hecho | `stores/plantillas.ts`, `PlantillaEditorView.vue` |
| 5 | `utils/pdf.ts` (wrapper `@pdfme/generator`) | Hecho | + `buildInputsFromFactura` (campos reservados) |
| 6 | CRUD facturas (crear desde plantilla, listar, detalle) | Hecho | `stores/facturas.ts`, `FacturaFormView.vue` |
| 7 | Movimientos (agregar/descontar, recalcular saldo, marcar pagada) | Hecho | saldo/estado vía trigger SQL |
| 8 | Home: últimos 10 + botón ver todas | Hecho | |
| 9 | Decisiones abiertas resueltas (signo monto, RLS, storage PDF, campos concepto) | Hecho | ver sección "Decisiones tomadas" |

### Pendiente de probar en vivo

- Flujo completo: crear plantilla → crear factura con esa plantilla →
  registrar abono → generar PDF → confirmar que los campos reservados
  (`cliente`, `concepto`, `monto_total`, `saldo`, etc.) aparecen si la
  plantilla tiene campos de texto con esos nombres exactos.
- Confirmar que el trigger SQL marca `estado = 'pagada'` cuando el saldo
  llega a 0.

Actualizar estado a `En progreso` / `Hecho` / `Bloqueado` conforme se avance.
