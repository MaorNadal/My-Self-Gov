/* ממשל אישי - סנכרון לענן דרך Google Apps Script (ראה Code.gs ו-README.md).
   עיקרון: מקומי קודם. הדפדפן הוא מקור העבודה, והענן (קובץ JSON בדרייב שלך) הוא גיבוי קבוע ושיתוף בין מכשירים.
   הגנה מפני דריסה: "נעילה אופטימית". דחיפה נכשלת אם בענן יש גרסה שלא ראית, ואז אתה בוחר במפורש: למשוך או לדרוס.
   ההגדרות (כתובת + מפתח) נשמרות ב-gov_sync ולעולם לא נכללות בגיבוי או בסנכרון. */
(function () {
    'use strict';
    const P = 'gov_', SKIP = [P + 'lock', P + 'sync', P + 'ai', P + 'vault'], URL_RE = /^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[^/]+\/exec$/;
    const blank = () => ({ url: '', token: '', auto: false, base: 0, last: 0, state: 'idle', msg: '', kt: {}, kh: {}, conf: 0 });
    const V = () => window.GOV_VAULT;
    const sec = () => { const v = V() && V().get('sync'); return { url: v && typeof v.url === 'string' ? v.url : '', token: v && typeof v.token === 'string' ? v.token : '', enc: v && typeof v.enc === 'string' ? v.enc : '' }; };
    function cfg() {   // כתובת ומפתח מגיעים רק מהכספת (בזיכרון), ולא מ-localStorage בגלוי
        let v = null; try { v = JSON.parse(localStorage.getItem(P + 'sync')); } catch (e) {}
        v = v && typeof v === 'object' ? v : {};
        const mp = o => { const r = {}; if (o && typeof o === 'object' && !Array.isArray(o)) Object.keys(o).forEach(k => { if (k.startsWith(P) && (typeof o[k] === 'number' || typeof o[k] === 'string')) r[k] = o[k]; }); return r; };
        return Object.assign(blank(), { auto: v.auto === true, base: Number(v.base) || 0, last: Number(v.last) || 0, state: String(v.state || 'idle'), msg: String(v.msg || ''), kt: mp(v.kt), kh: mp(v.kh), conf: Number(v.conf) || 0 }, sec());
    }
    function save(c) { try { localStorage.setItem(P + 'sync', JSON.stringify({ auto: c.auto, base: c.base, last: c.last, state: c.state, msg: c.msg, kt: c.kt, kh: c.kh, conf: c.conf })); } catch (e) {} try { window.dispatchEvent(new Event('gov:sync')); } catch (e) {} }
    const b64 = u => btoa(String.fromCharCode.apply(null, Array.from(u))), unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
    const maskUrl = u => { try { const m = String(u).match(/\/s\/([^/]+)\/exec/); return m ? 'script.google.com/…' + m[1].slice(-4) : ''; } catch (e) { return ''; } };
    function snapshot() { const d = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(P) && !SKIP.includes(k)) d[k] = localStorage.getItem(k); } } catch (e) {} return d; }
    async function call(body) {
        const c = cfg();
        if (!URL_RE.test(c.url)) throw new Error('כתובת ה-Apps Script אינה תקינה (צריכה להסתיים ב-/exec).');
        if (!c.token) throw new Error('לא הוגדר מפתח.');
        const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 30000);
        try {
            const r = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ token: c.token }, body)), signal: ctrl.signal });
            return await r.json();
        } finally { clearTimeout(t); }
    }
    const fail = (c, e) => { c.state = 'error'; c.msg = e && e.name === 'AbortError' ? 'הבקשה ארכה יותר מדי.' : (e && e.message ? e.message : 'שגיאה לא ידועה') + ' (ייתכן שאין חיבור).'; save(c); return c; };


    // ---------- הצפנת תוכן הענן מקצה לקצה (v0.23) ----------
    // כשמוגדרת סיסמת הצפנה (נשמרת רק בכספת), כל ערך נשלח לענן כ-enc1:iv:ct (AES-GCM-256, מפתח PBKDF2-SHA256 600,000 חזרות, מלח מהמפתח של הענן).
    // שמות המפתחות (gov_tasks וכו') נשארים גלויים ל-Google, והתוכן לא. לא מצפינים את הגיבויים הישנים שכבר נוצרו בדרייב.
    const ENC = 'enc1:'; let keyCache = { id: '', key: null };
    async function encKey(c) {
        const id = c.enc + '|' + c.token; if (keyCache.id === id && keyCache.key) return keyCache.key;
        const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(c.enc), 'PBKDF2', false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new TextEncoder().encode('gov-enc-v1|' + c.token), iterations: 600000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        keyCache = { id, key }; return key;
    }
    async function encV(c, v) { if (!c.enc || v === null) return v; const iv = crypto.getRandomValues(new Uint8Array(12)), ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encKey(c), new TextEncoder().encode(v)); return ENC + b64(iv) + ':' + b64(new Uint8Array(ct)); }
    async function decV(c, v) {
        if (v === null || typeof v !== 'string' || !v.startsWith(ENC)) return v;   // ערך ישן בלי הצפנה: מתקבל כמות שהוא
        if (!c.enc) throw new Error('הנתונים בענן מוצפנים. הזן את סיסמת ההצפנה בהגדרות הענן.');
        const p = v.slice(ENC.length).split(':'); try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(p[0]) }, await encKey(c), unb64(p[1]))); } catch (e) { throw new Error('סיסמת ההצפנה שגויה או שהנתונים בענן פגומים.'); }
    }
    async function encAll(c, o) { const r = {}; for (const k of Object.keys(o)) r[k] = await encV(c, o[k]); return r; }
    async function ping() {
        const c = cfg();
        try {
            const j = await call({ action: 'ping' });
            if (!j.ok) { c.state = 'error'; c.msg = j.error === 'unauthorized' ? 'המפתח שגוי.' : (j.error || 'שגיאה'); }
            else if (c.base && j.updatedAt && j.updatedAt !== c.base) { c.state = 'behind'; c.msg = 'בענן יש גרסה שלא נמשכה למכשיר הזה.'; }
            else if (!c.base && j.updatedAt) { c.state = 'behind'; c.msg = 'בענן כבר יש נתונים. משוך אותם, או דרוס אותם במכוון.'; }
            else { c.state = c.last ? 'ok' : 'idle'; c.msg = 'החיבור תקין.'; }
            save(c); return c;
        } catch (e) { return fail(c, e); }
    }
    async function push(force) {
        const c = cfg(); c.state = 'syncing'; c.msg = ''; save(c);
        try {
            const snap = snapshot(), j = await call({ action: 'push', baseUpdatedAt: c.base, force: !!force, data: await encAll(c, snap) });
            if (j.ok) { c.base = j.updatedAt; c.last = Date.now(); c.state = 'ok'; c.msg = ''; c.kt = {}; c.kh = {}; Object.keys(snap).forEach(k => { c.kt[k] = j.updatedAt; c.kh[k] = hash(snap[k]); }); }
            else if (j.error === 'conflict') { c.state = 'conflict'; c.msg = 'בענן יש גרסה חדשה יותר שלא נמשכה. משוך אותה, או דרוס אותה במכוון.'; }
            else { c.state = 'error'; c.msg = j.error === 'unauthorized' ? 'המפתח שגוי.' : (j.error || 'שגיאה'); }
            save(c); return c;
        } catch (e) { return fail(c, e); }
    }
    async function pull() {
        const c = cfg(); c.state = 'syncing'; save(c);
        try {
            const j = await call({ action: 'pull' });
            if (!j.ok) { c.state = 'error'; c.msg = j.error === 'unauthorized' ? 'המפתח שגוי.' : (j.error || 'שגיאה'); save(c); return c; }
            const data = {}; for (const k of Object.keys(j.data && typeof j.data === 'object' ? j.data : {})) data[k] = await decV(c, j.data[k]);
            const valid = {}; Object.entries(data).forEach(([k, v]) => { if (k.startsWith(P) && !SKIP.includes(k) && typeof v === 'string') { try { JSON.parse(v); valid[k] = v; } catch (e) {} } });
            const local = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(P) && !SKIP.includes(k)) local.push(k); }
            local.forEach(k => { if (!(k in valid)) localStorage.removeItem(k); });
            Object.entries(valid).forEach(([k, v]) => localStorage.setItem(k, v));
            c.kt = {}; c.kh = {}; Object.keys(valid).forEach(k => { c.kt[k] = (j.ts && Number(j.ts[k])) || j.updatedAt || 1; c.kh[k] = hash(valid[k]); });
            c.base = j.updatedAt || 0; c.last = Date.now(); c.state = 'ok'; c.msg = 'נמשכו ' + Object.keys(valid).length + ' רשומות מהענן.'; save(c);
            return c;
        } catch (e) { return fail(c, e); }
    }
    async function setConfig(o) {
        const c = cfg(), cur = sec(); let url = cur.url, token = cur.token;
        if (o.url !== undefined && String(o.url).trim()) { const u = String(o.url).trim(); if (!URL_RE.test(u)) return { ok: false, error: 'כתובת ה-Apps Script אינה תקינה (צריכה להסתיים ב-/exec).' }; if (u !== url) { c.base = 0; c.state = 'idle'; c.msg = ''; } url = u; }
        if (o.token !== undefined && String(o.token).trim()) token = String(o.token).trim();
        if (o.auto !== undefined) c.auto = !!o.auto;
        if ((url !== cur.url || token !== cur.token)) { const r = await V().set('sync', { url, token }); if (!r.ok) return { ok: false, error: 'הכספת נעולה. הגדר סיסמה והיכנס אליה כדי לשמור מפתחות.' }; }
        save(c); return { ok: true };
    }
    function clearConfig() { V() && V().remove('sync'); const c = cfg(); c.kt = {}; c.kh = {}; c.base = 0; c.last = 0; c.state = 'idle'; c.msg = ''; c.auto = false; save(c); }

    // ---------- סנכרון אוטומטי מלא (v0.22) ----------
    // כל שינוי במכשיר עולה לענן אחרי 3 שניות; המכשיר מושך שינויים מהענן בפתיחה, בחזרה לחלון, בחזרת חיבור ובכל 30 שניות.
    // הזיהוי מבוסס על טביעת אצבע של כל מפתח (kh) ועל גרסת הענן שהמכשיר מכיר (kt), ללא מגע בקוד שכותב נתונים.
    // מפתח ששונה בשני מקומות נמזג: רשימות של רשומות עם id מתאחדות, ובשדות אחרים הערך של המכשיר הנוכחי גובר.
    const hash = v => { if (v === null || v === undefined) return 'null'; let h = 2166136261; const t = String(v); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36) + ':' + t.length; };
    const isRecs = a => Array.isArray(a) && a.every(x => x && typeof x === 'object' && !Array.isArray(x) && typeof x.id === 'string');
    function mergeVal(l, r, depth) {   // l = המכשיר הזה, r = הענן
        if (isRecs(l) && isRecs(r)) { const lm = new Map(l.map(x => [x.id, x])), out = r.map(x => lm.has(x.id) ? lm.get(x.id) : x), seen = new Set(r.map(x => x.id)); l.forEach(x => { if (!seen.has(x.id)) out.push(x); }); return out; }
        if (depth < 2 && l && r && typeof l === 'object' && typeof r === 'object' && !Array.isArray(l) && !Array.isArray(r)) { const o = Object.assign({}, r); Object.keys(l).forEach(k => { o[k] = k in r ? mergeVal(l[k], r[k], depth + 1) : l[k]; }); return o; }
        return l;
    }
    function mergeStr(ls, rs) { try { return JSON.stringify(mergeVal(JSON.parse(ls), JSON.parse(rs), 0)); } catch (e) { return ls; } }
    let busy = false, again = false, timer = null, poll = null;
    function toast(n) {
        try { if (!document.body) return; let t = document.getElementById('govSyncToast'); if (!t) { t = document.createElement('div'); t.id = 'govSyncToast'; t.style.cssText = 'position:fixed;bottom:14px;left:14px;z-index:900;background:#0b1220;border:1px solid #38bdf8;color:#e2e8f0;border-radius:12px;padding:9px 12px;font:13px Rubik,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5);display:flex;gap:10px;align-items:center'; document.body.appendChild(t); }
            t.innerHTML = '☁️ התקבלו עדכונים מהענן (' + n + ') <button style="background:#fbbf24;color:#0f172a;border:0;border-radius:8px;padding:4px 10px;font-weight:700;cursor:pointer" onclick="location.reload()">רענן</button><button style="background:none;border:0;color:#94a3b8;cursor:pointer" onclick="this.parentNode.remove()">✕</button>'; } catch (e) {}
    }
    async function sync() {
        const c0 = cfg(); if (!URL_RE.test(c0.url) || !c0.token) return c0;
        if (busy) { again = true; return c0; } busy = true;
        let touched = [];
        try {
            for (let round = 0; round < 3; round++) {
                const c = cfg(); c.state = 'syncing'; c.msg = ''; if (round === 0) save(c);
                if (!Object.keys(c.kt).length) {   // מכשיר שעוד לא סונכרן: לא דורסים בשקט
                    const pj = await call({ action: 'ping' });
                    if (!pj.ok) { c.state = 'error'; c.msg = pj.error === 'unauthorized' ? 'המפתח שגוי.' : (pj.error || 'שגיאה'); save(c); return c; }
                    if (pj.updatedAt && !pj.empty) {
                        if (c.base && c.base === pj.updatedAt) { Object.keys(snapshot()).forEach(k => { c.kt[k] = pj.updatedAt; }); }   // מכשיר מגרסה ישנה שהיה מעודכן: ממשיכים
                        else { c.state = 'behind'; c.msg = 'בענן כבר יש נתונים. בחר: למשוך אותם (מומלץ במכשיר חדש), למזג עם המכשיר הזה, או לדרוס.'; save(c); return c; }
                    }
                }
                const snap = snapshot(), changes = {};
                Object.keys(snap).forEach(k => { if (c.kh[k] !== hash(snap[k])) changes[k] = snap[k]; });
                Object.keys(c.kh).forEach(k => { if (!(k in snap)) changes[k] = null; });
                const j = await call({ action: 'sync', known: c.kt, changes: await encAll(c, changes) });
                if (!j.ok) { c.state = 'error'; c.msg = j.error === 'unauthorized' ? 'המפתח שגוי.' : j.error === 'busy' ? 'השרת עסוק, ינסה שוב.' : (j.error === 'unknown_action' ? 'יש לפרוס מחדש את Code.gs (גרסה חדשה).' : (j.error || 'שגיאה')); save(c); return c; }
                Object.keys(j.applied || {}).forEach(k => { c.kt[k] = j.applied[k]; if (k in changes && changes[k] === null) delete c.kh[k]; else c.kh[k] = hash(changes[k]); });
                let conflicted = 0;
                for (const k of Object.keys(j.updates || {})) {
                    if (!k.startsWith(P) || SKIP.includes(k)) continue; const u0 = j.updates[k]; if (!u0 || (u0.v !== null && typeof u0.v !== 'string')) continue; const u = { v: await decV(c, u0.v), t: u0.t };
                    const cur = localStorage.getItem(k), dirty = hash(cur) !== (k in c.kh ? c.kh[k] : 'null');
                    if (u.v !== null) { try { JSON.parse(u.v); } catch (e) { continue; } }
                    if (!dirty) { if (u.v === null) { localStorage.removeItem(k); delete c.kh[k]; } else { localStorage.setItem(k, u.v); c.kh[k] = hash(u.v); } touched.push(k); }
                    else { conflicted++; if (u.v !== null && cur !== null) localStorage.setItem(k, mergeStr(cur, u.v)); }   // kh נשאר, ולכן הערך הממוזג יעלה בסבב הבא
                    c.kt[k] = Number(u.t) || 1;
                }
                c.conf += conflicted; c.base = j.updatedAt || c.base; c.last = Date.now(); c.state = 'ok'; c.msg = conflicted ? 'מוזגו שינויים משני מכשירים (' + conflicted + ' קבצי נתונים).' : ''; save(c);
                if (!conflicted && !(j.conflicts || []).length) break;
            }
            if (touched.length) { try { touched.forEach(k => window.dispatchEvent(new StorageEvent('storage', { key: k }))); window.dispatchEvent(new Event('gov:remote')); } catch (e) {} toast(touched.length); }
            return cfg();
        } catch (e) { return fail(cfg(), e); }
        finally { busy = false; if (again) { again = false; setTimeout(sync, 800); } }
    }
    // פעולת בחירה למכשיר חדש כשבענן כבר יש נתונים
    async function mergeFirst() { const c = cfg(); c.kt = {}; c.kh = {}; c.base = 0; save(c); const pj = await call({ action: 'pull' }).catch(() => null); if (!pj || !pj.ok) return fail(cfg(), new Error('המשיכה נכשלה')); const c2 = cfg(); Object.keys(pj.ts || {}).forEach(k => { c2.kt[k] = Number(pj.ts[k]) || 1; }); save(c2); return sync(); }
    const ready = () => { const c = cfg(); return c.auto && URL_RE.test(c.url) && c.token && !['behind', 'conflict'].includes(c.state); };
    window.addEventListener('gov:changed', () => { if (!ready()) return; clearTimeout(timer); timer = setTimeout(sync, 3000); });
    const kick = () => { if (ready() && navigator.onLine !== false) sync(); };
    let booted = false;
    const boot = () => { if (booted) return; const c = cfg(); if (!(URL_RE.test(c.url) && c.token && c.auto)) return; booted = true; if (c.state === 'behind' || c.state === 'conflict') { c.state = 'idle'; save(c); } kick(); clearInterval(poll); poll = setInterval(() => { if (!document.hidden) kick(); }, 30000); };
    window.addEventListener('gov:vault', boot);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    window.addEventListener('focus', kick); window.addEventListener('online', kick);
    window.addEventListener('pagehide', () => { try { const c = cfg(); if (ready() && !c.enc && c.state !== 'syncing') { const snap = snapshot(), ch = {}; Object.keys(snap).forEach(k => { if (c.kh[k] !== hash(snap[k])) ch[k] = snap[k]; }); if (Object.keys(ch).length && navigator.sendBeacon) navigator.sendBeacon(c.url, new Blob([JSON.stringify({ token: c.token, action: 'sync', known: c.kt, changes: ch })], { type: 'text/plain;charset=utf-8' })); } } catch (e) {} });
    // ---- הגדרות ענן מוצפנות (gov-config.enc.json): מכשיר חדש מזין רק סיסמה ומתחבר אוטומטית ----
    // AES-GCM 256, מפתח מ-PBKDF2-SHA256 (600,000 חזרות). הקובץ ציבורי באתר, ולכן חוזק הסיסמה הוא כל ההגנה על הטוקן.
    async function deriveKey(pw, salt) { const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
    async function exportBlob(password) {
        const c = cfg(); if (!URL_RE.test(c.url) || !c.token) return { ok: false, error: 'קודם הגדר כתובת ומפתח ענן ושמור.' };
        if (String(password || '').length < 8) return { ok: false, error: 'הסיסמה חייבת להכיל לפחות 8 תווים.' };
        const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), key = await deriveKey(password, salt);
        const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify({ url: c.url, token: c.token })));
        return { ok: true, obj: { v: 1, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) } };
    }
    async function exportConfig(password) { const r = await exportBlob(password); return r.ok ? { ok: true, json: JSON.stringify(r.obj, null, 2) } : r; }
    async function exportLink(password) {   // קישור חד-פעמי: ההגדרות המוצפנות בחלק ה-# (לא נשלח לשרת ולא מאוחסן באתר)
        const r = await exportBlob(password); if (!r.ok) return r;
        const t = btoa(String.fromCharCode.apply(null, Array.from(new TextEncoder().encode(JSON.stringify(r.obj))))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return { ok: true, link: location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html#setup=' + t };
    }
    function parseLink(h) { try { const m = String(h || '').match(/^#setup=([A-Za-z0-9_-]+)$/); if (!m) return null; const b = m[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b + '='.repeat((4 - b.length % 4) % 4)), c => c.charCodeAt(0)))); } catch (e) { return null; } }
    async function importConfig(password, obj) {   // מפענח ומחזיר את הערכים; השמירה בכספת נעשית אחרי שנקבעה סיסמה
        try { const key = await deriveKey(String(password), unb64(obj.salt)), pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(obj.iv) }, key, unb64(obj.ct)), d = JSON.parse(new TextDecoder().decode(pt));
            if (!URL_RE.test(d.url) || !d.token) return { ok: false, error: 'קובץ ההגדרות פגום.' }; return { ok: true, url: d.url, token: d.token }; }
        catch (e) { return { ok: false, error: 'סיסמה שגויה או קובץ פגום.' }; }
    }

    // הפעלת הצפנה: שומר את הסיסמה בכספת, מסמן את כל המפתחות כשונים ודוחף אותם מוצפנים, ואז מוחק מהדרייב את הגיבויים הישנים הלא מוצפנים (דורש Code.gs מעודכן)
    const idle = async () => { for (let i = 0; i < 60 && (busy || again); i++) await new Promise(r => setTimeout(r, 250)); };
    async function enableEnc(pw) {
        pw = String(pw || ''); if (pw.length < 10) return { ok: false, error: 'סיסמת ההצפנה חייבת להכיל לפחות 10 תווים.' };
        const cur = sec(); if (!cur.url || !cur.token) return { ok: false, error: 'קודם חבר ענן.' };
        const r = await V().set('sync', { url: cur.url, token: cur.token, enc: pw }); if (!r.ok) return { ok: false, error: 'הכספת נעולה.' };
        await idle(); const c = cfg(); c.kh = {}; save(c); let res = await sync(); if (res.state === 'syncing') { await idle(); res = await sync(); } if (res.state !== 'ok') return { ok: false, error: (res.msg || 'הסנכרון נכשל') + ' [' + res.state + ']' };
        let purged = null; try { const j = await call({ action: 'purge_backups' }); purged = j && j.ok ? j.removed : null; } catch (e) {}
        return { ok: true, purged };
    }
    async function setEncPass(pw) { const cur = sec(); const r = await V().set('sync', { url: cur.url, token: cur.token, enc: String(pw || '') }); return r.ok ? { ok: true } : { ok: false, error: 'הכספת נעולה.' }; }
    async function disableEnc() { const cur = sec(); const r = await V().set('sync', { url: cur.url, token: cur.token }); if (!r.ok) return { ok: false, error: 'הכספת נעולה.' }; await idle(); const c = cfg(); c.kh = {}; save(c); let res = await sync(); if (res.state === 'syncing') { await idle(); res = await sync(); } return res.state === 'ok' ? { ok: true } : { ok: false, error: res.msg }; }
    window.GOV_SYNC = { enableEnc, setEncPass, disableEnc, encV, decV, cfg, setConfig, clearConfig, push, pull, ping, sync, mergeFirst, hash, URL_RE, exportConfig, exportLink, parseLink, importConfig, maskUrl };
})();
