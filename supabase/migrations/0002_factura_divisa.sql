-- Divisa de la factura: todos sus montos (total, saldo, movimientos) se interpretan en ella.
alter table facturas
  add column if not exists divisa text not null default 'MXN'
  check (divisa in ('MXN', 'USD', 'EUR', 'GBP', 'COP'));
