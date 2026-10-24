"""Deja dist/ listo para publicar como artifact (y sigue sirviendo en Netlify).

- El audio .m4a pasa a .mp3 (lo tocan Safari y Chrome, y el artifact lo sirve). Sin ffmpeg, se queda en .m4a.
- Las fuentes .fnt pasan a .xml (es el mismo BMFont en XML).
- Sale dist/juego.html (la página del artifact) y dist/archivos.json con la lista de archivos a publicar.

    python3 herramientas/empaquetar.py
"""
import json, os, shutil, subprocess

raiz = os.path.join(os.path.dirname(__file__), '..')
dist = os.path.join(raiz, 'dist')
kit = os.path.join(dist, 'assets', 'kit')
man_p = os.path.join(kit, 'manifest.json')
m = json.load(open(man_p))

hay_ffmpeg = shutil.which('ffmpeg') is not None
if hay_ffmpeg:
    for r, _, fs in os.walk(os.path.join(kit, 'audio')):
        for f in fs:
            if f.endswith('.m4a'):
                src = os.path.join(r, f)
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-codec:a', 'libmp3lame', '-b:a', '64k', src[:-4] + '.mp3'], check=True)
                os.remove(src)
    for sec in ('sfx', 'musica', 'ambientes'):
        for s in m['audio'].get(sec, {}).values():
            if isinstance(s, dict) and 'archivo' in s:
                s['archivo'] = [a.replace('.m4a', '.mp3') for a in s['archivo']]

for f in m['ui']['fuentes'].values():
    if isinstance(f, dict) and f.get('fnt', '').endswith('.fnt'):
        viejo = os.path.join(kit, f['fnt'])
        f['fnt'] = f['fnt'][:-4] + '.xml'
        if os.path.exists(viejo):
            os.replace(viejo, os.path.join(kit, f['fnt']))

# el juego solo usa cuadros, fps y bucle de cada animación: los datos por cuadro (cajas, manos...) se quedan en el kit
def flaco(anims):
    return {n: {k: d[k] for k in ('cuadros', 'fps', 'loop') if k in d} for n, d in anims.items()}

def adelgazar(carpeta, man):
    for a in man.get('atletas', {}).values():
        for p in a.get('packs', {}).values():
            p['anims'] = flaco(p['anims'])
    for a in man.get('animales', {}).values():
        a['anims'] = flaco(a['anims'])
    man.pop('creditos', None)
    json.dump(man, open(os.path.join(carpeta, 'manifest.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    # los atlas, sin espacios
    for r, _, fs in os.walk(carpeta):
        for f in fs:
            if f.endswith('.json') and f != 'manifest.json':
                q = os.path.join(r, f)
                json.dump(json.load(open(q)), open(q, 'w'), separators=(',', ':'))

adelgazar(kit, m)
# el kit de la gente (los otros jugadores): solo personajes, sin audio ni fuentes
gente = os.path.join(dist, 'assets', 'kit_gente')
if os.path.exists(gente):
    adelgazar(gente, json.load(open(os.path.join(gente, 'manifest.json'))))
esc = os.path.join(kit, 'audio', 'escuchar.html')
if os.path.exists(esc):
    os.remove(esc)
shutil.copy(os.path.join(raiz, 'herramientas', 'pagina.html'), os.path.join(dist, 'juego.html'))

archivos = []
for r, _, fs in os.walk(os.path.join(dist, 'assets')):
    for f in fs:
        archivos.append(os.path.relpath(os.path.join(r, f), dist))
archivos.sort(key=lambda p: (p != 'assets/juego.js', p))
json.dump(archivos, open(os.path.join(dist, 'archivos.json'), 'w'), indent=0)
print(f'{len(archivos)} archivos, mp3: {hay_ffmpeg}')
