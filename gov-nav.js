/* ממשל אישי - ניווט משותף, עיצוב משותף ושער נעילה אופציונלי. דף חדש מוסיפים כאן פעם אחת. */
(function () {
    'use strict';
    const G = window.GOV;
    const PAGES = [
        { file: 'index.html', icon: '🏠', title: 'לוח בקרה', desc: 'היום, החודש והסוגיות שעל הפרק במקום אחד.' },
        { file: 'promises.html', icon: '📜', title: 'הבטחות', desc: 'הבטחות הממשלה לחודש, עדיפויות והתקדמות.', sections: [['promises-add', 'הבטחה חדשה'], ['promises-list', 'רשימת ההבטחות']] },
        { file: 'portfolios.html', icon: '🗂️', title: 'תיקי ממשלה', desc: 'תחומי החיים, השרים, הסוגיות והרעיונות.', sections: [['portfolios-grid', 'התיקים'], ['portfolio-detail', 'פירוט תיק']] },
        { file: 'cabinet.html', icon: '🏛️', title: 'קבינט', desc: 'החלטות מרכזיות, אפשרויות, השפעה על הבטחות ואמנות, ובדיקת תוצאה בדיעבד.', sections: [['cabinet-new', 'נושא חדש'], ['cabinet-list', 'כל ההחלטות'], ['cabinet-detail', 'דיון'], ['cabinet-insight', 'איכות החלטות']] },
        { file: 'treaties.html', icon: '🤝', title: 'יחסי חוץ', desc: 'אמנות והסכמים עם אנשים, קבוצות וגופים, ומחיר הפרה.', sections: [['treaties-overview', 'תמונת מצב'], ['treaties-form', 'אמנה חדשה'], ['treaties-list', 'לפי צד']] },
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
    document.write('<script src="gov-sync.js"><\/script>');    // סנכרון לענן: נטען סינכרונית בכל דף, כדי שכל שמירה תופעל אוטומטית

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
