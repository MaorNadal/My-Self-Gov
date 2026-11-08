/* ממשל אישי - ניווט משותף, עיצוב משותף ושער נעילה אופציונלי. דף חדש מוסיפים כאן פעם אחת. */
(function () {
    'use strict';
    const G = window.GOV;
    const PAGES = [
        { file: 'index.html', icon: '🏠', title: 'לוח בקרה', desc: 'היום, החודש והסוגיות שעל הפרק במקום אחד.' },
        { file: 'schedule.html', icon: '🗓️', title: 'לוח זמן', desc: 'יומן זמן ממשלתי, ניצול זמן ופגישות.', sections: [['sch-today', 'היום'], ['sch-pie', 'חלוקת זמן'], ['sch-events', 'פגישות']] },
        { file: 'promises.html', icon: '📜', title: 'הבטחות', desc: 'הבטחות הממשלה לחודש, עדיפויות והתקדמות.', sections: [['promises-add', 'הבטחה חדשה'], ['promises-list', 'רשימת ההבטחות']] },
        { file: 'portfolios.html', icon: '🗂️', title: 'תיקי ממשלה', desc: 'תחומי החיים, השרים, הסוגיות והרעיונות.', sections: [['portfolios-grid', 'התיקים'], ['portfolio-detail', 'פירוט תיק']] },
        { file: 'issues.html', icon: '🔥', title: 'סוגיות', desc: 'סוגיות על הפרק, חומרה וקישור להבטחות ולמשימות.', sections: [['iss-list', 'הסוגיות'], ['iss-detail', 'פירוט']] },
        { file: 'cabinet.html', icon: '🏛️', title: 'קבינט', desc: 'החלטות מרכזיות, אפשרויות, השפעה על הבטחות ואמנות, ובדיקת תוצאה בדיעבד.', sections: [['cabinet-new', 'נושא חדש'], ['cabinet-list', 'כל ההחלטות'], ['cabinet-detail', 'דיון'], ['cabinet-insight', 'איכות החלטות']] },
        { file: 'treaties.html', icon: '🤝', title: 'יחסי חוץ', desc: 'אמנות והסכמים עם אנשים, קבוצות וגופים, ומחיר הפרה.', sections: [['treaties-overview', 'תמונת מצב'], ['treaties-form', 'אמנה חדשה'], ['treaties-list', 'לפי צד']] },
        { file: 'people.html', icon: '👥', title: 'יחסים', desc: 'אנשים, יומן יחסים, אינדקס קרבה ואמנות לכל אדם.', sections: [['people-overview', 'תמונת מצב'], ['people-list', 'אנשים'], ['people-detail', 'פירוט']] },
        { file: 'ministers.html', icon: '🎖️', title: 'שרים והיסטוריה', desc: 'שרים, דירוג, דפי שר והיסטוריית ממשלות.', sections: [['min-list', 'השרים'], ['min-history', 'היסטוריית ממשלות'], ['min-diff', 'קושי משרדים']] },
        { file: 'review.html', icon: '📊', title: 'ציון חודשי', desc: 'ציון הממשלה, הערכה עצמית והיסטוריית ממשלות.', sections: [['review-current', 'החודש'], ['review-history', 'היסטוריית ממשלות']] }
    ];
    window.GOV_SITE = { PAGES };
    const cur = location.pathname.split('/').pop() || 'index.html';
    const page = PAGES.find(p => p.file === cur);

    const links = PAGES.map(p => `<a href="${p.file}" class="px-3 py-1.5 rounded-lg ${p.file === cur ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-amber-600 text-slate-200'} transition">${p.icon} ${p.title}</a>`).join('');
    const lockBtn = G.lock.isSet() ? `<button type="button" onclick="GOV.lock.lockNow()" class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-400 text-slate-300 transition" title="נעל עכשיו">🔒</button>` : '';
    let html = `<nav class="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 shadow-xl">
        <div class="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3">
            <a href="index.html" class="flex items-center gap-3"><span class="text-3xl">🏛️</span><span><span class="font-black text-xl tracking-wider text-amber-400 block leading-none">ממשל אישי</span>
            <span class="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">${page ? page.icon + ' ' + page.title : ''}</span></span></a>
            <div class="flex flex-wrap items-center gap-2 text-xs md:text-sm font-semibold">${links}${lockBtn}</div>
        </div></nav>`;
    if (page && page.sections) html += `<div class="no-print max-w-6xl mx-auto px-4 pt-4 flex flex-wrap gap-2 text-xs font-semibold">${page.sections.map(s => `<a href="#${s[0]}" class="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-amber-600 text-slate-200 border border-slate-700 transition">${s[1]}</a>`).join('')}</div>`;

    const st = document.createElement('style');
    st.textContent = `section[id]{scroll-margin-top:5rem}
.g-card{background:#1e293b80;border:1px solid #334155;border-radius:18px;padding:16px}
.g-lab{display:block;color:#94a3b8;font-size:12px}
.g-inp{width:100%;margin-top:3px;background:#020617;border:1px solid #475569;border-radius:9px;padding:7px 9px;color:#fff;font-size:13px;font-family:inherit}
.g-inp:focus{outline:none;border-color:#fbbf24}
.g-btn{background:#1e293b;border:1px solid #475569;border-radius:9px;padding:6px 12px;color:#e2e8f0;cursor:pointer;font-size:12px;font-weight:700}
.g-btn:hover{border-color:#fbbf24}.g-btn:disabled{opacity:.5;cursor:not-allowed}
.g-btn.pri{background:#b45309;border-color:#fbbf24;color:#fff}.g-btn.ok{background:#047857;border-color:#34d399;color:#fff}.g-btn.red{background:#7f1d1d;border-color:#f87171;color:#fff}
.g-bar{height:8px;border-radius:999px;background:#0f172a;overflow:hidden}.g-bar>i{display:block;height:100%;border-radius:999px}
.g-chip{display:inline-block;font-size:10px;font-weight:800;padding:1px 9px;border-radius:999px;border:1px solid}
@media print{nav,.no-print,button{display:none!important}body{background:#fff!important;color:#000!important}}`;
    document.head.appendChild(st);
    document.currentScript.insertAdjacentHTML('beforebegin', html);
    document.write('<script src="gov-sync.js"><\/script>');
    document.write('<script src="gov-ai.js"><\/script>');    // שכבת AI משותפת (מפתח Gemini של המשתמש)    // סנכרון לענן: נטען סינכרונית בכל דף, כדי שכל שמירה תופעל אוטומטית


    // מכשיר חדש: אם קיים gov-config.enc.json ואין עדיין הגדרות, מבקשים סיסמה, מפענחים, מתחברים לענן ונועלים באותה סיסמה.
    (async function newDeviceSetup() {
        try {
            if (G.lock.isSet() || !window.crypto || !crypto.subtle) return;
            try { if (JSON.parse(localStorage.getItem('gov_sync') || '{}').url) return; } catch (e) {}
            const r = await fetch('gov-config.enc.json', { cache: 'no-store' }); if (!r.ok) return; const obj = await r.json(); if (!obj || !obj.ct) return;
            document.body.insertAdjacentHTML('afterbegin', `<div id="govSetup" style="position:fixed;inset:0;z-index:1001;background:#020617;display:flex;align-items:center;justify-content:center;padding:16px"><form id="govSetupForm" style="width:100%;max-width:340px;text-align:center"><div style="font-size:48px">🏛️</div><div style="font-weight:900;font-size:20px;color:#fbbf24;margin-bottom:6px">חיבור מכשיר חדש</div><div style="font-size:12px;color:#94a3b8;margin-bottom:12px">הזן את סיסמת הממשלה. המערכת תתחבר לענן ותמשוך את הנתונים באופן אוטומטי.</div><input id="govSetupPw" type="password" autocomplete="current-password" placeholder="סיסמה" class="g-inp" style="text-align:center;font-size:16px"><button class="g-btn pri" style="width:100%;margin-top:10px;padding:9px">התחבר</button><button type="button" id="govSetupSkip" class="g-btn" style="width:100%;margin-top:6px">דלג (התחל בלי ענן)</button><div id="govSetupMsg" style="color:#f87171;font-size:12px;margin-top:8px;min-height:1rem"></div></form></div>`);
            const msg = t => { document.getElementById('govSetupMsg').textContent = t; };
            document.getElementById('govSetupSkip').onclick = () => document.getElementById('govSetup').remove();
            document.getElementById('govSetupForm').addEventListener('submit', async ev => {
                ev.preventDefault(); const pw = document.getElementById('govSetupPw').value; msg('מתחבר…');
                const S = window.GOV_SYNC; if (!S) { msg('מודול הסנכרון לא נטען.'); return; }
                const ok = await S.importConfig(pw, obj); if (!ok.ok) { msg(ok.error); return; }
                const pl = await S.pull(); if (pl.state !== 'ok' && pl.state !== 'idle') { msg('החיבור נשמר, אך המשיכה נכשלה: ' + (pl.msg || '')); }
                await G.lock.set(pw); location.reload();
            });
        } catch (e) {}
    })();

    if (!G.lock.unlocked()) {
        document.body.insertAdjacentHTML('afterbegin', `<div id="govGate" style="position:fixed;inset:0;z-index:1000;background:#020617;display:flex;align-items:center;justify-content:center;padding:16px">
            <form id="govGateForm" style="width:100%;max-width:320px;text-align:center"><div style="font-size:48px">🏛️</div><div style="font-weight:900;font-size:22px;color:#fbbf24;margin-bottom:14px">ממשל אישי</div>
            <input id="govPin" type="password" autocomplete="current-password" placeholder="קוד גישה" class="g-inp" style="text-align:center;font-size:16px">
            <button class="g-btn pri" style="width:100%;margin-top:10px;padding:9px">כניסה</button><div id="govGateMsg" style="color:#f87171;font-size:12px;margin-top:8px;min-height:1rem"></div></form></div>`);
        const f = document.getElementById('govGateForm'); document.getElementById('govPin').focus();
        f.addEventListener('submit', async ev => {
            ev.preventDefault();
            if (await G.lock.check(document.getElementById('govPin').value)) document.getElementById('govGate').remove();
            else { document.getElementById('govGateMsg').textContent = 'קוד שגוי.'; document.getElementById('govPin').value = ''; }
        });
    }
})();
