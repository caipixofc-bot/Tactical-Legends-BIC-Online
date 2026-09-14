# Tactical Legends — BIC Online

Juego móvil multijugador inspirado en la referencia visual enviada:
- Fondo blanco tipo papel.
- Dibujo a boli BIC azul, líneas, sombreado y cross-hatching.
- Shooter en tercera persona.
- Movimiento con joystick.
- Disparo, recarga, AIM y DASH.
- Enemigos visibles en el mapa.
- Chat en tiempo real.
- Nivel, XP, kills, deaths y wins persistentes en SQLite.
- Hasta 8 jugadores por sala en esta versión.

## Ejecutar
Requiere Node.js 20+.

```bash
npm install
npm start
```

Abrir:
http://localhost:3000

Para jugar desde otros móviles, el servidor debe estar publicado en un hosting que soporte Node.js + WebSockets. La base `progress.db` debe estar en almacenamiento persistente.

## Controles
Móvil:
- Joystick: movimiento.
- FUEGO: dispara.
- RECARGA: recarga.
- AIM: apunta al enemigo más cercano.
- DASH: desplazamiento rápido.

PC:
El juego está optimizado para móvil; el joystick táctil es el control principal.

## Siguiente fase recomendada
Para acercarlo todavía más a un juego comercial: matchmaking, cuentas con contraseña/Google/Apple, inventario persistente, armas múltiples, recoil, headshots, sonidos, animaciones, ranking, amigos, salas privadas, zona segura, loot, vehículos y un servidor autoritativo con anti-cheat.
