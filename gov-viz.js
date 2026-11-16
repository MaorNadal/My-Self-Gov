/* כלי גרפים קטנים כ-SVG (בלי ספריות חיצוניות, עובדים גם בלי רשת). v0.20. */
(function () {
    'use strict';
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const PAL = ['#f97316', '#38bdf8', '#84cc16', '#a78bfa', '#fbbf24', '#f472b6', '#2dd4bf', '#fb7185', '#94a3b8', '#facc15'];
    function donut(parts, o) {   // parts: [{l, v, c?}]
        o = o || {}; const size = o.size || 180, R = size * 0.34, W = size * 0.17, C = 2 * Math.PI * R, tot = parts.reduce((s, p) => s + Math.max(0, p.v), 0), cx = size / 2; let off = 0, segs = '';
        parts.forEach((p, i) => { if (p.v <= 0 || !tot) return; const len = p.v / tot * C, gap = len > 5 ? 2 : 0; segs += `<circle cx="${cx}" cy="${cx}" r="${R}" fill="none" stroke="${p.c || PAL[i % PAL.length]}" stroke-width="${W}" stroke-dasharray="${Math.max(0, len - gap).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cx})"><title>${esc(p.l)}: ${Math.round(p.v).toLocaleString('he-IL')}</title></circle>`; off += len; });
        return `<svg viewBox="0 0 ${size} ${size}" style="width:100%;max-width:${size}px;height:auto" role="img" aria-label="${esc(o.label || '')}"><circle cx="${cx}" cy="${cx}" r="${R}" fill="none" stroke="#1e293b" stroke-width="${W}"/>${segs}<text x="${cx}" y="${cx - 2}" text-anchor="middle" fill="#fff" font-size="${size * 0.1}" font-weight="800">${esc(o.center || '')}</text><text x="${cx}" y="${cx + size * 0.09}" text-anchor="middle" fill="#94a3b8" font-size="${size * 0.06}">${esc(o.sub || '')}</text></svg>`;
    }
    function gauge(pct, o) {
        o = o || {}; const size = o.size || 150, R = size * 0.38, C = 2 * Math.PI * R, p = Math.max(0, Math.min(100, pct == null ? 0 : pct)), col = o.color || (p >= 75 ? '#22c55e' : p >= 50 ? '#fbbf24' : '#f87171'), cx = size / 2;
        return `<svg viewBox="0 0 ${size} ${size}" style="width:100%;max-width:${size}px;height:auto" role="img" aria-label="${esc(o.label || '')} ${p}"><circle cx="${cx}" cy="${cx}" r="${R}" fill="none" stroke="#1e293b" stroke-width="${size * 0.1}"/>${pct == null ? '' : `<circle cx="${cx}" cy="${cx}" r="${R}" fill="none" stroke="${col}" stroke-width="${size * 0.1}" stroke-linecap="round" stroke-dasharray="${(p / 100 * C).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 ${cx} ${cx})" style="transition:stroke-dasharray .8s"/>`}<text x="${cx}" y="${cx + size * 0.04}" text-anchor="middle" fill="#fff" font-size="${size * 0.24}" font-weight="900">${pct == null ? '—' : Math.round(p)}</text><text x="${cx}" y="${cx + size * 0.2}" text-anchor="middle" fill="#94a3b8" font-size="${size * 0.085}">${esc(o.label || '')}</text></svg>`;
    }
    function line(series, o) {   // series: [{v:[...], c, l, dash?}] (null = חור). קו שמאלה->ימינה בציר X של הימים
        o = o || {}; const w = o.w || 320, h = o.h || 110, pad = 6, n = Math.max.apply(null, series.map(s => s.v.length)), vals = [].concat.apply([], series.map(s => s.v.filter(v => v != null))), mx = Math.max.apply(null, vals.concat([o.min0 ? 1 : 0, o.max || 0, 1])), mn = o.zero === false ? Math.min.apply(null, vals.concat([mx])) : 0;
        const X = i => pad + (n > 1 ? i / (n - 1) * (w - 2 * pad) : 0), Y = v => h - pad - (mx > mn ? (v - mn) / (mx - mn) * (h - 2 * pad) : 0);
        const paths = series.map(s => { let d = '', pen = false; s.v.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); pen = true; }); return `<path d="${d}" fill="none" stroke="${s.c}" stroke-width="2" ${s.dash ? 'stroke-dasharray="4 3"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`; }).join('');
        const grid = [0.25, 0.5, 0.75].map(f => `<line x1="${pad}" x2="${w - pad}" y1="${(h - pad - f * (h - 2 * pad)).toFixed(1)}" y2="${(h - pad - f * (h - 2 * pad)).toFixed(1)}" stroke="#1e293b"/>`).join('');
        let area = ''; if (o.area) { const s0 = series[0], pts = []; s0.v.forEach((v, i) => { if (v != null) pts.push([X(i), Y(v)]); }); if (pts.length > 1) { const id = 'ar' + Math.random().toString(36).slice(2, 7); area = `<defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s0.c}" stop-opacity=".35"/><stop offset="1" stop-color="${s0.c}" stop-opacity="0"/></linearGradient></defs><path d="M${pts[0][0].toFixed(1)} ${h - pad} ${pts.map(p => 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')} L${pts[pts.length - 1][0].toFixed(1)} ${h - pad} Z" fill="url(#${id})"/>`; } }
        const last = series[0] && series[0].v.map((v, i) => [v, i]).filter(x => x[0] != null).pop(), dot = o.dot && last ? `<circle cx="${X(last[1]).toFixed(1)}" cy="${Y(last[0]).toFixed(1)}" r="3.5" fill="${series[0].c}" stroke="#0f172a" stroke-width="1.5"/>` : '';
        return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block" dir="ltr" role="img" aria-label="${esc(o.label || '')}">${grid}${area}${paths}${dot}</svg>`;
    }
    function bars(rows, o) {   // rows: [{l, v, max?, c?, t?}]
        o = o || {}; const mx = o.max || Math.max.apply(null, rows.map(r => r.v).concat([1]));
        return rows.map((r, i) => `<div class="mb-1.5"><div class="flex justify-between text-[11px] text-slate-300"><span>${esc(r.l)}</span><span>${esc(r.t != null ? r.t : Math.round(r.v).toLocaleString('he-IL'))}</span></div><div style="height:8px;border-radius:6px;background:#1e293b;overflow:hidden"><div style="height:100%;width:${Math.max(0, Math.min(100, r.v / (r.max || mx) * 100)).toFixed(1)}%;background:${r.c || PAL[i % PAL.length]};border-radius:6px;transition:width .8s"></div></div></div>`).join('');
    }
    window.GOV_VIZ = { donut, gauge, line, bars, PAL, esc };
})();
