# El Juego del Calamar GG

Un juego 2D en pixel art, inspirado en *El Juego del Calamar*, hecho para la familia GG: Rick (456), Steph (067),
Sophie (018) y Alana (222). Y Thor esperando en la casa.

## Cómo se juega

- **Teclado:** flechas o WASD para moverse. **A** = Espacio, Z o Enter. **B** = X o Shift. **Pausa** = Esc o P.
- **Control (gamepad):** palanca o cruceta, botón A y botón B.
- **Teléfono o tablet:** palanca a la izquierda, botones A y B a la derecha. En los diálogos se toca la pantalla.

Al empezar se elige **quién juega** y la **dificultad** (fácil, normal, difícil).

- **Sangre:** si juega Rick o Steph, hay sangre como en la serie. Si juega **Sophie o Alana, no hay sangre**: los
  eliminados reciben confeti, se quedan dormidos con zzz y se los llevan en una caja de regalo con lazo rosado.
  Se puede cambiar a mano en Opciones.
- **Vidas:** 3 por juego. Al ganar un juego se recuperan. Si se pierden las 3, el Front Man te manda de vuelta al
  juego 1, con el chanchito vacío.
- **Práctica:** desde el menú se puede repetir cualquier juego ya desbloqueado, sin gastar vidas.

## La historia

1. **El metro:** el reclutador te reta al ddakji (voltear el sobre). Si pierdes: cachetada (o cosquillas).
2. **La tarjeta** con ○△□, la familia en la casa con Thor, y la **lancha en la tormenta** hasta la isla.
3. **El gas rosado**, el despertar en el dormitorio con el Danubio Azul, las reglas y el **Front Man**.
4. Los 11 juegos, con una noche en el dormitorio entre cada uno (diálogos y **votación O/X**).
5. El final: el chanchito lleno, la lancha al amanecer y Thor.

## Los 11 juegos

| # | Juego | Temporada | Cómo se gana |
|---|---|---|---|
| 1 | Luz roja, luz verde | 1 | Corre mientras la muñeca canta; quieto cuando se voltea. Cruza la raya roja |
| 2 | La galleta | 1 | Eliges fila sin saber la figura. Mantén A para raspar sin que se raje. B para lamer |
| 3 | Tira y afloja | 1 | A al pitazo para inclinarte, A al ritmo, y los tres pasos adelante del abuelo 001 |
| 4 | Las canicas | 1 | Par o impar y al hoyo contra el abuelo 001, tu gganbu |
| 5 | Pentatlón de seis piernas | 2 | Ddakji, piedra voladora, gonggi, trompo y jegi, amarrados los cinco |
| 6 | Mingle | 2 | Gira en el carrusel; cuando digan el número, entra a un cuarto con ese número exacto |
| 7 | El puente de cristal | 1 | Elige tu chaleco. Arriba o abajo y A para saltar. B mira el reflejo del vidrio |
| 8 | El escondite | 3 | Busca la puerta de salida con tu llave. Escóndete en los armarios del equipo rojo |
| 9 | La cuerda | 3 | Cruza el puente saltando la cuerda gigante y el hueco del medio |
| 10 | El calamar en el cielo | 3 | Bota a los rivales de los pilares con embestidas |
| 11 | El juego del calamar | 1 | Contra el Front Man: en un pie hasta la cintura, después a la cabeza |

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
  `public/assets/kit/` con `forja/kit.config.json`: sprites en 3 direcciones, 44 animaciones, retratos con 8
  expresiones, voces, efectos y sonidos.
- **Escenarios e intro:** imágenes de Higgsfield en `arte/higgsfield/`, pasadas a pixel de 480 x 270 con paleta
  corta por `python3 herramientas/arte.py` (salen en `public/assets/fondos/`).
- **Música:** sintetizada en el navegador (`src/core/sonido.js`). El Danubio Azul es de Johann Strauss II.
- Créditos del arte LPC de las cabezas: `public/assets/kit/CREDITOS.txt`.

## Pruebas

```bash
node herramientas/probar.mjs <url> <carpeta> '<pasos JSON>'   # abre el juego en Chromium, aprieta teclas y saca capturas
```

`herramientas/bots.js` juega cada juego solo para comprobar que se puede ganar.
