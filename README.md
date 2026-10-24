# El Juego del Calamar GG

Un juego 2D en pixel art, inspirado en *El Juego del Calamar*, hecho para la familia GG: Rick (456), Steph (067),
Sophie (018) y Alana (222). Y Thor esperando en la casa.

**Jugar ya:** https://lothra2.github.io/squid-games-GG/ (computador, iPad o teléfono acostado; en el iPad, "Agregar a
pantalla de inicio" lo deja como app a pantalla completa).

## Cómo se juega

- **Teclado:** flechas o WASD para moverse. **A** = Espacio, Z o Enter. **B** = X o Shift. **Pausa** = Esc o P.
- **Control (gamepad):** palanca o cruceta, botón A y botón B.
- **Teléfono o tablet:** palanca a la izquierda, botones A y B a la derecha. En los diálogos se toca la pantalla.

Al empezar se elige **quién juega** y la **dificultad** (fácil, normal, difícil). Antes de cada juego sale una
**tarjeta** con el objetivo y los controles, una cuenta 3, 2, 1 y la pausa siempre está arriba a la derecha.

- **Sangre:** si juega Rick o Steph, hay sangre como en la serie. Si juega **Sophie o Alana, no hay sangre**: los
  eliminados reciben confeti, se quedan dormidos con zzz y se los llevan en una caja de regalo con lazo rosado.
  Se puede cambiar a mano en Opciones.
- **Relevo familiar:** en la tarjeta del juego, **B** cambia quién juega. La sangre sigue a quien juega.
- **Vidas:** 3 por juego. Al ganar un juego se recuperan. Si se pierden todas, el Front Man te manda de vuelta al
  juego 1, con el chanchito y la billetera vacíos.
- **Plata:** cada juego ganado da de 1 a 3 estrellas y un premio en wones para la **billetera de la familia**. Más
  estrellas y más dificultad, más plata. En cada noche está **la máquina del dormitorio**: vida extra (empiezas con
  4), reloj de arena (+15 s) o pista del vidriero (una pista más en el puente, la galleta o el escondite).
- **Práctica:** desde el menú se juega cualquiera de los 11 juegos, con tus estrellas y récords. Al terminar:
  jugar otra vez, elegir otro juego o salir al menú.

## La historia

Toda en pixel art, con los mismos personajes:

1. **El metro de Ben Thanh:** se va el último tren y el reclutador te reta al ddakji. Apuntas a la orilla del
   sobre y mides la fuerza. Si pierdes: cachetada (o cosquillas).
2. **La tarjeta** con el círculo, el triángulo y el cuadrado. La familia en la casa con Thor.
3. **La lancha en la tormenta:** olas en capas, rayos, la lancha que se mece con la familia adentro y un guardia al
   timón, hasta que aparece la isla.
4. **El muelle** con los guardias rosados y **el gas**. El despertar en el dormitorio, las reglas y el **Front Man**.
5. Los 11 juegos, con una noche entre cada uno: el chanchito que se llena, diálogos, **votación O/X** y la máquina.
6. El final: el chanchito lleno, la lancha al amanecer, Thor en la casa y los créditos.

## Los 11 juegos

| # | Juego | Temporada | Cómo se gana |
|---|---|---|---|
| 1 | Luz roja, luz verde | 1 | Corre con la canción. En rojo, quieto: el ojo de la muñeca se llena si te mueves |
| 2 | La galleta | 1 | La palanca mueve la aguja; A pica. Sobre la línea raspa, afuera se raja. Golpear seguido calienta. B lame |
| 3 | Tira y afloja | 1 | A al pitazo para inclinarte. Las notas A y B llegan al círculo: aprieta justo. Y los tres pasos del 001 |
| 4 | Las canicas | 1 | Par o impar y al hoyo contra el abuelo 001, tu gganbu |
| 5 | Pentatlón de seis piernas | 2 | Tú haces las cinco pruebas (ddakji, piedra, gonggi, trompo y jegi) con la familia amarrada |
| 6 | Mingle | 2 | Gira en el carrusel. Cuando digan el número, arma un grupo exacto y entra a un cuarto |
| 7 | El puente de cristal | 1 | Elige tu chaleco. Tu reloj empieza en tu turno y alcanza para tus vidrios. B mira el reflejo |
| 8 | El escondite | 3 | Busca la salida con tu llave. Mira el minimapa y las líneas rojas de visión. B marca el camino |
| 9 | La cuerda | 3 | Salta con A cuando el círculo sobre tu cabeza esté verde. En la orilla del hueco, A es un salto largo |
| 10 | El calamar en el cielo | 3 | A embiste, B agarra y en el forcejeo machacas A. Bota a todos los rivales |
| 11 | El juego del calamar | 1 | Contra el Front Man: en un pie hasta la cintura, después a la cabeza |

## Detalles que se notan

- **Cámara de muerte:** cámara lenta, zoom y blanco y negro cuando te eliminan.
- **Ambiente:** viñeta y motas de polvo en cada escenario.
- **Altavoz:** una voz anuncia los juegos y los eliminados (voz del navegador). En luz roja, la muñeca canta en
  coreano si el navegador tiene voz coreana.
- **Resultados:** estrellas, eliminados, premio y récord de cada juego.

## Correr y publicar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # sale en dist/, listo para Netlify (netlify.toml ya está)
```

## De dónde sale el arte

- **Personajes:** [PixelForja](https://github.com/Lothra2/pixel_forja), con las fichas de `forja/fichas/`.
  `python3 herramientas/fichas.py ../pixel_forja` las arma (chándal verde con número, guardias rosados con
  máscara ○△□, Front Man, reclutador y ropa de calle de la familia). `npm run kit` arma el kit en
  `public/assets/kit/` con `forja/kit.config.json` (familia, guardias, Front Man, abuelo y reclutador, en celda de
  64 px, con retratos de 8 expresiones, voces, efectos y sonidos) y `public/assets/kit_gente/` con
  `forja/kit_gente.config.json` (los otros 19 jugadores).
- **Intro, historia y final:** pintados con código pixel por pixel en `src/escenas/pintura.js` (metro, tren, casa,
  cielo, olas, lancha, muelle, tarjeta y chanchito).
- **Escenarios de los juegos:** imágenes de Higgsfield en `arte/higgsfield/`, pasadas a pixel de 640 x 360 con
  paleta corta por `python3 herramientas/arte.py` (salen en `public/assets/fondos/`).
- **Música:** sintetizada en el navegador (`src/core/sonido.js`). El Danubio Azul es de Johann Strauss II.
- Créditos del arte LPC de las cabezas: `public/assets/kit/CREDITOS.txt`.

## Pruebas

```bash
node herramientas/probar.mjs <url> <carpeta> '<pasos JSON>'   # abre el juego en Chromium, aprieta teclas y saca capturas
```

`herramientas/bots.js` juega cada juego solo para comprobar que se puede ganar.
`node herramientas/jugar_todos.mjs <url> <carpeta> [dificultad]` corre los bots en los 11 juegos seguidos.

Para publicar como artifact: `npm run build && python3 herramientas/empaquetar.py` (sale `dist/juego.html` y
`dist/archivos.json`).
