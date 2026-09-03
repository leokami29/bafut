-- Barranquilla multi-sport venue enrichment from Google Maps scrape (2026-09-02)
-- Source: gosom/google-maps-scraper (queries: básquet/baloncesto, voleibol, pádel, fútbol sala/microfútbol)
-- Schema: sports text[] already supports multi-sport; no DDL required.

insert into public.venues (
  city_id, slug, name, neighborhood, address, lat, lng, sports, surface, covered, venue_kind, notes
)
select c.id, v.slug, v.name, v.neighborhood, v.address, v.lat, v.lng, v.sports, v.surface, v.covered, v.venue_kind, v.notes
from public.cities c
cross join (
  values
    ('casa-padel-colombia-rooftop', 'Casa Padel Colombia Rooftop', 'Villa Campestre', 'Cl. 135 #53, Sabanilla Montecarmelo, Barranquilla, Puerto Colombia, Atlántico', 11.023782, -74.8617924, array['padel']::text[], 'cemento', true, 'alquiler', 'Sports club. ★ 5 (19 reseñas). Web: https://reservadeportes.com/Casapadel.html?domain=CO'),
    ('casa-padel-patio', 'Casa Padel Patio', 'Villa Campestre', 'Cl. 135 #56-80, Sabanilla Montecarmelo, Barranquilla, Atlántico', 11.0268568, -74.8620633, array['padel']::text[], 'cemento', null, 'club', 'Athletic club. ★ 4.6 (14 reseñas). Tel: 313 2689016. Web: https://reservadeportes.com/Casapadel.html?domain=CO'),
    ('one-padel-academy-barranquilla', 'One Padel Academy Barranquilla', 'Villa Campestre', 'Cl. 3A #23-88, Sabanilla Montecarmelo, Puerto Colombia, Barranquilla, Atlántico', 11.0263648, -74.8624622, array['padel']::text[], 'cemento', null, 'club', 'Athletic club. Tel: 301 6575440. Web: https://www.instagram.com/1padelbaq/?next=/'),
    ('padel-park', 'Padel Park', 'Alto Prado', 'Cra. 51 #82-98, Nte. Centro Historico, Barranquilla, Atlántico', 11.0042668, -74.815665, array['padel']::text[], 'cemento', null, 'club', 'Padel club. ★ 4.9 (8 reseñas)'),
    ('padel-zenter-del-rio', 'Padel Zenter Del Río', 'Riomar', 'Via 40 #85-630, Riomar, Barranquilla, Atlántico', 11.031772499999999, -74.8064406, array['padel']::text[], 'cemento', null, 'club', 'Padel club. ★ 4.4 (50 reseñas). Tel: 324 5051152. Web: http://www.padelzenter.co/'),
    ('padel-zenter-la-arenosa', 'Padel Zenter La Arenosa', 'El Castillo I', 'Cl. 79 #73-360, Riomar, Barranquilla, Atlántico', 11.018877699999999, -74.8001675, array['padel']::text[], 'cemento', null, 'club', 'Sports club. ★ 4.3 (10 reseñas). Tel: 301 1884688'),
    ('padelya', 'PadelYa', 'Aremay', 'Cra. 58 #CL 96 141, Riomar, Barranquilla, Atlántico', 11.0166133, -74.8230772, array['padel']::text[], 'cemento', null, 'club', 'Padel club. Tel: 318 7474092'),
    ('rooftop-padel-club', 'Rooftop Padel Club', 'Barranquilla', 'Centro Comercial Plaza Campestre, Cra. 51B #2C-118 Loc D1, Sabanilla Montecarmelo, Barranquilla, Atlántico', 11.0177599, -74.8596629, array['padel']::text[], 'cemento', null, 'club', 'Sports club. ★ 5 (4 reseñas)'),
    ('x3-padel-club', 'X3 Padel Club', 'Villa Country', 'Cl. 78 #53 - 70, Nte. Centro Historico, Barranquilla, Atlántico', 11.0042098, -74.8062688, array['padel']::text[], 'cemento', null, 'club', 'Sports club. ★ 4.7 (3 reseñas). Tel: 311 4530579'),
    ('cancha-de-baloncesto-designado', 'Cancha de Baloncesto Designado', 'Hipodromo', 'Cra. 30 #27C-35, Soledad, Atlántico', 10.9282632, -74.77410789999999, array['basquet']::text[], 'cemento', null, 'alquiler', 'Basketball court. ★ 4.5 (2 reseñas)'),
    ('cancha-de-baloncesto-el-divino-nino', 'Cancha de Baloncesto El Divino Niño', 'Urbanización El Parque', 'Cl. 41b #42-2, Cisneros, Soledad, Atlántico', 10.932314, -74.7853856, array['basquet']::text[], 'cemento', null, 'alquiler', 'Basketball court. ★ 4.7 (13 reseñas)'),
    ('cancha-de-baloncesto-las-palmas', 'Cancha de Baloncesto Las Palmas', 'Las Palmas', '#5a- a 5a-104,, Cl. 37c #5a58, Barranquilla, Atlántico', 10.9402865, -74.791896, array['basquet']::text[], 'cemento', null, 'alquiler', 'Basketball court. ★ 4.2 (61 reseñas)'),
    ('cancha-de-baloncesto-los-cachorros', 'Cancha de Baloncesto Los Cachorros', 'Villa Country', 'Cra. 60, Paraiso, Barranquilla, Atlántico', 11.008369799999999, -74.8038748, array['basquet']::text[], 'cemento', null, 'alquiler', 'Basketball court. ★ 4.4 (51 reseñas). Tel: 53733096'),
    ('cancha-de-baloncesto-simon-bolivar', 'Cancha De Baloncesto Simón Bolívar', 'Simón Bolívar', 'Cl. 19 #7a-2, Barranquilla, Atlántico', 10.9475064, -74.7754531, array['basquet']::text[], 'cemento', null, 'publica', 'Sports school. ★ 5 (2 reseñas)'),
    ('cancha-basquetbol', 'Cancha de básquet Las Flores', 'Las Flores', 'Riomar, Barranquilla, Atlántico', 11.0415888, -74.8257172, array['basquet']::text[], 'cemento', null, 'alquiler', 'Basketball court. ★ 3 (1 reseñas)'),
    ('cancha-multiple-nuestra-senora-de-guadalupe', 'Cancha Múltiple Nuestra Señora De Guadalupe', 'Los Corales', 'Cra. 8a Sur #47a2, Los Corales, Barranquilla, Atlántico', 10.9269596, -74.8060785, array['basquet']::text[], 'cemento', null, 'alquiler', 'Basketball court'),
    ('cancha-villa-santos', 'Cancha Villa Santos', 'Villa Santos', 'Cra. 51B #98-241, Riomar, Barranquilla, Atlántico', 11.0111955, -74.8303746, array['basquet']::text[], 'cemento', null, 'alquiler', 'Basketball court'),
    ('club-de-baloncesto-cocodrilos-de-barranquilla', 'Club de Baloncesto Cocodrilos de Barranquilla', 'Betania', 'Parque Betania norte de la ciudad, Cra. 38a #75B esquina, Las Mercedes, Barranquilla, Atlántico', 10.9873431, -74.8142227, array['basquet']::text[], 'cemento', null, 'club', 'Sports school. ★ 4.9 (9 reseñas). Tel: 315 6845884'),
    ('club-de-baloncesto-aguilas-azules', 'Club de baloncesto Águilas Azules', 'Campo Alegre', 'Cra. 40a #93 - 2, Nte. Centro Historico, Barranquilla, Atlántico', 10.9854247, -74.8351362, array['basquet']::text[], 'cemento', null, 'club', 'Basketball club. ★ 5 (5 reseñas). Tel: 300 3586510'),
    ('park-renowitzky-2', 'Parque Renowitzky 2', 'Ciudadela 20 de Julio', '# a 46a-74,, Cra 1C #462, Barranquilla, Atlántico', 10.9311759, -74.8030242, array['basquet']::text[], 'cemento', null, 'alquiler', 'Basketball court. ★ 4 (153 reseñas). Tel: 322 2222222'),
    ('campo-de-voleibol-playa', 'Campo De Voleibol Playa', 'Norte Centro Historico', 'Cl. 77 Bis #82-317, Nte. Centro Historico, Barranquilla, Sitionuevo, Atlántico', 11.0179361, -74.79082079999999, array['voleibol']::text[], 'cemento', null, 'alquiler', 'Beach volleyball court. ★ 4.7 (3 reseñas)'),
    ('cancha-de-voleibol-villa-santos', 'Cancha De Voleibol Villa Santos', 'Villa Santos', 'Riomar, Barranquilla, Atlántico', 11.0110323, -74.82957069999999, array['voleibol']::text[], 'cemento', null, 'alquiler', 'Volleyball court. ★ 1 (1 reseñas)'),
    ('cancha-multiple-del-eden', 'Cancha múltiple del Edén', 'Villas de Las Colinas', 'Carrera 27 &, Cl. 86b, Suroccidente, Barranquilla, Atlántico', 10.9766304, -74.83203809999999, array['voleibol']::text[], 'cemento', null, 'alquiler', 'Volleyball court'),
    ('canchas-cc-metropolitano', 'Canchas CC Metropolitano', 'Soledad', 'Soledad, Atlántico', 10.924065599999999, -74.7966271, array['voleibol']::text[], 'cemento', null, 'alquiler', 'Volleyball court. ★ 5 (1 reseñas)'),
    ('club-de-voleibol-ballbreakers', 'Club de voleibol Ballbreakers', 'Ciudad Jardín', 'Parque sagrado corazon, Cra. 42F #80-117, Las Mercedes, Barranquilla, Atlántico', 10.993693799999999, -74.818179, array['voleibol']::text[], 'cemento', null, 'club', 'Sports club. ★ 5 (2 reseñas). Tel: 304 5280739. Web: https://www.instagram.com/ballbreakersclub/'),
    ('club-deportivo-snow-volley-barranquilla', 'Club deportivo Snow Volley Barranquilla', 'Los Trupillos', 'Cra. 21 #28- 16, Sur Orient, Barranquilla, Atlántico', 10.9583634, -74.7834725, array['voleibol']::text[], 'cemento', null, 'club', 'Volleyball club. ★ 5 (3 reseñas). Web: https://instagram.com/snow_volley?igshid=YmMyMTA2M2Y='),
    ('elements-voley-club', 'Elements Voley Club', 'La Campiña', 'Venezuela Park, Nte. Centro Historico, Barranquilla, Atlántico', 11.0019078, -74.824383, array['voleibol']::text[], 'cemento', null, 'club', 'Volleyball club. ★ 5 (137 reseñas). Tel: 300 6174876'),
    ('voleibol-club-aston-quilla-voley', 'Voleibol Club Aston Quilla voley', 'Santa Ana', 'Cl. 68 #64, San Francisco, Barranquilla, Atlántico', 11.0010125, -74.7918306, array['voleibol']::text[], 'cemento', null, 'club', 'Sports club. ★ 5 (8 reseñas)'),
    ('cancha-de-cemento-la-sierra', 'Cancha de Cemento La Sierra', 'La Sierra', 'La Sierra, Barranquilla, Atlántico', 10.9562946, -74.8013652, array['futbol_sala']::text[], 'cemento', null, 'alquiler', 'Futsal court. ★ 5 (2 reseñas)'),
    ('cancha-de-futbol-barranquilla-cra-22', 'Cancha De Fútbol Barranquilla', 'Barranquilla', 'Cra. 22 #112c66, Barranquilla, Atlántico', 10.9602936, -74.7721962, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 4.1 (52 reseñas)'),
    ('cancha-de-futbol-las-flores', 'Cancha de Fútbol Las Flores', 'Las Flores', 'Cra. 87 #10733, Riomar, Barranquilla, Atlántico', 11.0419585, -74.8259906, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 4.4 (62 reseñas)'),
    ('cancha-de-futbol-sala-caribe-campestre', 'Cancha de fútbol sala caribe campestre', 'Suroccidente', 'Carrera 28 #142-79, Suroccidente, Barranquilla, Atlántico', 10.9599852, -74.8632076, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Stadium'),
    ('cancha-la-19', 'Cancha La 19', 'El Carmen', 'Carrera 19D, esquina Calle 49 #49, El Carmen, Barranquilla, Atlántico', 10.9636493, -74.7985783, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 4.1 (9 reseñas)'),
    ('cancha-sintetica-brasileirao', 'Cancha Sintética Brasileirao', 'Norte Centro Historico', 'Cra. 46 #76-109, Nte. Centro Historico, Barranquilla, Atlántico', 10.9971569, -74.81114389999999, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 4.4 (530 reseñas). Tel: 312 8603063'),
    ('canchas-de-piso-los-manantiales', 'Canchas De Piso Los Manantiales', 'Soledad, Barranquilla', 'Cl. 73 #12, Soledad, Barranquilla, Atlántico', 10.9024403, -74.81105769999999, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 4.9 (7 reseñas)'),
    ('canchas-sinteticas-la-27', 'Canchas sinteticas la 27', 'Por Fin', 'Cra. 27 #84-131, Suroccidente, Barranquilla, Atlántico', 10.9770681, -74.8286999, array['futbol', 'futbol_sala']::text[], 'sintetica', null, 'alquiler', 'Futsal court. ★ 4.6 (43 reseñas). Tel: 300 8003198')
) as v(slug, name, neighborhood, address, lat, lng, sports, surface, covered, venue_kind, notes)
where c.slug = 'barranquilla'
on conflict (city_id, slug) do nothing;

update public.venues set
  sports = (
    select array_agg(distinct s order by s)
    from unnest(coalesce(sports, '{}'::text[]) || array['voleibol']::text[]) as s
  ),
  notes = case
    when notes ilike '%voleibol en Complejo Tívoli%' then notes
    else coalesce(notes || ' | ', '') || 'Google Maps: cancha de voleibol en Complejo Tívoli (Cra. 64c #94-57).'
  end
where slug = 'complejo-tivoli'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set
  sports = (
    select array_agg(distinct s order by s)
    from unnest(coalesce(sports, '{}'::text[]) || array['padel']::text[]) as s
  ),
  notes = case
    when notes ilike '%La Jaula Padel%' then notes
    else coalesce(notes || ' | ', '') || 'Google Maps: también ofrece pádel (La Jaula Padel, misma sede Cra. 53 #86-119).'
  end
where slug = 'la-jaula-ensenanza'
  and city_id = (select id from public.cities where slug = 'barranquilla');

