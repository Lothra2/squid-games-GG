// Juega los 11 juegos con los bots (herramientas/bots.js) en modo práctica y cuenta cuántos se ganan.
//   node herramientas/jugar_todos.mjs <url> <carpeta> [dificultad] [juegos separados por coma]
import { chromium } from '/home/user/pixel_forja/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const [url, out, dif = '1', lista] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const JUEGOS = lista ? lista.split(',') : ['LuzRoja', 'Galleta', 'TiraAfloja', 'Canicas', 'Pentatlon', 'Mingle', 'Puente', 'Escondite', 'Cuerda', 'Cielo', 'Calamar'];
const bots = fs.readFileSync(new URL('./bots.js', import.meta.url), 'utf8');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errores = [];
p.on('pageerror', (e) => errores.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 14).join('\n')));
await p.goto(url);
await p.waitForFunction(() => window.__juego && window.__juego.scene.getScenes(true)[0] && window.__juego.scene.getScenes(true)[0].scene.key === 'Titulo', null, { timeout: 60000 });
const res = {};
for (const k of JUEGOS) {
  await p.evaluate(([k, dif]) => {
    clearInterval(window.__bot);
    window.__res = null;
    if (window.__E) window.__E.dificultad = +dif;
    // todas las escenas activas se paran: el juego anterior no deja nada corriendo
    const g = window.__juego;
    g.scene.getScenes(true).forEach((s) => g.scene.stop(s.scene.key));
    g.scene.start(k, { practica: true, dificultad: +dif });
  }, [k, dif]);
  await p.waitForTimeout(1500);
  await p.evaluate(bots);
  const t0 = Date.now();
  let r = '';
  while (Date.now() - t0 < 240000) {
    await p.waitForTimeout(1000);
    r = await p.evaluate(() => window.__res);
    if (r) break;
  }
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/${k}.png` });
  res[k] = r || 'SIN TERMINAR';
  const fig = await p.evaluate(() => { const s = window.__juego.scene.getScenes(true)[0]; return s.figura ? s.figura + ' ' + s.nRaspado + '/' + s.camino.length : ''; });
  if (fig) console.log('  figura:', fig);
  const causas = await p.evaluate(() => { const c = window.__causas || []; window.__causas = []; return c; });
  if (causas.length) console.log('  caídas:', causas.join(', '));
  console.log(k, '->', res[k], Math.round((Date.now() - t0) / 1000) + 's');
}
console.log(errores.length ? errores.join('\n') : 'sin errores');
await b.close();
