-- Barranquilla multi-sport venue enrichment (Google Maps scrape 2026-09-02)
-- Queries: tmp/gmaps-bafut-sports-queries.txt
-- Sports: basquet, voleibol, padel, futbol_sala (+ enrich existing futbol venues)

insert into public.venues (
  city_id, slug, name, neighborhood, address, lat, lng, sports, surface, covered, venue_kind, notes
)
select c.id, v.slug, v.name, v.neighborhood, v.address, v.lat, v.lng, v.sports, v.surface, v.covered, v.venue_kind, v.notes
from public.cities c
cross join (
  values
    ('cancha-sintetica-brasileirao', 'Cancha Sintética Brasileirao', 'Norte Centro Historico', 'Cra. 46 #76-109, Nte. Centro Historico, Barranquilla, Atlántico', 10.9971569, -74.81114389999999, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 4.4 (530 reseñas). Tel: 312 8603063'),
    ('canchas-sinteticas-la-27', 'Canchas sinteticas la 27', 'Por Fin', 'Cra. 27 #84-131, Suroccidente, Barranquilla, Atlántico', 10.9770681, -74.8286999, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 4.6 (43 reseñas). Tel: 300 8003198'),
    ('club-de-voleibol-ballbreakers', 'Club de voleibol Ballbreakers', 'Ciudad Jardín', 'Parque sagrado corazon, Cra. 42F #80-117, Las Mercedes, Barranquilla, Atlántico', 10.993693799999999, -74.818179, array['voleibol']::text[], 'dura', null, 'club', 'Sports club. ★ 5 (2 reseñas). Tel: 304 5280739. Web: https://www.instagram.com/ballbreakersclub/'),
    ('liga-de-voleibol-del-atlantico', 'Liga De Voleibol Del Atlántico', 'Montecristo', 'Cl. 52 #55-75, Nte. Centro Historico, Barranquilla, Atlántico', 10.9949043, -74.7888244, array['voleibol']::text[], 'dura', null, 'club', 'Sports club. ★ 4 (241 reseñas). Tel: 324 5261631. Web: https://ligadevoleiboldelatlantico.com/'),
    ('elements-voley-club', 'Elements Voley Club', 'La Campiña', 'Venezuela Park, Nte. Centro Historico, Barranquilla, Atlántico', 11.0019078, -74.824383, array['voleibol']::text[], 'dura', null, 'club', 'Volleyball club. ★ 5 (137 reseñas). Tel: 300 6174876'),
    ('polideportivo-el-eden-park', 'Polideportivo El Edén Park', 'Villas de Las Colinas', 'Carrera 27 &, Cl. 86b, Suroccidente, Barranquilla, Atlántico', 10.9765049, -74.8318974, array['futbol', 'basquet', 'voleibol']::text[], 'dura', null, 'publica', 'City park. ★ 4.5 (254 reseñas). Tel: 310 8300590'),
    ('polideportivo-de-los-robles', 'Polideportivo de Los Robles', 'Los Robles', 'Cl. 76 #23d-25, Soledad, Barranquilla, Atlántico', 10.921364299999999, -74.8088923, array['futbol', 'basquet', 'voleibol']::text[], 'dura', null, 'publica', 'Park. ★ 4.5 (1027 reseñas)'),
    ('campo-de-voleibol-playa', 'Campo De Voleibol Playa', 'Norte Centro Historico', 'Cl. 77 Bis #82-317, Nte. Centro Historico, Barranquilla, Sitionuevo, Atlántico', 11.0179361, -74.79082079999999, array['voleibol']::text[], 'dura', false, 'alquiler', 'Beach volleyball court. ★ 4.7 (3 reseñas)'),
    ('club-de-baloncesto-cocodrilos-de-barranquilla', 'Club de Baloncesto Cocodrilos de Barranquilla', 'Betania', 'Parque Betania norte de la ciudad, Cra. 38a #75B esquina, Las Mercedes, Barranquilla, Atlántico', 10.9873431, -74.8142227, array['basquet']::text[], 'dura', null, 'club', 'Sports school. ★ 4.9 (9 reseñas). Tel: 315 6845884'),
    ('voleibol-club-aston-quilla-voley', 'Voleibol Club Aston Quilla voley', 'Santa Ana', 'Cl. 68 #64, San Francisco, Barranquilla, Atlántico', 11.0010125, -74.7918306, array['voleibol']::text[], 'dura', null, 'club', 'Sports club. ★ 5 (8 reseñas)'),
    ('cancha-multiple-del-eden', 'Cancha multiple del Edén', 'Villas de Las Colinas', 'Carrera 27 &, Cl. 86b, Suroccidente, Barranquilla, Atlántico', 10.9766304, -74.83203809999999, array['voleibol']::text[], 'dura', null, 'alquiler', 'Volleyball court'),
    ('cancha-de-voleibol-villa-santos', 'Cancha De Voleibol Villa Santos', 'Villa Santos', 'Riomar, Barranquilla, Atlántico', 11.0110323, -74.82957069999999, array['voleibol']::text[], 'dura', null, 'alquiler', 'Volleyball court. ★ 1 (1 reseñas)'),
    ('padel-zenter-del-rio', 'Padel Zenter Del RIO', 'Riomar', 'Via 40 #85-630, Riomar, Barranquilla, Atlántico', 11.031772499999999, -74.8064406, array['padel']::text[], 'sintetica', null, 'club', 'Padel club. ★ 4.4 (50 reseñas). Tel: 324 5051152. Web: http://www.padelzenter.co/'),
    ('padel-park', 'Padel Park', 'Alto Prado', 'Cra. 51 #82-98, Nte. Centro Historico, Barranquilla, Atlántico', 11.0042668, -74.815665, array['padel']::text[], 'sintetica', null, 'club', 'Padel club. ★ 4.9 (8 reseñas)'),
    ('casa-padel-patio', 'CASA PADEL PATIO', 'Villa Campestre', 'Cl. 135 #56-80, Sabanilla Montecarmelo, Barranquilla, Atlántico', 11.0268568, -74.8620633, array['padel']::text[], 'sintetica', null, 'club', 'Athletic club. ★ 4.6 (14 reseñas). Tel: 313 2689016. Web: https://reservadeportes.com/Casapadel.html?domain=CO'),
    ('padel-zenter-la-arenosa', 'Padel Zenter La Arenosa', 'El Castillo I', 'Cl. 79 #73-360, Riomar, Barranquilla, Atlántico', 11.018877699999999, -74.8001675, array['padel']::text[], 'sintetica', null, 'club', 'Sports club. ★ 4.3 (10 reseñas). Tel: 301 1884688'),
    ('rooftop-padel-club', 'Rooftop Padel Club', 'Barranquilla', 'Centro Comercial Plaza Campestre, Cra. 51B #2C-118 Loc D1, Sabanilla Montecarmelo, Barranquilla, Atlántico', 11.0177599, -74.8596629, array['padel']::text[], 'sintetica', null, 'club', 'Sports club. ★ 5 (4 reseñas)'),
    ('x3-padel-club', 'X3 Padel Club', 'Villa Country', 'Cl. 78 #53 - 70, Nte. Centro Historico, Barranquilla, Atlántico', 11.0042098, -74.8062688, array['padel']::text[], 'sintetica', null, 'club', 'Sports club. ★ 4.7 (3 reseñas). Tel: 311 4530579'),
    ('padelya', 'PadelYa', 'Aremay', 'Cra. 58 #CL 96 141, Riomar, Barranquilla, Atlántico', 11.0166133, -74.8230772, array['padel']::text[], 'sintetica', null, 'club', 'Padel club. Tel: 318 7474092'),
    ('cancha-de-baloncesto-las-palmas', 'Cancha de Baloncesto Las Palmas', 'Las Palmas', '#5a- a 5a-104,, Cl. 37c #5a58, Barranquilla, Atlántico', 10.9402865, -74.791896, array['basquet']::text[], 'dura', null, 'alquiler', 'Basketball court. ★ 4.2 (61 reseñas)'),
    ('cancha-basquetbol', 'Cancha Basquetbol', 'Las Flores', 'Riomar, Barranquilla, Atlántico', 11.0415888, -74.8257172, array['basquet']::text[], 'dura', null, 'alquiler', 'Basketball court. ★ 3 (1 reseñas)'),
    ('club-de-baloncesto-tiburones', 'Club de baloncesto Tiburones', 'Riomar', 'Cra. 64B #85, Riomar, Barranquilla, Atlántico', 11.0140057, -74.8137789, array['basquet']::text[], 'dura', null, 'club', 'Basketball club. ★ 5 (9 reseñas). Tel: 305 4118044'),
    ('cancha-villa-santos', 'Cancha Villa Santos', 'Villa Santos', 'Cra. 51B #98-241, Riomar, Barranquilla, Atlántico', 11.0111955, -74.8303746, array['basquet']::text[], 'dura', null, 'alquiler', 'Basketball court'),
    ('club-de-baloncesto-aguilas-azules', 'Club de baloncesto Águilas Azules', 'Campo Alegre', 'Cra. 40a #93 - 2, Nte. Centro Historico, Barranquilla, Atlántico', 10.9854247, -74.8351362, array['basquet']::text[], 'dura', null, 'club', 'Basketball club. ★ 5 (5 reseñas). Tel: 300 3586510'),
    ('cancha-de-baloncesto-los-cachorros', 'Cancha de Baloncesto Los Cachorros', 'Villa Country', 'Cra. 60, Paraiso, Barranquilla, Atlántico', 11.008369799999999, -74.8038748, array['basquet']::text[], 'dura', null, 'alquiler', 'Basketball court. ★ 4.4 (51 reseñas). Tel: 53733096'),
    ('club-deportivo-snow-volley-barranquilla', 'Club deportivo Snow Volley Barranquilla', 'Los Trupillos', 'Cra. 21 #28- 16, Sur Orient, Barranquilla, Atlántico', 10.9583634, -74.7834725, array['voleibol']::text[], 'dura', null, 'club', 'Volleyball club. ★ 5 (3 reseñas). Web: https://instagram.com/snow_volley?igshid=YmMyMTA2M2Y='),
    ('cancha-de-microfutbol-las-gardenias', 'CANCHA DE MICROFUTBOL LAS GARDENIAS', 'Metropolitana', 'Metropolitana, Barranquilla, Atlántico', 10.9347333, -74.82867, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 5 (4 reseñas)'),
    ('cancha-de-microfutbol-adelita-de-char', 'Cancha De Microfútbol Adelita De Char', 'Eduardo Santos', 'a 19a-20,, Cra. 17c #192, Barranquilla, Atlántico', 11.032003699999999, -74.8710061, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 4.1 (111 reseñas)'),
    ('canchas-de-piso-los-manantiales', 'Canchas De Piso Los Manantiales', 'Barranquilla', 'Cl. 73 #12, Soledad, Barranquilla, Atlántico', 10.9024403, -74.81105769999999, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 4.9 (7 reseñas)'),
    ('cancha-de-cemento', 'Cancha de Cemento', 'La Sierra', 'La Sierra, Barranquilla, Atlántico', 10.9562946, -74.80136519999999, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 5 (2 reseñas)'),
    ('cancha-de-futbol-sala-caribe-campestre', 'Cancha de fútbol sala caribe campestre', 'Suroccidente', 'Carrera 28 #142-79, Suroccidente, Barranquilla, Atlántico', 10.9599852, -74.8632076, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Stadium'),
    ('cancha-de-futbol-las-flores', 'Cancha de Fútbol Las Flores', 'Las Flores', 'Cra. 87 #10733, Riomar, Barranquilla, Atlántico', 11.0419585, -74.8259906, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 4.4 (62 reseñas)'),
    ('cancha-la-19', 'Cancha La 19', 'El Carmen', 'Carrera 19D, esquina Calle 49 #49, El Carmen, Barranquilla, Atlántico', 10.9636493, -74.7985783, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 4.1 (9 reseñas)'),
    ('park-renowitzky-2', 'Park Renowitzky 2', 'Ciudadela 20 de Julio', '# a 46a-74,, Cra 1C #462, Barranquilla, Atlántico', 10.9311759, -74.8030242, array['basquet']::text[], 'dura', null, 'alquiler', 'Basketball court. ★ 4 (153 reseñas). Tel: 322 2222222'),
    ('cancha-de-baloncesto-titanes', 'Cancha de Baloncesto Titanes', 'Barranquilla', 'Carrera 60 Barranquilla Barranquilla Paraiso', 11.008369799999999, -74.8038748, array['basquet']::text[], 'dura', null, 'alquiler', '★ 5 (4 reseñas). Tel: 300 3977089'),
    ('cancha-multiple-nuestra-senora-de-guadalupe', 'Cancha Múltiple Nuestra Señora De Guadalupe', 'Los Corales', 'Cra. 8a Sur #47a2, Los Corales, Barranquilla, Atlántico', 10.9269596, -74.8060785, array['basquet']::text[], 'dura', null, 'alquiler', 'Basketball court'),
    ('polideportivo-la-paz', 'Polideportivo La Paz', 'La Paz', 'Cra. 13 #1001, Suroccidente, Barranquilla, Atlántico', 10.9650463, -74.83256469999999, array['futbol', 'basquet', 'voleibol']::text[], 'dura', null, 'publica', 'Recreation center. ★ 4.2 (120 reseñas)')
) as v(slug, name, neighborhood, address, lat, lng, sports, surface, covered, venue_kind, notes)
where c.slug = 'barranquilla'
on conflict (city_id, slug) do nothing;

update public.venues set sports = (select array_agg(distinct x order by x) from unnest(sports || array['futbol_sala']::text[]) as x), notes = coalesce(notes || ' | ', '') || 'Google Maps: Futsal court. ★ 4.3 (627 reseñas). Tel: 301 4258786'
where slug = 'cancha-sintetica-la-patiada'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set sports = (select array_agg(distinct x order by x) from unnest(sports || array['futbol_sala']::text[]) as x), notes = coalesce(notes || ' | ', '') || 'Google Maps: Futsal court. ★ 4.1 (52 reseñas)'
where slug = 'la-21-futbol-club'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set sports = (select array_agg(distinct x order by x) from unnest(sports || array['futbol_sala']::text[]) as x), notes = coalesce(notes || ' | ', '') || 'Google Maps: Futsal court. ★ 4.5 (275 reseñas). Tel: (605) 3781958'
where slug = 'cancha-sintetica-rojiblanca'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set sports = (select array_agg(distinct x order by x) from unnest(sports || array['futbol_sala']::text[]) as x), notes = coalesce(notes || ' | ', '') || 'Google Maps: Futsal court. ★ 4.4 (519 reseñas). Tel: 53793131'
where slug = 'canchas-el-tiburon'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set sports = (select array_agg(distinct x order by x) from unnest(sports || array['basquet']::text[] || array['voleibol']::text[]) as x), notes = coalesce(notes || ' | ', '') || 'Google Maps: Sports complex. ★ 3.8 (4 reseñas)'
where slug = 'complejo-tivoli'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set sports = (select array_agg(distinct x order by x) from unnest(sports || array['futbol_sala']::text[]) as x), notes = coalesce(notes || ' | ', '') || 'Google Maps: Futsal court. ★ 3.8 (9 reseñas)'
where slug = 'cancha-de-microfutbol-los-andes'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set sports = (select array_agg(distinct x order by x) from unnest(sports || array['futbol_sala']::text[]) as x), notes = coalesce(notes || ' | ', '') || 'Google Maps: Futsal court. ★ 4.3 (374 reseñas). Tel: 300 3483985'
where slug = 'cancha-la-tiburona-sas'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set sports = (select array_agg(distinct x order by x) from unnest(sports || array['basquet']::text[] || array['voleibol']::text[]) as x), notes = coalesce(notes || ' | ', '') || 'Google Maps: Sports complex. ★ 4.6 (117 reseñas)'
where slug = 'pibe-valderrama'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set sports = (select array_agg(distinct x order by x) from unnest(sports || array['padel']::text[]) as x), notes = coalesce(notes || ' | ', '') || 'Google Maps: Padel club. ★ 5 (1 reseñas). Tel: 323 7771611. Web: https://www.easycancha.com/book/clubs/1526/sports'
where slug = 'la-jaula-ensenanza'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set sports = (select array_agg(distinct x order by x) from unnest(sports || array['basquet']::text[]) as x), notes = coalesce(notes || ' | ', '') || 'Google Maps: Sports school. ★ 5 (2 reseñas)'
where slug = 'simon-bolivar'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set sports = (select array_agg(distinct x order by x) from unnest(sports || array['futbol_sala']::text[]) as x), notes = coalesce(notes || ' | ', '') || 'Google Maps: Futsal court. ★ 4.5 (2 reseñas)'
where slug = 'canchas-de-futbol-napoleon-salcedo-cotes'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set sports = (select array_agg(distinct x order by x) from unnest(sports || array['futbol_sala']::text[]) as x), notes = coalesce(notes || ' | ', '') || 'Google Maps: Futsal court. ★ 4.2 (219 reseñas). Tel: 53608401'
where slug = 'club-de-leones'
  and city_id = (select id from public.cities where slug = 'barranquilla');
