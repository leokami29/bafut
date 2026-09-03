-- Barranquilla venue enrichment from Google Maps scrape (2026-09-02)
-- Source: gosom/google-maps-scraper via google-maps-scraper skill

insert into public.venues (
  city_id, slug, name, neighborhood, address, lat, lng, sports, surface, covered, venue_kind, notes
)
select c.id, v.slug, v.name, v.neighborhood, v.address, v.lat, v.lng, v.sports, v.surface, v.covered, v.venue_kind, v.notes
from public.cities c
cross join (
  values
    ('cancha-sintetica-la-patiada', 'Cancha Sintética La Patiada', 'Boyacá', 'Cra. 20 #30-123, Sur Orient, Barranquilla, Atlántico', 10.957095299999999, -74.78698059999999, array['futbol', 'futbol_sala']::text[], 'sintetica', null::boolean, 'alquiler', 'Cancha de fútbol sala. ★ 4.3 (627 reseñas). Tel: 301 4258786'),
    ('cancha-el-moderno', 'Cancha el Moderno', 'Villa Blanca', 'Cisneros, Barranquilla, Atlántico', 10.934203799999999, -74.7958499, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4.5 (217 reseñas)'),
    ('la-8-fc-cancha-sintetica', 'La 8 FC Cancha Sintética.', 'La Magdalena', 'Cra. 8 #38b-51, La Magdalena, Barranquilla, Atlántico', 10.9456989, -74.7947626, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4.5 (975 reseñas). Tel: 300 2292969'),
    ('cancha-san-martin-7-de-abril', 'Cancha San Martin 7 De Abril', 'Siete De Abril', 'Metropolitana, Barranquilla, Atlántico', 10.930296799999999, -74.813447, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4.2 (54 reseñas)'),
    ('la-21-futbol-club', 'La 21 Fútbol Club', 'Suroccidente', 'Cra 21B #58-71, Suroccidente, Barranquilla, Atlántico', 10.9683139, -74.8028465, array['futbol']::text[], 'sintetica', null::boolean, 'club', 'Campo de fútbol. ★ 4.6 (462 reseñas). Tel: 316 4726166'),
    ('cancha-de-futbol-barrio-la-sierra', 'Cancha de Fútbol Barrio La Sierra', 'Cevillar', 'Cl. 46 #14-4, Cevillar, Barranquilla, Atlántico', 10.9567525, -74.80217689999999, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4.1 (1165 reseñas). Tel: 320 5693841'),
    ('cancha-de-futbol-la-victoria', 'Cancha de Fútbol La Victoria', 'Metropolitana', 'a 45b 3-56,, Cra. 10 #45b 3-2, Barranquilla, Atlántico', 10.9527409, -74.7996194, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4.5 (656 reseñas)'),
    ('cancha-de-futbol-sintetica-del-bosque', 'Cancha de fútbol sintética del bosque', 'El Bosque', 'El Bosque, Barranquilla, Atlántico', 10.9524972, -74.8189816, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 3.7 (3 reseñas)'),
    ('cancha-de-futbol-5-hermanos-almendros', 'Cancha de Fútbol 5 Hermanos Almendros', 'Los Almendros', 'Cra. 18d #80-3, Soledad, Barranquilla, Atlántico', 10.9179851, -74.8162699, array['futbol', 'futbol_sala']::text[], 'sintetica', null::boolean, 'alquiler', 'Cancha de fútbol sala'),
    ('cancha-de-futbol-nueva-granada', 'Cancha de Fútbol Nueva Granada', 'Nueva Granada', 'Esquina, Cra. 29 #Calle 65, El Recreo, Barranquilla', 10.9785203, -74.80454399999999, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4.3 (723 reseñas)'),
    ('cancha-sintetica-rojiblanca', 'Cancha Sintética Rojiblanca', 'Villas Del Recreo', 'Cl. 56 #41a112 #41a- a, Nte. Centro Historico, Barranquilla, Atlántico', 10.9838908, -74.7941152, array['futbol', 'futbol_sala']::text[], 'sintetica', null::boolean, 'alquiler', 'Cancha de fútbol sala. ★ 4.5 (275 reseñas). Tel: (605) 3781958'),
    ('cancha-de-futbol-los-mosquitos', 'Cancha de Fútbol Los Mosquitos', 'La Sierra', 'Calle 40 entre carrera 13c y 9c #sn, La Sierra, Barranquilla, Atlántico', 10.951699399999999, -74.7955508, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4.3 (173 reseñas)'),
    ('cancha-de-futbol-la-magdalena', 'Cancha de Fútbol La Magdalena', 'La Magdalena', 'a 37c-127,, Cra. 7c #37c1, Barranquilla, Atlántico', 10.943237, -74.7933193, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4.3 (1483 reseñas). Tel: 304 3704222. Web: https://moovitapp.com/index/es-419/transporte_p%C3%BAblico-Canchas_De_La_Magdalena-Barranquilla-site_8968368-2883'),
    ('canchas-el-tiburon', 'Canchas El Tiburón', 'Chiquinquirá', 'Murillo Toro #36-36, Sur Orient, Barranquilla, Atlántico', 10.978493199999999, -74.7872513, array['futbol', 'futbol_sala']::text[], 'sintetica', null::boolean, 'alquiler', 'Cancha de fútbol sala. ★ 4.4 (519 reseñas). Tel: 53793131'),
    ('cancha-de-microfutbol-los-andes', 'Cancha de Microfútbol — Los Andes', 'Villa Carmen', 'Con Calle 64 y Carrera 25, Cl. 63c #S/N, Los Andes, Barranquilla, Atlántico', 10.9721862, -74.8054746, array['futbol', 'futbol_sala']::text[], 'sintetica', null::boolean, 'alquiler', 'Cancha de fútbol sala. ★ 3.8 (9 reseñas)'),
    ('cancha-la-tiburona-sas', 'Cancha La Tiburona SAS', 'El Rosario', 'Av. Murillo #43-120, Suroccidente, Barranquilla, Atlántico', 10.9867641, -74.7834608, array['futbol', 'futbol_sala']::text[], 'sintetica', null::boolean, 'alquiler', 'Cancha de fútbol sala. ★ 4.3 (374 reseñas). Tel: 300 3483985'),
    ('cancha-sintetica-de-futbol-bosques-del-norte', 'Cancha Sintetica de Futbol - Bosques del Norte', 'Altos de Riomar', 'Riomar, Barranquilla, Atlántico', 11.0136898, -74.8229925, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4.8 (6 reseñas)'),
    ('cancha-ringo-makro-club-deportivo', 'Cancha Ringo Makro Club Deportivo', 'Riomar', 'Cra. 52 #106 200, Riomar, Barranquilla, Atlántico', 11.0166114, -74.8361298, array['futbol']::text[], 'sintetica', null::boolean, 'club', 'Campo de fútbol. ★ 4.8 (9 reseñas). Tel: 304 4366666'),
    ('fsb-la-cancha', 'FSB La Cancha', 'Belo Horizonte', '080003, Barranquilla, Atlántico', 11.0138195, -74.79698719999999, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4.6 (667 reseñas). Tel: 300 8438975'),
    ('cancha-7-bocas', 'Cancha 7 Bocas', 'Metropolitana', 'PUNTO FRIO, PUNTO FRIO 7 BOCAS, TIENDA, Cl. 53a #2-2, Metropolitana, Barranquilla, Atlántico', 10.9366845, -74.815754, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 3.9 (9 reseñas). Web: http://www.sede.uno/'),
    ('soccer-house', 'Soccer House', 'Villa Campestre', 'Carrera 25 &, Cl. 3, Sabanilla Montecarmelo, Barranquilla, Atlántico', 11.023818, -74.8612076, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4.5 (8 reseñas). Tel: 310 7660001. Web: https://www.instagram.com/soccerhousebq'),
    ('cancha-de-futbol-del-carmen', 'Cancha De Fútbol Del Carmen', 'El Carmen', 'Carrera 21, Esquina 53B #S/N, El Carmen, Barranquilla, Atlántico', 10.9657325, -74.7990506, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4.5 (549 reseñas)'),
    ('cancha-de-futbol-el-pana', 'Cancha de Fútbol El Pana', 'Las Americas', 'Las Americas, Barranquilla, Atlántico', 10.939478399999999, -74.8143766, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4 (2 reseñas)'),
    ('cancha-del-brasil', 'Cancha del brasil', 'Metropolitana', 'Cr. De La Cordialidad #5c28, Barranquilla, Atlántico', 10.9484155, -74.8126381, array['futbol']::text[], 'sintetica', null::boolean, 'alquiler', 'Campo de fútbol. ★ 4.5 (12 reseñas)'),
    ('canchas-de-futbol-napoleon-salcedo-cotes', 'Canchas de Fútbol Napoleón Salcedo Cotes', 'Olaya', 'Con Carrera 30, Cl. 70b #S/N, El Recreo, Barranquilla, Atlántico', 10.979739, -74.8095871, array['futbol', 'futbol_sala']::text[], 'sintetica', null::boolean, 'alquiler', 'Cancha de fútbol sala. ★ 4.5 (2 reseñas)'),
    ('club-de-leones', 'Cancha Club de Leones', 'Norte Centro Histórico', 'Cra. 38 #66-90 Loc 3, Norte Centro Histórico, Barranquilla', 10.9837765, -74.8025051, array['futbol', 'futbol_sala']::text[], 'sintetica', null::boolean, 'club', 'Cancha de fútbol sala. ★ 4.2 (219 reseñas). Tel: 53608401')
) as v(slug, name, neighborhood, address, lat, lng, sports, surface, covered, venue_kind, notes)
where c.slug = 'barranquilla'
on conflict (city_id, slug) do nothing;

update public.venues set address = 'Cra. 3 #Calle 45D, Ciudadela 20 de Julio, Barranquilla, Atlántico', lat = 10.9356476, lng = -74.80072969999999
where slug = 'mundialito'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set address = 'Cl. 77 #58-53, Nte. Centro Historico, Barranquilla, Atlántico', lat = 11.0061857, lng = -74.8019, notes = coalesce(notes || ' | ', '') || 'Google Maps: Centro de deportes de aventura. ★ 4.4 (238 reseñas). Tel: 301 3790228. Web: https://www.facebook.com/profile.php?id=100003397476358'
where slug = 'zoccer-plaza'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set address = 'entre carrera 5 y carrera 4C, Cl. 23, Simón Bolívar, Barranquilla, Atlántico', lat = 10.9427129, lng = -74.77830159999999
where slug = 'simon-bolivar'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set address = 'Carrera 24 Esquina 53D #sn, San Isidro, Barranquilla, Atlántico', lat = 10.970743299999999, lng = -74.7991675
where slug = 'san-isidro'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set address = 'Cra. 1c 1 #01 # 46, Los Corales, Barranquilla, Atlántico', lat = 10.9300546, lng = -74.801506, notes = coalesce(notes || ' | ', '') || 'Google Maps: Parque deportivo. ★ 4.6 (553 reseñas). Tel: 315 6342122'
where slug = 'pibe-valderrama'
  and city_id = (select id from public.cities where slug = 'barranquilla');
