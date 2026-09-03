# BaFut

Partidos abiertos y “falta un jugador”.

BaFut no reserva canchas ni reemplaza WhatsApp. El organizador publica un hueco (cancha, hora, posición) y alguien pide el cupo. El host confirma. Barranquilla es la primera ciudad de datos; el motor es genérico.

## Loop

1. Publicar partido
2. Marcar cupos faltantes
3. Pedir el cupo
4. El host confirma
5. Compartir `/p/{codigo}` por WhatsApp

## Arranque local

1. Copia `.env.example` a `.env.local` con la URL y la publishable key de tu proyecto Supabase.
2. En el dashboard de Auth: Site URL `http://localhost:3005` y Redirect `http://localhost:3005/auth/callback`.
3. Aplica `supabase/migrations/20260902120000_init_core_schema.sql` y `supabase/seed.sql`.
4. `npm install` y `npm run dev`.

## Añadir otra ciudad

Inserta una fila en `cities` y sus `venues`. No hace falta ramificar código. El selector de ciudad guarda una cookie `bafut_city`.

## Fuera de este corte

Pagos, chat, reserva real con la cancha, app nativa.
