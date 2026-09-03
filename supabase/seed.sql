insert into public.cities (slug, name, country_code, timezone, lat, lng)
values ('barranquilla', 'Barranquilla', 'CO', 'America/Bogota', 10.96854, -74.78132)
on conflict (slug) do nothing;

insert into public.venues (
  city_id, slug, name, neighborhood, address, lat, lng, sports, surface, covered, venue_kind, notes
)
select c.id, v.slug, v.name, v.neighborhood, v.address, v.lat, v.lng, v.sports, v.surface, v.covered, v.venue_kind, v.notes
from public.cities c
cross join (
  values
    ('la-jaula-ensenanza', 'La Jaula — La Enseñanza', 'Riomar', 'Cra. 53 #86-119', 11.0118, -74.8214, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Canchas sintéticas descubiertas. Sede norte.'),
    ('la-jaula-americano', 'La Jaula — Americano', 'Alto Prado', 'Cra. 38A #74-179', 10.9992, -74.7961, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Sede cerca al Colegio Americano.'),
    ('brazuca-villa-campestre', 'Brazuca Soccer', 'Villa Campestre', 'Villa Campestre', 11.0234, -74.8695, array['futbol']::text[], 'sintetica', true, 'alquiler', 'Dos canchas sintéticas techadas.'),
    ('soccer-papiros', 'Soccer Papiros', 'Norte', 'Norte de Barranquilla', 11.0086, -74.8298, array['futbol']::text[], 'sintetica', true, 'alquiler', 'Canchas 7v7 y 8v8 bajo techo. Parqueadero.'),
    ('zoccer-plaza', 'Zoccer Plaza', 'Riomar', 'Cl. 77 #58-53, Nte. Centro Historico, Barranquilla', 11.0061857, -74.8019, array['futbol']::text[], 'sintetica', true, 'alquiler', 'Cancha techada en segundo piso, frente a la Registraduría.'),
    ('canchas-biffi', 'Canchas Biffi', 'Riomar', 'Calle 85 con Cra. 56', 11.0134, -74.8198, array['futbol']::text[], 'sintetica', false, 'alquiler', '5v5 y 6v6 con parqueadero en el Colegio Biffi.'),
    ('soccer-44', 'Soccer 44', 'Centro', 'Calle 44 #44-52', 10.9874, -74.7889, array['futbol']::text[], 'sintetica', true, 'alquiler', 'Frente al Hotel Génova. Fútbol 5.'),
    ('combarranquilla-boston', 'Combarranquilla Boston', 'Boston', 'Unidad Boston, Combarranquilla', 10.9848, -74.8047, array['futbol']::text[], 'sintetica', false, 'club', 'Cancha de fútbol 5 de Combarranquilla.'),
    ('combarranquilla-solinilla', 'Combarranquilla Solinilla', 'Villa Campestre', 'Centro Recreacional Solinilla', 11.0189, -74.8752, array['futbol','futbol_sala']::text[], 'sintetica', false, 'club', 'Microfútbol y mini fútbol 9.'),
    ('los-tubos', 'Cancha Los Tubos', 'Ciudadela 20 de Julio', 'Sector Domingo Marino', 10.9432, -74.7941, array['futbol']::text[], 'sintetica', false, 'publica', 'Cancha distrital 33x46 m. Programa Todos al Parque.'),
    ('san-isidro', 'Cancha San Isidro', 'San Isidro', 'Carrera 24 Esquina 53D, San Isidro, Barranquilla', 10.9707433, -74.7991675, array['futbol']::text[], 'sintetica', false, 'publica', 'Fútbol 11 sintético con graderías y camerinos.'),
    ('pibe-valderrama', 'Unidad Deportiva Pibe Valderrama', 'Suroccidente', 'Cra. 1c #46, Los Corales, Barranquilla', 10.9300546, -74.801506, array['futbol']::text[], 'sintetica', false, 'publica', 'Formatos 6v6 a 11v11. Reserva distrital.'),
    ('malecon-del-rio', 'Cancha sintética Malecón del Río', 'Centro Histórico', 'Malecón del Río Magdalena', 10.9862, -74.7778, array['futbol']::text[], 'sintetica', false, 'publica', 'Cancha pública sobre el malecón.'),
    ('complejo-tivoli', 'Complejo Tívoli', 'Tívoli', 'Complejo Tívoli', 10.9726, -74.8115, array['futbol']::text[], 'sintetica', false, 'publica', 'Tres canchas del complejo Tívoli.'),
    ('sagrado-corazon', 'Parque Sagrado Corazón', 'Sagrado Corazón', 'Parque Sagrado Corazón', 10.9915, -74.8032, array['futbol']::text[], 'sintetica', false, 'publica', 'Cancha de parque público, reserva ADI.'),
    ('la-electrificadora', 'Canchas La Electrificadora', 'Electrificadora', 'Parque La Electrificadora', 10.9689, -74.7924, array['futbol']::text[], 'sintetica', false, 'publica', 'Canchas 1 y 2.'),
    ('los-andes', 'Cancha Los Andes', 'Los Andes', 'Barrio Los Andes', 10.9598, -74.8194, array['futbol']::text[], 'grama', false, 'publica', 'Cancha de barrio, reserva distrital.'),
    ('buena-esperanza', 'Cancha Buena Esperanza (La Bola)', 'Buena Esperanza', 'Barrio Buena Esperanza', 10.9512, -74.8088, array['futbol']::text[], 'grama', false, 'publica', 'Conocida como La Bola.'),
    ('mundialito', 'Cancha Mundialito', 'Rebolo', 'Cra. 3 #Calle 45D, Ciudadela 20 de Julio, Barranquilla', 10.9356476, -74.8007297, array['futbol']::text[], 'sintetica', false, 'publica', 'Cancha histórica del suroriente.'),
    ('lluvia-de-oro', 'Parque Lluvia de Oro', 'Lluvia de Oro', 'Parque Lluvia de Oro', 10.9621, -74.8015, array['futbol']::text[], 'sintetica', false, 'publica', 'Cancha de parque público.'),
    ('las-mercedes', 'Cancha Las Mercedes', 'Las Mercedes', 'Barrio Las Mercedes', 10.9744, -74.8256, array['futbol']::text[], 'sintetica', false, 'publica', 'Reserva ADI.'),
    ('cristo-rey', 'Cancha Cristo Rey', 'Cristo Rey', 'Barrio Cristo Rey', 10.9668, -74.8142, array['futbol']::text[], 'sintetica', false, 'publica', 'Reserva ADI.'),
    ('la-inmaculada', 'Parque La Inmaculada', 'La Inmaculada', 'Parque La Inmaculada', 10.9817, -74.8089, array['futbol']::text[], 'sintetica', false, 'publica', 'Cancha de parque público.'),
    ('altos-de-silencio', 'Cancha Altos de Silencio', 'Altos de Silencio', 'Altos de Silencio', 10.9386, -74.8219, array['futbol']::text[], 'sintetica', false, 'publica', 'Reserva ADI.'),
    ('eugenio-macias', 'Cancha Eugenio Macías', 'Eugenio Macías', 'Barrio Eugenio Macías', 10.9449, -74.8053, array['futbol']::text[], 'sintetica', false, 'publica', 'Reserva ADI.'),
    ('simon-bolivar', 'Cancha Simón Bolívar', 'Simón Bolívar', 'entre carrera 5 y 4C, Cl. 23, Simón Bolívar, Barranquilla', 10.9427129, -74.7783016, array['futbol']::text[], 'sintetica', false, 'publica', 'Cancha 1 del parque.'),
    ('parque-olivos', 'Parque Olivos', 'Los Olivos', 'Parque Olivos', 10.9577, -74.8364, array['futbol']::text[], 'sintetica', false, 'publica', 'Cancha de parque público.'),
    ('los-suenos', 'Cancha Los Sueños', 'Los Sueños', 'Barrio Los Sueños', 10.9411, -74.8128, array['futbol']::text[], 'sintetica', false, 'publica', 'Reserva ADI.'),
    -- Scraped via Google Maps (2026-09-02)
    ('cancha-sintetica-la-patiada', 'Cancha Sintética La Patiada', 'Boyacá', 'Cra. 20 #30-123, Sur Orient, Barranquilla, Atlántico', 10.9570953, -74.7869806, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Cancha de fútbol sala. ★ 4.3 (627 reseñas). Tel: 301 4258786'),
    ('cancha-el-moderno', 'Cancha el Moderno', 'Villa Blanca', 'Cisneros, Barranquilla, Atlántico', 10.9342038, -74.7958499, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4.5 (217 reseñas)'),
    ('la-8-fc-cancha-sintetica', 'La 8 FC Cancha Sintética', 'La Magdalena', 'Cra. 8 #38b-51, La Magdalena, Barranquilla, Atlántico', 10.9456989, -74.7947626, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4.5 (975 reseñas). Tel: 300 2292969'),
    ('cancha-san-martin-7-de-abril', 'Cancha San Martin 7 De Abril', 'Siete De Abril', 'Metropolitana, Barranquilla, Atlántico', 10.9302968, -74.813447, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4.2 (54 reseñas)'),
    ('la-21-futbol-club', 'La 21 Fútbol Club', 'Suroccidente', 'Cra 21B #58-71, Suroccidente, Barranquilla, Atlántico', 10.9683139, -74.8028465, array['futbol']::text[], 'sintetica', false, 'club', 'Campo de fútbol. ★ 4.6 (462 reseñas). Tel: 316 4726166'),
    ('cancha-de-futbol-barrio-la-sierra', 'Cancha de Fútbol Barrio La Sierra', 'Cevillar', 'Cl. 46 #14-4, Cevillar, Barranquilla, Atlántico', 10.9567525, -74.8021769, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4.1 (1165 reseñas). Tel: 320 5693841'),
    ('cancha-de-futbol-la-victoria', 'Cancha de Fútbol La Victoria', 'Metropolitana', 'Cra. 10 #45b 3-2, Barranquilla, Atlántico', 10.9527409, -74.7996194, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4.5 (656 reseñas)'),
    ('cancha-de-futbol-sintetica-del-bosque', 'Cancha de fútbol sintética del bosque', 'El Bosque', 'El Bosque, Barranquilla, Atlántico', 10.9524972, -74.8189816, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 3.7 (3 reseñas)'),
    ('cancha-de-futbol-5-hermanos-almendros', 'Cancha de Fútbol 5 Hermanos Almendros', 'Los Almendros', 'Cra. 18d #80-3, Soledad, Barranquilla, Atlántico', 10.9179851, -74.8162699, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Cancha de fútbol sala'),
    ('cancha-de-futbol-nueva-granada', 'Cancha de Fútbol Nueva Granada', 'Nueva Granada', 'Esquina, Cra. 29 #Calle 65, El Recreo, Barranquilla', 10.9785203, -74.804544, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4.3 (723 reseñas)'),
    ('cancha-sintetica-rojiblanca', 'Cancha Sintética Rojiblanca', 'Villas Del Recreo', 'Cl. 56 #41a112, Nte. Centro Historico, Barranquilla, Atlántico', 10.9838908, -74.7941152, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Cancha de fútbol sala. ★ 4.5 (275 reseñas). Tel: (605) 3781958'),
    ('cancha-de-futbol-los-mosquitos', 'Cancha de Fútbol Los Mosquitos', 'La Sierra', 'Calle 40 entre carrera 13c y 9c, La Sierra, Barranquilla, Atlántico', 10.9516994, -74.7955508, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4.3 (173 reseñas)'),
    ('cancha-de-futbol-la-magdalena', 'Cancha de Fútbol La Magdalena', 'La Magdalena', 'Cra. 7c #37c1, Barranquilla, Atlántico', 10.943237, -74.7933193, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4.3 (1483 reseñas). Tel: 304 3704222'),
    ('canchas-el-tiburon', 'Canchas El Tiburón', 'Chiquinquirá', 'Murillo Toro #36-36, Sur Orient, Barranquilla, Atlántico', 10.9784932, -74.7872513, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Cancha de fútbol sala. ★ 4.4 (519 reseñas). Tel: 53793131'),
    ('cancha-de-microfutbol-los-andes', 'Cancha de Microfútbol — Los Andes', 'Villa Carmen', 'Cl. 63c #S/N, Los Andes, Barranquilla, Atlántico', 10.9721862, -74.8054746, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Cancha de fútbol sala. ★ 3.8 (9 reseñas)'),
    ('cancha-la-tiburona-sas', 'Cancha La Tiburona SAS', 'El Rosario', 'Av. Murillo #43-120, Suroccidente, Barranquilla, Atlántico', 10.9867641, -74.7834608, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Cancha de fútbol sala. ★ 4.3 (374 reseñas). Tel: 300 3483985'),
    ('cancha-sintetica-de-futbol-bosques-del-norte', 'Cancha Sintetica de Futbol - Bosques del Norte', 'Altos de Riomar', 'Riomar, Barranquilla, Atlántico', 11.0136898, -74.8229925, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4.8 (6 reseñas)'),
    ('cancha-ringo-makro-club-deportivo', 'Cancha Ringo Makro Club Deportivo', 'Riomar', 'Cra. 52 #106 200, Riomar, Barranquilla, Atlántico', 11.0166114, -74.8361298, array['futbol']::text[], 'sintetica', false, 'club', 'Campo de fútbol. ★ 4.8 (9 reseñas). Tel: 304 4366666'),
    ('fsb-la-cancha', 'FSB La Cancha', 'Belo Horizonte', 'Barranquilla, Atlántico', 11.0138195, -74.7969872, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4.6 (667 reseñas). Tel: 300 8438975'),
    ('cancha-7-bocas', 'Cancha 7 Bocas', 'Metropolitana', 'Cl. 53a #2-2, Metropolitana, Barranquilla, Atlántico', 10.9366845, -74.815754, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 3.9 (9 reseñas)'),
    ('soccer-house', 'Soccer House', 'Villa Campestre', 'Carrera 25 & Cl. 3, Sabanilla Montecarmelo, Barranquilla, Atlántico', 11.023818, -74.8612076, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4.5 (8 reseñas). Tel: 310 7660001'),
    ('cancha-de-futbol-del-carmen', 'Cancha De Fútbol Del Carmen', 'El Carmen', 'Carrera 21, Esquina 53B, El Carmen, Barranquilla, Atlántico', 10.9657325, -74.7990506, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4.5 (549 reseñas)'),
    ('cancha-de-futbol-el-pana', 'Cancha de Fútbol El Pana', 'Las Americas', 'Las Americas, Barranquilla, Atlántico', 10.9394784, -74.8143766, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4 (2 reseñas)'),
    ('cancha-del-brasil', 'Cancha del brasil', 'Metropolitana', 'Cr. De La Cordialidad #5c28, Barranquilla, Atlántico', 10.9484155, -74.8126381, array['futbol']::text[], 'sintetica', false, 'alquiler', 'Campo de fútbol. ★ 4.5 (12 reseñas)'),
    ('canchas-de-futbol-napoleon-salcedo-cotes', 'Canchas de Fútbol Napoleón Salcedo Cotes', 'Olaya', 'Con Carrera 30, Cl. 70b #S/N, El Recreo, Barranquilla, Atlántico', 10.979739, -74.8095871, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Cancha de fútbol sala. ★ 4.5 (2 reseñas)'),
    ('club-de-leones', 'Cancha Club de Leones', 'Norte Centro Histórico', 'Cra. 38 #66-90 Loc 3, Norte Centro Histórico, Barranquilla', 10.9837765, -74.8025051, array['futbol','futbol_sala']::text[], 'sintetica', false, 'club', 'Cancha de fútbol sala. ★ 4.2 (219 reseñas). Tel: 53608401'),
    -- Multi-sport scrape (2026-09-02): pádel, básquet, voleibol, fútbol sala
    ('casa-padel-colombia-rooftop', 'Casa Padel Colombia Rooftop', 'Villa Campestre', 'Cl. 135 #53, Sabanilla Montecarmelo, Barranquilla, Puerto Colombia, Atlántico', 11.023782, -74.8617924, array['padel']::text[], 'cemento', true, 'alquiler', 'Sports club. ★ 5 (19 reseñas)'),
    ('casa-padel-patio', 'Casa Padel Patio', 'Villa Campestre', 'Cl. 135 #56-80, Sabanilla Montecarmelo, Barranquilla, Atlántico', 11.0268568, -74.8620633, array['padel']::text[], 'cemento', false, 'club', 'Athletic club. ★ 4.6 (14 reseñas). Tel: 313 2689016'),
    ('one-padel-academy-barranquilla', 'One Padel Academy Barranquilla', 'Villa Campestre', 'Cl. 3A #23-88, Sabanilla Montecarmelo, Puerto Colombia, Barranquilla, Atlántico', 11.0263648, -74.8624622, array['padel']::text[], 'cemento', false, 'club', 'Athletic club. Tel: 301 6575440'),
    ('padel-park', 'Padel Park', 'Alto Prado', 'Cra. 51 #82-98, Nte. Centro Historico, Barranquilla, Atlántico', 11.0042668, -74.815665, array['padel']::text[], 'cemento', false, 'club', 'Padel club. ★ 4.9 (8 reseñas)'),
    ('padel-zenter-del-rio', 'Padel Zenter Del Río', 'Riomar', 'Via 40 #85-630, Riomar, Barranquilla, Atlántico', 11.0317725, -74.8064406, array['padel']::text[], 'cemento', false, 'club', 'Padel club. ★ 4.4 (50 reseñas). Tel: 324 5051152'),
    ('padel-zenter-la-arenosa', 'Padel Zenter La Arenosa', 'El Castillo I', 'Cl. 79 #73-360, Riomar, Barranquilla, Atlántico', 11.0188777, -74.8001675, array['padel']::text[], 'cemento', false, 'club', 'Sports club. ★ 4.3 (10 reseñas). Tel: 301 1884688'),
    ('padelya', 'PadelYa', 'Aremay', 'Cra. 58 #CL 96 141, Riomar, Barranquilla, Atlántico', 11.0166133, -74.8230772, array['padel']::text[], 'cemento', false, 'club', 'Padel club. Tel: 318 7474092'),
    ('rooftop-padel-club', 'Rooftop Padel Club', 'Barranquilla', 'Centro Comercial Plaza Campestre, Cra. 51B #2C-118 Loc D1, Sabanilla Montecarmelo, Barranquilla, Atlántico', 11.0177599, -74.8596629, array['padel']::text[], 'cemento', false, 'club', 'Sports club. ★ 5 (4 reseñas)'),
    ('x3-padel-club', 'X3 Padel Club', 'Villa Country', 'Cl. 78 #53 - 70, Nte. Centro Historico, Barranquilla, Atlántico', 11.0042098, -74.8062688, array['padel']::text[], 'cemento', false, 'club', 'Sports club. ★ 4.7 (3 reseñas). Tel: 311 4530579'),
    ('cancha-de-baloncesto-designado', 'Cancha de Baloncesto Designado', 'Hipodromo', 'Cra. 30 #27C-35, Soledad, Atlántico', 10.9282632, -74.7741079, array['basquet']::text[], 'cemento', false, 'alquiler', 'Basketball court. ★ 4.5 (2 reseñas)'),
    ('cancha-de-baloncesto-el-divino-nino', 'Cancha de Baloncesto El Divino Niño', 'Urbanización El Parque', 'Cl. 41b #42-2, Cisneros, Soledad, Atlántico', 10.932314, -74.7853856, array['basquet']::text[], 'cemento', false, 'alquiler', 'Basketball court. ★ 4.7 (13 reseñas)'),
    ('cancha-de-baloncesto-las-palmas', 'Cancha de Baloncesto Las Palmas', 'Las Palmas', 'Cl. 37c #5a58, Barranquilla, Atlántico', 10.9402865, -74.791896, array['basquet']::text[], 'cemento', false, 'alquiler', 'Basketball court. ★ 4.2 (61 reseñas)'),
    ('cancha-de-baloncesto-los-cachorros', 'Cancha de Baloncesto Los Cachorros', 'Villa Country', 'Cra. 60, Paraiso, Barranquilla, Atlántico', 11.0083698, -74.8038748, array['basquet']::text[], 'cemento', false, 'alquiler', 'Basketball court. ★ 4.4 (51 reseñas). Tel: 53733096'),
    ('cancha-de-baloncesto-simon-bolivar', 'Cancha De Baloncesto Simón Bolívar', 'Simón Bolívar', 'Cl. 19 #7a-2, Barranquilla, Atlántico', 10.9475064, -74.7754531, array['basquet']::text[], 'cemento', false, 'publica', 'Sports school. ★ 5 (2 reseñas)'),
    ('cancha-basquetbol', 'Cancha de básquet Las Flores', 'Las Flores', 'Riomar, Barranquilla, Atlántico', 11.0415888, -74.8257172, array['basquet']::text[], 'cemento', false, 'alquiler', 'Basketball court. ★ 3 (1 reseñas)'),
    ('cancha-multiple-nuestra-senora-de-guadalupe', 'Cancha Múltiple Nuestra Señora De Guadalupe', 'Los Corales', 'Cra. 8a Sur #47a2, Los Corales, Barranquilla, Atlántico', 10.9269596, -74.8060785, array['basquet']::text[], 'cemento', false, 'alquiler', 'Basketball court'),
    ('cancha-villa-santos', 'Cancha Villa Santos', 'Villa Santos', 'Cra. 51B #98-241, Riomar, Barranquilla, Atlántico', 11.0111955, -74.8303746, array['basquet']::text[], 'cemento', false, 'alquiler', 'Basketball court'),
    ('club-de-baloncesto-cocodrilos-de-barranquilla', 'Club de Baloncesto Cocodrilos de Barranquilla', 'Betania', 'Cra. 38a #75B esquina, Las Mercedes, Barranquilla, Atlántico', 10.9873431, -74.8142227, array['basquet']::text[], 'cemento', false, 'club', 'Sports school. ★ 4.9 (9 reseñas). Tel: 315 6845884'),
    ('club-de-baloncesto-aguilas-azules', 'Club de baloncesto Águilas Azules', 'Campo Alegre', 'Cra. 40a #93 - 2, Nte. Centro Historico, Barranquilla, Atlántico', 10.9854247, -74.8351362, array['basquet']::text[], 'cemento', false, 'club', 'Basketball club. ★ 5 (5 reseñas). Tel: 300 3586510'),
    ('park-renowitzky-2', 'Parque Renowitzky 2', 'Ciudadela 20 de Julio', 'Cra 1C #46-2, Barranquilla, Atlántico', 10.9311759, -74.8030242, array['basquet']::text[], 'cemento', false, 'alquiler', 'Basketball court. ★ 4 (153 reseñas)'),
    ('campo-de-voleibol-playa', 'Campo De Voleibol Playa', 'Norte Centro Historico', 'Cl. 77 Bis #82-317, Nte. Centro Historico, Barranquilla, Atlántico', 11.0179361, -74.7908208, array['voleibol']::text[], 'cemento', false, 'alquiler', 'Beach volleyball court. ★ 4.7 (3 reseñas)'),
    ('cancha-de-voleibol-villa-santos', 'Cancha De Voleibol Villa Santos', 'Villa Santos', 'Riomar, Barranquilla, Atlántico', 11.0110323, -74.8295707, array['voleibol']::text[], 'cemento', false, 'alquiler', 'Volleyball court'),
    ('cancha-multiple-del-eden', 'Cancha múltiple del Edén', 'Villas de Las Colinas', 'Carrera 27 &, Cl. 86b, Suroccidente, Barranquilla, Atlántico', 10.9766304, -74.8320381, array['voleibol']::text[], 'cemento', false, 'alquiler', 'Volleyball court'),
    ('canchas-cc-metropolitano', 'Canchas CC Metropolitano', 'Soledad', 'Soledad, Atlántico', 10.9240656, -74.7966271, array['voleibol']::text[], 'cemento', false, 'alquiler', 'Volleyball court. ★ 5 (1 reseñas)'),
    ('club-de-voleibol-ballbreakers', 'Club de voleibol Ballbreakers', 'Ciudad Jardín', 'Cra. 42F #80-117, Las Mercedes, Barranquilla, Atlántico', 10.9936938, -74.818179, array['voleibol']::text[], 'cemento', false, 'club', 'Sports club. ★ 5 (2 reseñas). Tel: 304 5280739'),
    ('club-deportivo-snow-volley-barranquilla', 'Club deportivo Snow Volley Barranquilla', 'Los Trupillos', 'Cra. 21 #28- 16, Sur Orient, Barranquilla, Atlántico', 10.9583634, -74.7834725, array['voleibol']::text[], 'cemento', false, 'club', 'Volleyball club. ★ 5 (3 reseñas)'),
    ('elements-voley-club', 'Elements Voley Club', 'La Campiña', 'Venezuela Park, Nte. Centro Historico, Barranquilla, Atlántico', 11.0019078, -74.824383, array['voleibol']::text[], 'cemento', false, 'club', 'Volleyball club. ★ 5 (137 reseñas). Tel: 300 6174876'),
    ('voleibol-club-aston-quilla-voley', 'Voleibol Club Aston Quilla voley', 'Santa Ana', 'Cl. 68 #64, San Francisco, Barranquilla, Atlántico', 11.0010125, -74.7918306, array['voleibol']::text[], 'cemento', false, 'club', 'Sports club. ★ 5 (8 reseñas)'),
    ('cancha-de-cemento-la-sierra', 'Cancha de Cemento La Sierra', 'La Sierra', 'La Sierra, Barranquilla, Atlántico', 10.9562946, -74.8013652, array['futbol_sala']::text[], 'cemento', false, 'alquiler', 'Futsal court. ★ 5 (2 reseñas)'),
    ('cancha-de-futbol-barranquilla-cra-22', 'Cancha De Fútbol Barranquilla', 'Barranquilla', 'Cra. 22 #112c66, Barranquilla, Atlántico', 10.9602936, -74.7721962, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Futsal court. ★ 4.1 (52 reseñas)'),
    ('cancha-de-futbol-las-flores', 'Cancha de Fútbol Las Flores', 'Las Flores', 'Cra. 87 #10733, Riomar, Barranquilla, Atlántico', 11.0419585, -74.8259906, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Futsal court. ★ 4.4 (62 reseñas)'),
    ('cancha-de-futbol-sala-caribe-campestre', 'Cancha de fútbol sala caribe campestre', 'Suroccidente', 'Carrera 28 #142-79, Suroccidente, Barranquilla, Atlántico', 10.9599852, -74.8632076, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Stadium'),
    ('cancha-la-19', 'Cancha La 19', 'El Carmen', 'Carrera 19D, esquina Calle 49 #49, El Carmen, Barranquilla, Atlántico', 10.9636493, -74.7985783, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Futsal court. ★ 4.1 (9 reseñas)'),
    ('cancha-sintetica-brasileirao', 'Cancha Sintética Brasileirao', 'Norte Centro Historico', 'Cra. 46 #76-109, Nte. Centro Historico, Barranquilla, Atlántico', 10.9971569, -74.8111439, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Futsal court. ★ 4.4 (530 reseñas). Tel: 312 8603063'),
    ('canchas-de-piso-los-manantiales', 'Canchas De Piso Los Manantiales', 'Soledad, Barranquilla', 'Cl. 73 #12, Soledad, Barranquilla, Atlántico', 10.9024403, -74.8110577, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Futsal court. ★ 4.9 (7 reseñas)'),
    ('canchas-sinteticas-la-27', 'Canchas sinteticas la 27', 'Por Fin', 'Cra. 27 #84-131, Suroccidente, Barranquilla, Atlántico', 10.9770681, -74.8286999, array['futbol','futbol_sala']::text[], 'sintetica', false, 'alquiler', 'Futsal court. ★ 4.6 (43 reseñas). Tel: 300 8003198')
) as v(slug, name, neighborhood, address, lat, lng, sports, surface, covered, venue_kind, notes)
where c.slug = 'barranquilla'
on conflict (city_id, slug) do nothing;

-- Multi-sport enrichments for existing venues
update public.venues set
  sports = (
    select array_agg(distinct s order by s)
    from unnest(coalesce(sports, '{}'::text[]) || array['voleibol']::text[]) as s
  )
where slug = 'complejo-tivoli'
  and city_id = (select id from public.cities where slug = 'barranquilla');

update public.venues set
  sports = (
    select array_agg(distinct s order by s)
    from unnest(coalesce(sports, '{}'::text[]) || array['padel']::text[]) as s
  )
where slug = 'la-jaula-ensenanza'
  and city_id = (select id from public.cities where slug = 'barranquilla');
