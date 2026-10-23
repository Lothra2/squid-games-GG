"""Genera las fichas de PixelForja para El Juego del Calamar GG.

Toma las fichas de la familia y de la gente de Nekketsu (repo pixel_forja) y las viste:
chándal verde con número para los jugadores, mono rosado con capucha y máscara para los guardias,
negro para el Front Man y traje para el reclutador.

    python3 herramientas/fichas.py ../pixel_forja
"""
import copy, json, os, random, sys

forja = sys.argv[1] if len(sys.argv) > 1 else '../pixel_forja'
src = os.path.join(forja, 'docs/ejemplos/nekketsu/fichas')
out = os.path.join(os.path.dirname(__file__), '..', 'forja', 'fichas')
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    os.remove(os.path.join(out, f))

def load(n):
    return json.load(open(os.path.join(src, n + '.ficha.json')))

def ramp(hex):
    c = [int(hex[i:i + 2], 16) for i in (1, 3, 5)]
    mix = lambda t, to: '#' + ''.join(f'{round(v + (to - v) * t):02x}' for v in c)
    return [mix(0.6, 0), mix(0.28, 0), hex, mix(0.3, 255)]

def save(id, f, calle=None):
    for k, v in f.get('palette', {}).items():
        if k != 'eyes' and isinstance(v, str):
            f['palette'][k] = ramp(v)
    f.pop('wardrobe', None)
    # la ropa de calle (la de siempre) para las escenas fuera de la isla: el pack "calle" del kit
    if calle:
        f['wardrobe'] = {'variants': {'calle': calle}, 'packs': {'calle': 'calle'}}
    json.dump(f, open(os.path.join(out, id + '.ficha.json'), 'w'), ensure_ascii=False, indent=1)

VERDE = '#127e70'
CHANDAL = {
    'sleeves': 'long', 'bottom': 'pants', 'socks': 'low', 'shoes': 'tenis', 'collar': 'v', 'pattern': 'liso',
    'print': None, 'emblem': None, 'chestText': None, 'armband': None, 'neck': None, 'cape': None, 'armor': None,
    'jacket': VERDE, 'jacketCut': 'casual', 'jacketClosed': False, 'jacketSleeves': 'long', 'numberColor': '#f6f4ee',
}

def chandal(f, numero):
    f['outfit'] = {**CHANDAL, 'number': numero}
    f['palette']['top'] = '#f2f0e8'
    f['palette']['bottom'] = VERDE
    f['palette']['socks'] = '#f2f0e8'
    f['palette']['shoes'] = '#f4f4f0'
    lpc = f.get('avatar', {}).get('lpc')
    if lpc and lpc.get('hat') and not str(lpc['hat']).startswith(('headband', 'hairtie')):
        lpc['hat'] = None
        lpc['hatColor'] = None
    f.pop('gear', None)
    return f

# la familia: Rick 456, Steph 067, Sophie 018 (nació en 2018), Alana 222 (la bebé de la temporada 3)
FAMILIA = {'rick': '456', 'steph': '067', 'sophie': '018', 'alana': '222'}
for id, num in FAMILIA.items():
    f = load(id)
    # lo que el chándal pone y la ropa de calle no trae, se apaga (si no, la chaqueta verde se quedaría puesta)
    base = {'jacket': None, 'collar': 'redondo', 'pattern': 'liso', 'jacketCut': 'casual', 'jacketClosed': False,
            'jacketSleeves': 'long', 'armband': None, 'neck': None, 'cape': None, 'armor': None, 'emblem': None}
    calle = {'label': 'Calle', 'outfit': {**base, **copy.deepcopy(f['outfit'])},
             'colors': {k: f['palette'][k] for k in ('top', 'bottom', 'socks', 'shoes')}}
    save(id, chandal(f, num), calle)

# los otros jugadores
random.seed(456)
GENTE = ['andres', 'ba_hoa', 'camila', 'carmen', 'ender', 'gabo', 'goro', 'jhonder', 'kenji', 'lan', 'minh',
         'pipe', 'ryu', 'tetsu', 'toto', 'tuan', 'yuli', 'yusmary', 'abuela_nerva']
usados = set(FAMILIA.values()) | {'001'}
for id in GENTE:
    n = random.randint(2, 455)
    while f'{n:03d}' in usados:
        n = random.randint(2, 455)
    usados.add(f'{n:03d}')
    f = chandal(load(id), f'{n:03d}')
    f['name'] = f'Jugador {n:03d}'
    save('j_' + id, f)

# el abuelo 001
f = chandal(load('don_hernando'), '001')
f['name'] = 'Jugador 001'
save('j_abuelo', f)

# los guardias: mono rosado, guantes y botas negras, capucha con máscara
ROSA = '#e0457b'
def guardia(base, mascara, nombre):
    f = load(base)
    f['name'] = nombre
    f['outfit'] = {'sleeves': 'long', 'bottom': 'pants', 'socks': 'none', 'shoes': 'botas', 'collar': 'redondo',
                   'pattern': 'liso', 'print': None, 'emblem': None, 'chestText': None, 'armband': None, 'neck': None,
                   'cape': None, 'armor': None, 'jacket': None, 'gloves': True, 'belt': '#1a1820'}
    f['palette']['top'] = ROSA if mascara != 'mascara_front_man' else '#1c1b22'
    f['palette']['bottom'] = f['palette']['top']
    f['palette']['shoes'] = '#1a1820'
    f['palette']['accessory'] = '#1a1820'
    lpc = f['avatar']['lpc']
    lpc.update({'hair': None, 'beard': None, 'mustache': None, 'glasses': None, 'hat': mascara,
                'hatColor': None if mascara != 'mascara_front_man' else '#4a4a5c'})
    f['face']['glasses'] = None
    f.pop('gear', None)
    return f

save('guardia_circulo', guardia('kenji', 'mascara_circulo', 'Guardia ○'))
save('guardia_triangulo', guardia('ryu', 'mascara_triangulo', 'Guardia △'))
save('guardia_cuadrado', guardia('goro', 'mascara_cuadrado', 'Guardia □'))
fm = guardia('ryu', 'mascara_front_man', 'Front Man')
fm['outfit'].update({'jacket': '#24222a', 'jacketClosed': True, 'jacketSleeves': 'long', 'jacketCut': 'gakuran', 'buttons': '#3a3844'})
fm['body']['proportions']['height'] = 1.12
save('front_man', fm)

# el reclutador: traje gris, camisa blanca, maletín imaginario
r = load('ryu')
r['name'] = 'Reclutador'
r['outfit'] = {'sleeves': 'long', 'bottom': 'pants', 'socks': 'low', 'shoes': 'botas', 'collar': 'polo', 'pattern': 'liso',
               'print': None, 'emblem': None, 'chestText': None, 'armband': None, 'neck': None, 'cape': None, 'armor': None,
               'jacket': '#3c3f4a', 'jacketCut': 'casual', 'jacketClosed': False, 'jacketSleeves': 'long'}
r['palette']['top'] = '#f4f2ee'
r['palette']['bottom'] = '#3c3f4a'
r['palette']['shoes'] = '#1a1820'
r['avatar']['lpc'].update({'hair': 'swept_back', 'hat': None, 'hatColor': None})
save('reclutador', r)

print('fichas:', sorted(os.listdir(out)))
