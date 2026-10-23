// Prueba el juego en Chromium: abre una URL, corre pasos (teclas, esperas, capturas) y junta los errores.
//   node herramientas/probar.mjs <url> <carpeta> '<pasos JSON>'
// pasos: [["k","Space"], ["w",1000], ["s","nombre"], ["hold","ArrowRight",2000], ["js","codigo"]]
import { chromium } from '/home/user/pixel_forja/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const [url, out, pasosTxt] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const pasos = JSON.parse(pasosTxt || '[]');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }).catch(async () => chromium.launch());
const movil = process.env.MOVIL === '1';
const p = await b.newPage(movil ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 960, height: 540 } });
const errores = [];
p.on('pageerror', (e) => errores.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
p.on('response', (r) => { if (r.status() >= 400) errores.push('HTTP ' + r.status() + ' ' + r.url()); });
p.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GL Driver')) errores.push(m.type() + ': ' + m.text()); });
await p.goto(url);
for (const [t, a, c] of pasos) {
  if (t === 'w') await p.waitForTimeout(a);
  if (t === 'k') await p.keyboard.press(a);
  if (t === 'tap') await p.touchscreen.tap(a, c);
  if (t === 'hold') { await p.keyboard.down(a); await p.waitForTimeout(c); await p.keyboard.up(a); }
  if (t === 'down') await p.keyboard.down(a);
  if (t === 'up') await p.keyboard.up(a);
  if (t === 'file') console.log('file:', await p.evaluate(fs.readFileSync(a, 'utf8')));
  if (t === 's') await p.screenshot({ path: `${out}/${a}.png` });
  if (t === 'js') { const r = await p.evaluate('(() => { const v = ' + a + '; try { return JSON.stringify(v); } catch { return String(v); } })()'); if (r !== undefined) console.log('js:', r); }
}
console.log(errores.length ? errores.join('\n') : 'sin errores');
await b.close();
