"""Pasa las imágenes de Higgsfield (arte/higgsfield) a pixel del juego en public/assets/fondos.

Cada fondo queda a 640 x 360 (la resolución del juego), con una paleta corta y sin tramado, para que se vea
pixel de verdad al lado de los sprites de PixelForja. La muñeca se recorta del verde.

    python3 herramientas/arte.py
"""
import os
from PIL import Image

raiz = os.path.join(os.path.dirname(__file__), '..')
src = os.path.join(raiz, 'arte', 'higgsfield')
out = os.path.join(raiz, 'public', 'assets', 'fondos')
os.makedirs(out, exist_ok=True)

def pixel(im, w, h, colores=64):
    # cubre el cuadro sin deformar y recorta al centro
    r = max(w / im.width, h / im.height)
    im = im.convert('RGB').resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    im = im.crop((x, y, x + w, y + h))
    return im.quantize(colores, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')

FONDOS = ['dormitorio', 'frontman', 'escaleras', 'titulo', 'galleta', 'tira',
          'canicas', 'puente', 'calamar', 'mingle', 'pentatlon', 'cuerda', 'cielo', 'votacion']
for n in FONDOS:
    pixel(Image.open(os.path.join(src, n + '.png')), 640, 360).save(os.path.join(out, n + '.png'), optimize=True)

# la pared del cielo pintado de luz roja: solo la pared (sin el piso), 140 de alto, y en espejo para que empalme
im = Image.open(os.path.join(src, 'luz_roja.png')).convert('RGB')
pared = im.crop((0, 0, im.width, int(im.height * 0.78)))
w = round(pared.width * 186 / pared.height)
pared = pixel(pared, w, 186, 48)
doble = Image.new('RGB', (w * 2, 186))
doble.paste(pared, (0, 0))
doble.paste(pared.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
doble.save(os.path.join(out, 'pared_cielo.png'), optimize=True)

# la muñeca: fuera el verde, recortada a su caja, a 128 de alto
def muneca(n, alto=176):
    im = Image.open(os.path.join(src, n + '.png')).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if g > 150 and r < 140 and b < 140 and g - max(r, b) > 60:
                px[x, y] = (0, 0, 0, 0)
    im = im.crop(im.getbbox())
    w = round(im.width * alto / im.height)
    rgb = im.convert('RGB').resize((w, alto), Image.LANCZOS).quantize(32, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    alfa = im.getchannel('A').resize((w, alto), Image.LANCZOS).point(lambda v: 255 if v > 128 else 0)
    rgb.putalpha(alfa)
    # contorno oscuro de 1 pixel para que se lea sobre el cielo
    p = rgb.load()
    borde = []
    for y in range(alto):
        for x in range(w):
            if p[x, y][3] == 0 and any(0 <= x + dx < w and 0 <= y + dy < alto and p[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                borde.append((x, y))
    for x, y in borde:
        p[x, y] = (30, 20, 24, 255)
    rgb.save(os.path.join(out, n + '.png'), optimize=True)

muneca('muneca_frente')
muneca('muneca_espalda')
print('listo:', sorted(os.listdir(out)))
