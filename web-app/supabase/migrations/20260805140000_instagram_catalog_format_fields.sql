-- Bug real reportado (2026-08-01): la UI no podía distinguir Reels de
-- video de feed normal ni de carrusel/imagen — media_type (IMAGE/VIDEO/
-- CAROUSEL_ALBUM) no alcanza para eso, hace falta media_product_type
-- (FEED/REELS/STORY/...) que la Graph API expone aparte. Se agrega acá en
-- vez de forzarlo dentro de media_type para no perder la distinción
-- original de ninguno de los dos campos.
alter table instagram_media_catalog
  add column if not exists media_product_type text;
