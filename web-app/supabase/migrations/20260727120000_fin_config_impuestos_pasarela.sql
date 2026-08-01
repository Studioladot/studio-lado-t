-- Ledger Neto / Radiografía de la Orden (2026-07-27) — el modal de detalle
-- por orden necesita separar "Comisión Tienda Nube" de "Comisión pasarela"
-- (medio de pago) y sumar "Impuestos" como línea propia; hasta ahora
-- fin_config solo tenía comisión_tn_pct, que se usaba para ambas cosas.
alter table fin_config add column if not exists impuestos_pct numeric;
alter table fin_config add column if not exists pasarela_pct numeric;
