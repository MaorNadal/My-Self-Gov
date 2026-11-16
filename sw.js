/* ממשל אישי - Service Worker (v0.22).
   מטרה: האפליקציה נפתחת גם בלי רשת. קבצי המערכת: רשת קודם (כדי שעדכונים יגיעו), ואם אין רשת מהמטמון.
   ספריות חיצוניות (Tailwind, Chart.js, גופן): נשמרות במטמון בפעם הראשונה שהן נטענות, ומתעדכנות ברקע.
   לעולם לא נוגעים בבקשות לענן (script.google.com) או לבקשות שאינן GET, ולכן הסנכרון והמפתחות לא עוברים במטמון. */
const VERSION = '0.22.0', SHELL = 'gov-shell-' + VERSION, EXT = 'gov-ext-v1';
const FILES = ["articles.html", "cabinet.html", "career.html", "central.html", "elements.html", "gov-ai.js", "gov-articles.js", "gov-core.js", "gov-cq-data.js", "gov-cq.js", "gov-elements.js", "gov-money.js", "gov-nav.js", "gov-review.js", "gov-scen.js", "gov-sync.js", "gov-vault.js", "gov-viz.js", "gov-vocab-data.js", "gov-vocab-more.js", "gov-vocab-more2.js", "gov-vocab.js", "index.html", "issues.html", "lang.html", "live.html", "ministers.html", "money.html", "operations.html", "people.html", "player.html", "portfolios.html", "promises.html", "quiz.html", "review.html", "schedule.html", "tasks.html", "treaties.html", "trip.html", "vocab.html", "wins.html", "wish.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "icons/icon.svg"];
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('gov-shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const EXT_HOSTS = ['cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'unpkg.com'];
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return; let u; try { u = new URL(r.url); } catch (x) { return; }
  if (u.hostname === 'script.google.com' || u.hostname.endsWith('googleusercontent.com') || u.hostname.includes('generativelanguage')) return;
  if (u.origin === location.origin) {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(SHELL).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
  } else if (EXT_HOSTS.includes(u.hostname)) {
    e.respondWith(caches.open(EXT).then(c => c.match(r).then(m => { const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(() => m); return m || net; })));
  }
});
