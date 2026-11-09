/* ממשל אישי - כספת מפתחות.
   מה היא מגינה עליו: כתובת ה-Apps Script, מפתח הענן ומפתח Gemini.
   איך: הם נשמרים ב-localStorage רק מוצפנים (AES-GCM-256). מפתח ההצפנה נגזר מהסיסמה (PBKDF2-SHA256, 600,000 חזרות)
   ונשמר בזמן ההתחברות כ-CryptoKey שאי אפשר לייצא (non-extractable) ב-IndexedDB. אחרי נעילה (ידנית או 15 דקות חוסר פעילות) המפתח נמחק,
   ומי שפותח את הדפדפן רואה רק טקסט מוצפן.
   מגבלה כנה: כל עוד המערכת פתוחה ופתוחה בסיסמה, קוד הדף עצמו חייב לקרוא את המפתחות כדי לעבוד, ולכן מי שיושב מול דפדפן פתוח ומריץ קוד
   בקונסולה יכול לגרום לדף להשתמש בהם, ואפילו לקרוא אותם מהזיכרון. ההגנה היא נגד דפדפן נעול/סגור, גניבת קובץ האחסון והעתקת נתוני האתר. */
(function () {
    'use strict';
    const LS = 'gov_vault', DB = 'gov_vault_db', IDLE_MS = 15 * 60 * 1000, ITER = 600000;
    const enc = new TextEncoder(), dec = new TextDecoder();
    const b64 = u => btoa(String.fromCharCode.apply(null, Array.from(u))), unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
    let cache = {}, key = null, listeners = [];
    const supported = () => !!(window.crypto && crypto.subtle && window.indexedDB);

    function meta() { try { const v = JSON.parse(localStorage.getItem(LS)); return v && v.salt && v.check ? v : null; } catch (e) { return null; } }
    function saveMeta(m) { localStorage.setItem(LS, JSON.stringify(m)); }
    const idb = () => new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    async function idbGet() { try { const d = await idb(); return await new Promise(res => { const q = d.transaction('k').objectStore('k').get('session'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch (e) { return null; } }
    async function idbPut(v) { try { const d = await idb(); await new Promise(res => { const t = d.transaction('k', 'readwrite'); t.objectStore('k').put(v, 'session'); t.oncomplete = res; t.onerror = res; }); } catch (e) {} }
    async function idbDel() { try { const d = await idb(); await new Promise(res => { const t = d.transaction('k', 'readwrite'); t.objectStore('k').delete('session'); t.oncomplete = res; t.onerror = res; }); } catch (e) {} }
    async function derive(pw, salt) { const km = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
    async function seal(k, obj) { const iv = crypto.getRandomValues(new Uint8Array(12)), ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(obj))); return { iv: b64(iv), ct: b64(new Uint8Array(ct)) }; }
    async function open(k, box) { return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, k, unb64(box.ct)))); }
    const fire = () => { try { window.dispatchEvent(new Event('gov:vault')); } catch (e) {} };

    async function loadCache() {
        const m = meta(); cache = {}; if (!m || !key) return;
        for (const n of Object.keys(m.items || {})) { try { cache[n] = await open(key, m.items[n]); } catch (e) {} }
    }
    async function restore() {   // בטעינת דף: אם יש מפתח סשן שלא פג, פותחים את הכספת
        if (!supported() || !meta()) { fire(); return; }
        const s = await idbGet();
        if (s && s.key && Date.now() - s.at < IDLE_MS && sessionStorage.getItem('gov_unlocked') === '1') { key = s.key; await loadCache(); await idbPut({ key, at: Date.now() }); }
        else if (s) { await idbDel(); }
        fire();
    }
    async function unlock(pw) {   // יוצר כספת אם אין, אחרת מאמת את הסיסמה מול בלוק הבדיקה
        if (!supported()) return false; let m = meta();
        try {
            if (!m) { const salt = crypto.getRandomValues(new Uint8Array(16)), k = await derive(pw, salt); m = { v: 1, salt: b64(salt), check: await seal(k, 'ok'), items: {} }; saveMeta(m); key = k; }
            else { const k = await derive(pw, unb64(m.salt)); if ((await open(k, m.check)) !== 'ok') return false; key = k; }
        } catch (e) { return false; }
        await idbPut({ key, at: Date.now() }); await loadCache(); fire(); return true;
    }
    async function set(name, obj) {
        if (!key || !meta()) return { ok: false, error: 'locked' };
        const m = meta(); m.items = m.items || {}; m.items[name] = await seal(key, obj); saveMeta(m); cache[name] = obj; fire(); return { ok: true };
    }
    function remove(name) { const m = meta(); if (m && m.items) { delete m.items[name]; saveMeta(m); } delete cache[name]; fire(); }
    async function rekey(newPw) {   // החלפת סיסמה: מצפינים מחדש את כל הפריטים עם מפתח חדש ו-salt חדש
        if (!key) return false; const items = Object.assign({}, cache);
        try { const salt = crypto.getRandomValues(new Uint8Array(16)), k = await derive(newPw, salt), m = { v: 1, salt: b64(salt), check: await seal(k, 'ok'), items: {} };
            for (const n of Object.keys(items)) m.items[n] = await seal(k, items[n]); saveMeta(m); key = k; await idbPut({ key, at: Date.now() }); return true; } catch (e) { return false; }
    }
    async function lock() { key = null; cache = {}; await idbDel(); try { sessionStorage.removeItem('gov_unlocked'); } catch (e) {} }
    async function wipe() { await lock(); try { localStorage.removeItem(LS); } catch (e) {} fire(); }
    async function migrate() {   // גרסאות קודמות שמרו url/token/key בגלוי: מעבירים לכספת ומוחקים את הגלוי
        if (!key) return;
        try { const s = JSON.parse(localStorage.getItem('gov_sync') || 'null'); if (s && (s.url || s.token)) { await set('sync', { url: String(s.url || ''), token: String(s.token || '') }); delete s.url; delete s.token; localStorage.setItem('gov_sync', JSON.stringify(s)); } } catch (e) {}
        try { const a = JSON.parse(localStorage.getItem('gov_ai') || 'null'); if (a && a.key) { await set('ai', { key: String(a.key) }); localStorage.setItem('gov_ai', JSON.stringify({ model: a.model || '', savedAt: a.savedAt || '' })); } } catch (e) {}
    }
    // נעילה אוטומטית אחרי חוסר פעילות
    let last = Date.now();
    ['click', 'keydown', 'touchstart', 'mousemove'].forEach(ev => window.addEventListener(ev, () => { const n = Date.now(); if (n - last > 30000 && key) { last = n; idbPut({ key, at: n }); } }, { passive: true }));
    setInterval(async () => { if (key && Date.now() - last > IDLE_MS) { await lock(); location.reload(); } }, 30000);

    window.GOV_VAULT = {
        supported, exists: () => !!meta(), isOpen: () => !!key, get: n => cache[n] || null, has: n => !!(meta() && meta().items && meta().items[n]),
        set, remove, unlock, lock, wipe, migrate, rekey, IDLE_MS,
        ready: new Promise(res => { window.addEventListener('gov:vault', function f() { window.removeEventListener('gov:vault', f); res(); }); })
    };
    restore();
})();
