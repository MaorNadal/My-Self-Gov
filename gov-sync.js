/* ממשל אישי - סנכרון לענן דרך Google Apps Script (ראה Code.gs ו-README.md).
   עיקרון: מקומי קודם. הדפדפן הוא מקור העבודה, והענן (קובץ JSON בדרייב שלך) הוא גיבוי קבוע ושיתוף בין מכשירים.
   הגנה מפני דריסה: "נעילה אופטימית". דחיפה נכשלת אם בענן יש גרסה שלא ראית, ואז אתה בוחר במפורש: למשוך או לדרוס.
   ההגדרות (כתובת + מפתח) נשמרות ב-gov_sync ולעולם לא נכללות בגיבוי או בסנכרון. */
(function () {
    'use strict';
    const P = 'gov_', SKIP = [P + 'lock', P + 'sync', P + 'ai', P + 'vault'], URL_RE = /^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[^/]+\/exec$/;
    const blank = () => ({ url: '', token: '', auto: false, base: 0, last: 0, state: 'idle', msg: '' });
    const V = () => window.GOV_VAULT;
    const sec = () => { const v = V() && V().get('sync'); return { url: v && typeof v.url === 'string' ? v.url : '', token: v && typeof v.token === 'string' ? v.token : '' }; };
    function cfg() {   // כתובת ומפתח מגיעים רק מהכספת (בזיכרון), ולא מ-localStorage בגלוי
        let v = null; try { v = JSON.parse(localStorage.getItem(P + 'sync')); } catch (e) {}
        v = v && typeof v === 'object' ? v : {};
        return Object.assign(blank(), { auto: v.auto === true, base: Number(v.base) || 0, last: Number(v.last) || 0, state: String(v.state || 'idle'), msg: String(v.msg || '') }, sec());
    }
    function save(c) { try { localStorage.setItem(P + 'sync', JSON.stringify({ auto: c.auto, base: c.base, last: c.last, state: c.state, msg: c.msg })); } catch (e) {} try { window.dispatchEvent(new Event('gov:sync')); } catch (e) {} }
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
    async function setConfig(o) {
        const c = cfg(), cur = sec(); let url = cur.url, token = cur.token;
        if (o.url !== undefined && String(o.url).trim()) { const u = String(o.url).trim(); if (!URL_RE.test(u)) return { ok: false, error: 'כתובת ה-Apps Script אינה תקינה (צריכה להסתיים ב-/exec).' }; if (u !== url) { c.base = 0; c.state = 'idle'; c.msg = ''; } url = u; }
        if (o.token !== undefined && String(o.token).trim()) token = String(o.token).trim();
        if (o.auto !== undefined) c.auto = !!o.auto;
        if ((url !== cur.url || token !== cur.token)) { const r = await V().set('sync', { url, token }); if (!r.ok) return { ok: false, error: 'הכספת נעולה. הגדר סיסמה והיכנס אליה כדי לשמור מפתחות.' }; }
        save(c); return { ok: true };
    }
    function clearConfig() { V() && V().remove('sync'); const c = cfg(); c.base = 0; c.last = 0; c.state = 'idle'; c.msg = ''; c.auto = false; save(c); }

    let timer = null;
    window.addEventListener('gov:changed', () => {
        const c = cfg(); if (!c.auto || !URL_RE.test(c.url) || !c.token || ['conflict', 'behind', 'syncing'].includes(c.state)) return;
        clearTimeout(timer); timer = setTimeout(() => push(false), 5000);
    });
    let booted = false; const boot = () => { if (booted) return; const c = cfg(); if (URL_RE.test(c.url) && c.token && c.auto) { booted = true; ping(); } };
    window.addEventListener('gov:vault', boot);
    // ---- הגדרות ענן מוצפנות (gov-config.enc.json): מכשיר חדש מזין רק סיסמה ומתחבר אוטומטית ----
    // AES-GCM 256, מפתח מ-PBKDF2-SHA256 (600,000 חזרות). הקובץ ציבורי באתר, ולכן חוזק הסיסמה הוא כל ההגנה על הטוקן.
    const b64 = u => btoa(String.fromCharCode.apply(null, Array.from(u))), unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
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

    window.GOV_SYNC = { cfg, setConfig, clearConfig, push, pull, ping, URL_RE, exportConfig, exportLink, parseLink, importConfig, maskUrl };
})();
