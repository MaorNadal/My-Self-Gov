/* ממשל אישי - סנכרון לענן דרך Google Apps Script (ראה Code.gs ו-README.md).
   עיקרון: מקומי קודם. הדפדפן הוא מקור העבודה, והענן (קובץ JSON בדרייב שלך) הוא גיבוי קבוע ושיתוף בין מכשירים.
   הגנה מפני דריסה: "נעילה אופטימית". דחיפה נכשלת אם בענן יש גרסה שלא ראית, ואז אתה בוחר במפורש: למשוך או לדרוס.
   ההגדרות (כתובת + מפתח) נשמרות ב-gov_sync ולעולם לא נכללות בגיבוי או בסנכרון. */
(function () {
    'use strict';
    const P = 'gov_', SKIP = [P + 'lock', P + 'sync', P + 'ai'], URL_RE = /^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[^/]+\/exec$/;
    const blank = () => ({ url: '', token: '', auto: false, base: 0, last: 0, state: 'idle', msg: '' });
    function cfg() {
        try { const v = JSON.parse(localStorage.getItem(P + 'sync')); if (v && typeof v === 'object') return Object.assign(blank(), { url: String(v.url || ''), token: String(v.token || ''), auto: v.auto === true, base: Number(v.base) || 0, last: Number(v.last) || 0, state: String(v.state || 'idle'), msg: String(v.msg || '') }); } catch (e) {}
        return blank();
    }
    function save(c) { try { localStorage.setItem(P + 'sync', JSON.stringify(c)); } catch (e) {} try { window.dispatchEvent(new Event('gov:sync')); } catch (e) {} }
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
            const j = await call({ action: 'push', baseUpdatedAt: c.base, force: !!force, data: snapshot() });
            if (j.ok) { c.base = j.updatedAt; c.last = Date.now(); c.state = 'ok'; c.msg = ''; }
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
            const data = j.data && typeof j.data === 'object' ? j.data : {};
            const valid = {}; Object.entries(data).forEach(([k, v]) => { if (k.startsWith(P) && !SKIP.includes(k) && typeof v === 'string') { try { JSON.parse(v); valid[k] = v; } catch (e) {} } });
            const local = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(P) && !SKIP.includes(k)) local.push(k); }
            local.forEach(k => { if (!(k in valid)) localStorage.removeItem(k); });
            Object.entries(valid).forEach(([k, v]) => localStorage.setItem(k, v));
            c.base = j.updatedAt || 0; c.last = Date.now(); c.state = 'ok'; c.msg = 'נמשכו ' + Object.keys(valid).length + ' רשומות מהענן.'; save(c);
            return c;
        } catch (e) { return fail(c, e); }
    }
    function setConfig(o) { const c = cfg(); if (o.url !== undefined) { if (o.url !== c.url) { c.base = 0; c.state = 'idle'; c.msg = ''; } c.url = String(o.url).trim(); } if (o.token !== undefined) c.token = String(o.token).trim(); if (o.auto !== undefined) c.auto = !!o.auto; save(c); }

    let timer = null;
    window.addEventListener('gov:changed', () => {
        const c = cfg(); if (!c.auto || !URL_RE.test(c.url) || !c.token || ['conflict', 'behind', 'syncing'].includes(c.state)) return;
        clearTimeout(timer); timer = setTimeout(() => push(false), 5000);
    });
    const boot = () => { const c = cfg(); if (URL_RE.test(c.url) && c.token && c.auto) ping(); };
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', boot); else boot();
    // ---- הגדרות ענן מוצפנות (gov-config.enc.json): מכשיר חדש מזין רק סיסמה ומתחבר אוטומטית ----
    // AES-GCM 256, מפתח מ-PBKDF2-SHA256 (600,000 חזרות). הקובץ ציבורי באתר, ולכן חוזק הסיסמה הוא כל ההגנה על הטוקן.
    const b64 = u => btoa(String.fromCharCode.apply(null, Array.from(u))), unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
    async function deriveKey(pw, salt) { const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
    async function exportConfig(password) {
        const c = cfg(); if (!URL_RE.test(c.url) || !c.token) return { ok: false, error: 'קודם הגדר כתובת ומפתח ענן ושמור.' };
        if (String(password || '').length < 8) return { ok: false, error: 'הסיסמה חייבת להכיל לפחות 8 תווים.' };
        const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), key = await deriveKey(password, salt);
        const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify({ url: c.url, token: c.token })));
        return { ok: true, json: JSON.stringify({ v: 1, kdf: 'PBKDF2-SHA256-600000', salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) }, null, 2) };
    }
    async function importConfig(password, obj) {
        try { const key = await deriveKey(String(password), unb64(obj.salt)), pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(obj.iv) }, key, unb64(obj.ct)), d = JSON.parse(new TextDecoder().decode(pt));
            if (!URL_RE.test(d.url) || !d.token) return { ok: false, error: 'קובץ ההגדרות פגום.' }; setConfig({ url: d.url, token: d.token, auto: true }); return { ok: true }; }
        catch (e) { return { ok: false, error: 'סיסמה שגויה או קובץ פגום.' }; }
    }

    window.GOV_SYNC = { cfg, setConfig, push, pull, ping, URL_RE, exportConfig, importConfig };
})();
