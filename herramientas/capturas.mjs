// Saca capturas de cada juego en plena partida (con los bots jugando) para revisar el arte.
//   node herramientas/capturas.mjs <url> <carpeta> [juegos separados por coma] [segundos]
import { chromium } from '/home/user/pixel_forja/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const [url, out, lista, seg = '7'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const JUEGOS = lista ? lista.split(',') : ['LuzRoja', 'Galleta', 'TiraAfloja', 'Canicas', 'Pentatlon', 'Mingle', 'Puente', 'Escondite', 'Cuerda', 'Cielo', 'Calamar'];
const bots = fs.readFileSync(new URL('./bots.js', import.meta.url), 'utf8');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errores = [];
p.on('pageerror', (e) => errores.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 8).join('\n')));
await p.goto(url);
await p.waitForTimeout(4000);
for (const k of JUEGOS) {
  await p.evaluate((k) => { clearInterval(window.__bot); window.__juego.scene.getScenes(true)[0].scene.start(k, { practica: true }); }, k);
  await p.waitForTimeout(1200);
  await p.evaluate(bots);
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && !(await p.evaluate(() => window.__juego.scene.getScenes(true)[0].jugando))) await p.waitForTimeout(300);
  for (let i = 0; i < 2; i++) { await p.waitForTimeout(+seg * 500); await p.screenshot({ path: `${out}/${k}_${i}.png` }); }
}
console.log(errores.length ? errores.join('\n') : 'sin errores');
await b.close();
