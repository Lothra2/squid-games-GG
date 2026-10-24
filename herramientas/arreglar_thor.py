"""Thor sentado de perfil (sit_right) viene del kit con la cadera en el aire: solo apoya las patas de adelante.

Desde el cuello hacia abajo, la parte de atrás se estira (filas repetidas, sin mezclar colores) hasta que la cadera
y la cola apoyan en el piso. La cabeza y las patas de adelante no se tocan. Correr después de `npm run kit`:

    python3 herramientas/arreglar_thor.py
"""
import json, os
from PIL import Image

raiz = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'kit')
CUELLO = 27

def corte(x):
    # cuánto baja cada columna: toda la cola y la cadera 12 pixeles, y se va a cero hacia el pecho
    if x <= 28: return 12
    if x >= 38: return 0
    return round(12 * (38 - x) / 10)

def arreglar(c):
    out = c.copy(); p = c.load(); o = out.load()
    for x in range(c.width):
        k = corte(x)
        if not k: continue
        ys = [y for y in range(CUELLO, c.height) if p[x, y][3] > 0]
        if not ys: continue
        b = max(ys); b2 = min(c.height - 1, b + k)
        for y in range(CUELLO, c.height): o[x, y] = (0, 0, 0, 0)
        for yt in range(CUELLO, b2 + 1):
            o[x, yt] = p[x, CUELLO + round((yt - CUELLO) * (b - CUELLO) / (b2 - CUELLO))]
    return out

m = json.load(open(os.path.join(raiz, 'manifest.json')))['animales']['thor']
atlas = json.load(open(os.path.join(raiz, m['atlas'])))['frames']
ruta = os.path.join(raiz, m['imagen'])
im = Image.open(ruta).convert('RGBA')
hechos = 0
for k, f in atlas.items():
    if not k.startswith('sit_right_'): continue
    r = f['frame']; caja = (r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])
    c = im.crop(caja)
    ys = [y for x in range(c.width) for y in range(c.height) if c.getpixel((x, y))[3] > 0 and x < 20]
    if ys and max(ys) >= 58: continue  # ya apoya: estaba arreglado
    im.paste(arreglar(c), caja[:2])
    hechos += 1
im.save(ruta)
print('cuadros arreglados:', hechos)
