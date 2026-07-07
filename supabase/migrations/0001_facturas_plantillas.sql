-- Plantillas, facturas y movimientos (abonos/cargos)
-- Ejecutar en el SQL Editor de Supabase (Dashboard > SQL Editor)

create table if not exists plantillas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  schema jsonb not null,
  created_by uuid not null references auth.users(id) default auth.uid(),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists facturas (
  id uuid primary key default gen_random_uuid(),
  plantilla_id uuid references plantillas(id),
  cliente text not null,
  concepto text not null,
  monto_total numeric(12,2) not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagada')),
  created_by uuid not null references auth.users(id) default auth.uid(),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists movimientos (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid not null references facturas(id) on delete cascade,
  monto numeric(12,2) not null,
  metodo_pago text,
  nota text,
  created_by uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists movimientos_factura_id_idx on movimientos(factura_id);
create index if not exists facturas_updated_at_idx on facturas(updated_at desc);

-- updated_at / updated_by automáticos
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$ language plpgsql;

drop trigger if exists plantillas_set_updated_at on plantillas;
create trigger plantillas_set_updated_at
  before update on plantillas
  for each row execute function set_updated_at();

drop trigger if exists facturas_set_updated_at on facturas;
create trigger facturas_set_updated_at
  before update on facturas
  for each row execute function set_updated_at();

-- saldo/estado se recalculan cuando cambian los movimientos
create or replace function refresh_factura_estado()
returns trigger as $$
declare
  target_factura_id uuid;
  saldo numeric(12,2);
begin
  target_factura_id := coalesce(new.factura_id, old.factura_id);

  select f.monto_total + coalesce(sum(m.monto), 0)
    into saldo
    from facturas f
    left join movimientos m on m.factura_id = f.id
    where f.id = target_factura_id
    group by f.monto_total;

  update facturas
    set estado = case when saldo <= 0 then 'pagada' else 'pendiente' end,
        updated_at = now()
    where id = target_factura_id;

  return null;
end;
$$ language plpgsql;

drop trigger if exists movimientos_refresh_estado on movimientos;
create trigger movimientos_refresh_estado
  after insert or update or delete on movimientos
  for each row execute function refresh_factura_estado();

-- RLS: cada usuario ve/edita solo lo suyo
alter table plantillas enable row level security;
alter table facturas enable row level security;
alter table movimientos enable row level security;

create policy "plantillas_own" on plantillas
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "facturas_own" on facturas
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "movimientos_own" on movimientos
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());

alter table facturas add column if not exists inputs jsonb not null default '{}'::jsonb;
