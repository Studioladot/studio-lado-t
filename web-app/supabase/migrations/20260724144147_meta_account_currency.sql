-- Persiste la moneda real de la cuenta publicitaria de Meta (ya se pedía a
-- la Graph API en el flujo de conexión — src/lib/meta/accounts.ts — pero se
-- descartaba después de elegir la cuenta). Sin esto, la app no puede saber
-- si mostrar $ o US$ como moneda principal sin volver a pedirle a Meta en
-- cada carga de página.
alter table meta_connections add column if not exists account_currency text;
