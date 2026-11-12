// TechRemap - the screen. State lives in `S`; every change ends in render().

import * as Dev from './device.js?v=2';
import * as M from './model.js?v=2';
import { DEVICES, DEVICE_ORDER, PANEL_W, keyName } from './pads.js?v=2';
import { t, tKey, setLang, lang } from './i18n.js?v=2';

const CLASSIC_URL = 'https://www.remapper.org/config/';   // HID Remapper's own tool
const BOARD_NAMES = { 1: 'Waveshare RP2040-Zero', 2: 'Waveshare RP2350-USB-A' };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const S = {
    cfg: null, ext: null, connected: false, demo: false, dirty: false, deviceName: '',
    tab: 'remap', shown: -1, selected: null,
    listen: null,        // { id, layer }: waiting for a press for this control
    listenSwitch: null,  // { type, from, to }: waiting for a press for a layer switch
    pending: null,       // input pressed first, waiting for a click on a control
    last: null,          // { text, undo }: last change, for "Ongedaan maken"
    active: new Map(),   // inputs currently pressed -> time last seen
    rest: {},            // resting value of analog inputs
};
const device = () => DEVICES[S.cfg.our_descriptor_number] || DEVICES[0];
const layerNo = l => l + 1;

// ── names ────────────────────────────────────────────────────────────────────
function sourceName(u, asStick = false) {
    const n = parseInt(u, 16), page = n >>> 16, low = n & 0xffff;
    if (page === 0xfff4) return (S.ext && S.ext.pinNames[low]) || `GPIO ${low}`;
    if (page === 0x0009) return t('Knop {n}', { n: low });
    if (page === 0xfff9) return 'D-pad ' + ({ 1: '←', 2: '→', 3: '↑', 4: '↓' }[low] || low);
    if (page === 0x0007) return tKey(keyName(u) || `Toets ${low}`);
    if (page === 0x0001) {
        const axes = { 0x30: ['Linker stick', '↔'], 0x31: ['Linker stick', '↕'], 0x32: ['Rechter stick', '↔'], 0x35: ['Rechter stick', '↕'],
                       0x33: ['Derde stick', '↔'], 0x34: ['Derde stick', '↕'], 0x36: ['Schuif', ''], 0x38: ['Scrollwiel', ''] };
        if (axes[low]) return asStick ? t(axes[low][0]) : (t(axes[low][0]) + ' ' + axes[low][1]).trim();
    }
    if (page === 0x0002 && low === 0xc4) return t('Gaspedaal');
    if (page === 0x0002 && low === 0xc5) return t('Rempedaal');
    if (page === 0xfff3) return t('Expressie {n}', { n: low });
    return u;
}
function targetName(u) {
    const c = Object.values(device().controls).find(x => (x.targets || []).some(t => t.u === u) || (x.axes || []).includes(u));
    if (c) return tKey(c.name);
    const n = parseInt(u, 16);
    if ((n >>> 16) === 0xfff1) return t('laag {n} (zolang ingedrukt)', { n: layerNo(n & 0xffff) });
    if ((n >>> 16) === 0xfffc) return t('ga naar laag {n}', { n: layerNo(n & 0xffff) });
    return t('een andere functie');
}
const REASONS = {
    'stick-needs-stick': 'Hier hoort een joystick bij. Beweeg een joystick, of gebruik de richtingen ← → ↑ ↓ voor losse knoppen.',
    'needs-button': 'Hier hoort een knop of jack bij, geen joystick.',
    'no-slot': 'Er is geen ruimte meer voor nog een joystick-koppeling. Verwijder eerst een andere, of een expressie in de originele HID Remapper-tool.',
};
const stickLike = c => c.kind === 'stick' || c.kind === 'expr';

// ── changing the config ──────────────────────────────────────────────────────
function change(text, fn) {
    const before = JSON.stringify(S.cfg.mappings);
    fn();
    S.dirty = true;
    S.last = text ? { text, undo: before } : null;
}
function undo() {
    if (!S.last) return;
    S.cfg.mappings = JSON.parse(S.last.undo);
    S.last = null;
}
function doAssign(id, layer, source, add = false) {
    const control = device().controls[id];
    const reason = M.rejects(control, source, S.cfg);
    if (reason) { toast(t(REASONS[reason]), true); return false; }
    const label = sourceName(source, stickLike(control));
    change(t(add ? '{source} bedient nu ook {control} op laag {n}.' : '{source} bedient nu {control} op laag {n}.', { source: label, control: tKey(control.name), n: layerNo(layer) }),
        () => M.assign(S.cfg, control, layer, source, add));
    const also = M.alsoDrives(S.cfg, control, source, layer).filter(m => (parseInt(m.target_usage, 16) >>> 16) < 0xfff0);
    if (also.length) S.last.text += t(' Let op: op deze laag bedient {source} ook {others}.', { source: label, others: [...new Set(also.map(m => targetName(m.target_usage)))].join(t(' en ')) });
    S.selected = id;
    return true;
}

// ── hardware input (from the device's monitor, or simulated) ─────────────────
function onInput(usage, value) {
    const now = Date.now();
    let fired = false;
    if (M.isAnalog(usage)) {
        if (!(usage in S.rest)) { S.rest[usage] = value; return; }
        const big = Math.abs(S.rest[usage]) > 1023 || Math.abs(value) > 1023;
        const moved = Math.abs(value - S.rest[usage]) >= (big ? 8000 : 40);
        fired = moved && !S.active.has(usage);
        moved ? S.active.set(usage, now) : S.active.delete(usage);
    } else {
        const seen = S.active.get(usage);
        fired = value !== 0 && (seen === undefined || now - seen > 700);
        value !== 0 ? S.active.set(usage, now) : S.active.delete(usage);
    }
    if (fired) captured(usage);
    schedulePressed();
}
function captured(usage) {
    if (S.listenSwitch) {
        const { type, from, to } = S.listenSwitch;
        S.listenSwitch = null;
        const msg = type === 'goto' ? '{source} gaat naar laag {to} (op laag {from}).' : '{source} activeert laag {to} zolang ingedrukt (op laag {from}).';
        change(t(msg, { source: sourceName(usage), to: layerNo(to), from: layerNo(from) }), () => M.addSwitch(S.cfg, type, from, to, usage));
    } else if (S.listen) {
        const { id, layer, add } = S.listen;
        if (doAssign(id, layer, usage, add)) S.listen = null;
    } else if (S.tab === 'remap') {
        S.pending = usage;
        S.last = null;
    } else return;
    render();
}
let pressedFrame = 0;
function schedulePressed() {
    if (pressedFrame) return;
    pressedFrame = requestAnimationFrame(() => { pressedFrame = 0; paintPressed(); });
}
setInterval(() => {          // inputs that stopped reporting are no longer pressed
    const cutoff = Date.now() - 1500;
    let changed = false;
    for (const [u, t] of S.active) if (t < cutoff && !M.isAnalog(u)) { S.active.delete(u); changed = true; }
    if (changed) schedulePressed();
}, 500);

// Which controls does an input drive (on any layer)?
function drivenBy(usages) {
    const ids = new Set();
    if (!usages.size) return ids;
    const ctl = device().controls;
    for (const id in ctl) {
        if (M.chips(S.cfg, ctl[id]).some(c => usages.has(c.source) || (stickLike(ctl[id]) && (M.stickPair(c.source) || []).some(a => usages.has(a))))) ids.add(id);
    }
    return ids;
}
function paintPressed() {
    if (!S.cfg || S.tab !== 'remap') { paintPins(); return; }
    const ids = drivenBy(new Set(S.active.keys()));
    const stands = S.scene ? S.scene.stands : {};
    document.querySelectorAll('#page-remap [data-id]').forEach(el => {
        const id = el.dataset.id;
        el.classList.toggle('pressed', ids.has(id) || (el.classList.contains('pad-hit') && (stands[id] || []).some(x => ids.has(x))));
    });
}
function paintPins() {
    document.querySelectorAll('.pin[data-pin]').forEach(el =>
        el.classList.toggle('active', S.active.has(M.hex(0xfff40000 | Number(el.dataset.pin)))));
}

// ── rendering: Knoppen ───────────────────────────────────────────────────────
const chip = (l, t, cls = '') => `<span class="chip ${cls}" data-l="${l}"><span class="dot d${l + 1}"></span><span class="t">${esc(t)}</span></span>`;
function chipsHTML(control) {
    const cs = M.chips(S.cfg, control);
    return cs.length ? cs.map(c => chip(c.layer, sourceName(c.source, stickLike(control)))).join('') : `<span class="muted">${esc(t('Niet toegewezen'))}</span>`;
}

function renderRemap() {
    const dev = device(), ctl = dev.controls, scene = dev.scene();
    S.scene = scene;
    if (!ctl[S.selected]) S.selected = Object.keys(ctl)[0];
    $('device-pill').innerHTML = `<label for="devtype">${esc(t('De pc ziet:'))}</label> ${devtypeSelect('devtype', S.cfg.our_descriptor_number)}`;
    $('device-wipe').innerHTML = wipeHTML();
    $('device-hint').hidden = !S.devChanged;

    const row = id => `<button type="button" class="row" data-id="${id}"><span class="glyph">${esc(ctl[id].g)}</span><span class="chips">${chipsHTML(ctl[id])}</span></button>`;
    let marks = '';
    for (const id in scene.markAt) {
        const layers = [...new Set((scene.stands[id] || [id]).flatMap(x => M.chips(S.cfg, ctl[x]).map(c => c.layer)))].sort();
        layers.forEach((l, i) => { marks += `<circle class="mark m${l + 1}" data-l="${l}" cx="${scene.markAt[id][0] + i * 9}" cy="${scene.markAt[id][1]}" r="5"/>`; });
    }
    const panels = scene.panels.map(p => `<foreignObject x="${p.x}" y="${p.y}" width="${PANEL_W}" height="${p.h}">` +
        `<div xmlns="http://www.w3.org/1999/xhtml" class="panel"><h2>${esc(t(p.title))}</h2>${p.ids.map(row).join('')}</div></foreignObject>`).join('');
    const stage = $('stage');
    stage.setAttribute('viewBox', `0 44 1180 ${scene.bottom + 14 - 44}`);
    stage.innerHTML = scene.drawing + scene.leaders + marks + panels;

    const notes = $('notes');
    notes.hidden = !dev.notes;
    if (dev.notes) notes.innerHTML = `<summary>${esc(t(dev.notes.title))}</summary><ul>${dev.notes.items.map(n => `<li>${esc(t(n))}</li>`).join('')}</ul>`;

    $('hub-note').innerHTML = `<summary>${esc(t('Samen spelen: meerdere apparaten tegelijk'))}</summary><ul>` +
        ['Met een USB-hub tussen het bordje en je apparaten sluit je er meerdere tegelijk aan, bijvoorbeeld een controller, losse knoppen, een muis en een toetsenbord.',
         'Alles komt samen in één apparaat voor de pc of console. Zo kan iemand meespelen als copiloot: de een gebruikt de controller, de ander een paar knoppen.',
         'Twee mensen dezelfde knop geven? Wijs de eerste toe, klik daarna op “Nog een” en druk op de tweede.',
         'Het bordje meldt zich altijd als één apparaat; twee aparte controllers als uitvoer kan niet.',
         'Dit staat zo in de handleiding van HID Remapper. Wij hebben het met een hub zelf nog niet getest.'].map(n => `<li>${esc(t(n))}</li>`).join('') + '</ul>';

    $('kbd-card').hidden = !dev.keyboard;
    $('kbd').innerHTML = !dev.keyboard ? '' : dev.keyboard.map(r => '<div class="kbd-row">' + r.map(k =>
        `<button type="button" class="kkey" data-id="${k.id}" style="flex-grow:${k.w}" aria-label="${esc(tKey(k.name))}">${esc(t(k.g))}` +
        `<span class="kd">${M.chips(S.cfg, ctl[k.id]).map(c => `<span class="dot d${c.layer + 1} mark" data-l="${c.layer}"></span>`).join('')}</span></button>`).join('') + '</div>').join('');

    renderDetail(ctl[S.selected]);
    renderSwitches();

    const banner = $('banner');
    banner.className = 'banner';
    banner.hidden = false;
    const cancel = `<button type="button" data-cancel>${esc(t('Annuleer'))}</button>`;
    if (S.listenSwitch) banner.innerHTML = `<span>${esc(t('Druk nu op de knop of jack die de laag moet wisselen.'))}</span>${cancel}`;
    else if (S.pending) banner.innerHTML = `<span>${esc(t('{source} ingedrukt. Klik op wat hij moet bedienen op laag {n}.', { source: sourceName(S.pending, true), n: layerNo(Math.max(S.shown, 0)) }))}</span>${cancel}`;
    else if (S.last) banner.innerHTML = `<span>${esc(S.last.text)}</span><button type="button" data-undo>${esc(t('Ongedaan maken'))}</button>`;
    else banner.hidden = true;

    const live = S.pending ? drivenBy(new Set([S.pending, ...(M.stickPair(S.pending) || [])])) : new Set();
    document.querySelectorAll('#page-remap [data-id]').forEach(el => {
        const id = el.dataset.id, group = el.classList.contains('pad-hit') ? (scene.stands[id] || [id]) : [id];
        el.classList.toggle('sel', group.includes(S.selected));
        el.classList.toggle('live', group.some(x => live.has(x)));
    });
    document.querySelectorAll('#page-remap .chip[data-l], #page-remap .mark').forEach(el =>
        el.classList.toggle('dim', S.shown >= 0 && Number(el.dataset.l) !== S.shown));
    document.querySelectorAll('#layers button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.layer) === S.shown)));
    paintPressed();
}

function renderDetail(control) {
    const asStick = stickLike(control);
    $('detail-title').textContent = tKey(control.name);
    $('detail-sub').textContent = t(asStick ? 'Klik op “Wijzig” en beweeg daarna de joystick die dit moet bedienen.' : 'Klik op “Wijzig” en druk daarna op je knop of jack.');
    const btn = (attr, label, cls = '') => `<button type="button"${cls ? ` class="${cls}"` : ''} ${attr}>${esc(t(label))}</button>`;
    let html = '';
    for (let l = 0; l < M.NLAYERS; l++) {
        const st = M.layerState(S.cfg, control, l);
        const on = S.listen && S.listen.id === S.selected && S.listen.layer === l;
        const names = (st.sources || []).map(s => sourceName(s, asStick)).join(t(' en '));
        // each input can be taken away on its own when there is more than one
        const several = st.state === 'set' && st.sources.length > 1 && !on;
        const text = st.state === 'set' ? names
            : st.state === 'same' ? t('Zelfde als laag 1 ({names})', { names })
            : st.state === 'moved' ? t('Niets. {source} doet hier: {what}.', { source: sourceName(st.source, asStick), what: targetName(st.to) })
            : st.state === 'off' ? t('Niets op deze laag') : t('Niet toegewezen');
        const acts = [];
        if (on) acts.push(btn('data-cancel', 'Annuleer', 'go'));
        else {
            acts.push(btn(`data-listen="${l}"`, 'Wijzig'));
            if (st.state === 'set') acts.push(btn(`data-add="${l}"`, 'Nog een'));
            if (l === 0 && st.state === 'set') acts.push(btn(`data-clear="${l}"`, 'Wis'));
            if (l > 0 && ['set', 'off', 'moved'].includes(st.state) && M.layerState(S.cfg, control, 0).state === 'set') acts.push(btn(`data-inherit="${l}"`, 'Zelfde als laag 1'));
            if (l > 0 && ['set', 'same'].includes(st.state)) acts.push(btn(`data-clear="${l}"`, 'Niets'));
        }
        html += `<div class="detail-row${on ? ' listening' : ''}"><span class="lname"><span class="dot d${l + 1}"></span>${esc(t('Laag {n}', { n: layerNo(l) }))}</span>` +
            `<span class="val${st.state === 'set' || on ? '' : ' same'}">${several
                ? st.sources.map(s => `<span class="src">${esc(sourceName(s, asStick))}<button type="button" data-remove="${l}|${s}" aria-label="${esc(t('Verwijder {source}', { source: sourceName(s, asStick) }))}">✕</button></span>`).join('')
                : esc(on ? t(asStick ? 'Beweeg nu de joystick…' : 'Druk nu op je knop of jack…') : text)}</span>` +
            `<span class="acts">${acts.join('')}</span></div>`;
    }
    const slider = (id, label, min, max, value, shown) => `<div class="detail-row"><span class="lname">${esc(t(label))}</span>` +
        `<span class="val"><input type="range" id="${id}" min="${min}" max="${max}" value="${value}" aria-label="${esc(t(label))}"></span><span class="acts" id="${id}-val">${shown}</span></div>`;
    if (control.range) { const v = M.speed(S.cfg, control) ?? control.speed; html += slider('speed', 'Snelheid', control.range[0], control.range[1], v, scalingText(v)); }
    if (control.kind === 'expr') { const v = Math.round((M.deadzone(S.cfg, control) ?? control.dz) / 1280); html += slider('deadzone', 'Dode zone', 0, 40, v, v + '%'); }
    $('detail-rows').innerHTML = html;
}

// The same number HID Remapper's own tool calls "scaling" (1 = normal speed).
const scalingText = v => (v / 1000).toLocaleString(lang, { maximumFractionDigits: 3 }) + '×';

function renderSwitches() {
    const sw = M.switches(S.cfg);
    const text = s => t({ goto: 'Ga naar laag {n}', hold: '⇧ Laag {n} zolang ingedrukt', toggle: 'Laag {n} aan/uit' }[s.type], { n: layerNo(s.to) });
    $('switches').innerHTML = sw.length ? sw.map((s, i) =>
        `<div class="row" style="cursor:default"><span class="chips"><span class="chip key"><span class="t">${esc(text(s))}</span></span>` +
        s.from.map(l => chip(l, sourceName(s.source))).join('') + `</span><button type="button" class="xbtn" data-unswitch="${i}">${esc(t('Verwijder'))}</button></div>`).join('')
        : `<span class="muted" style="padding:4px 6px">${esc(t('Nog geen laagknoppen.'))}</span>`;
    const stranded = M.strandedLayers(S.cfg);
    $('switch-warn').hidden = !stranded.length;
    $('switch-warn').innerHTML = stranded.map(l => `<span><b>${esc(t('Let op.'))}</b> ${esc(t('Vanuit laag {n} kun je niet terug naar laag 1. Opnieuw insteken brengt je altijd terug.', { n: layerNo(l) }))}</span>`).join('');
    const canGoto = S.demo || !!S.ext;
    const type = $('sw-type'), keep = type.value;
    type.innerHTML = (canGoto ? `<option value="goto">${esc(t('ga naar'))}</option>` : '') + `<option value="hold">${esc(t('zolang ingedrukt naar'))}</option>`;
    if ([...type.options].some(o => o.value === keep)) type.value = keep;
    $('sw-add').textContent = t(S.listenSwitch ? 'Annuleer' : 'Kies knop of jack');
    for (const id of ['sw-from', 'sw-to']) [...$(id).options].forEach(o => { o.textContent = t('laag {n}', { n: Number(o.value) + 1 }); });
}

// ── rendering: other tabs ────────────────────────────────────────────────────
const needsExt = what => `<h3>${esc(t(what))}</h3><p class="sub">${esc(t('Dit bordje draait de officiële HID Remapper-firmware. Daarmee kun je knoppen en lagen instellen, maar dit onderdeel zit alleen in de TechRemap-firmware.'))}</p>`;

function applyLayerColors() {
    const colors = S.ext ? S.ext.led.colors : ['#5b8def', '#4ade80', '#f87171', '#fbbf24'];
    const dark = (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')) === 'dark';
    colors.forEach((c, i) => {
        // on a light page, pure LED colours wash out; darken them a little there
        const n = parseInt(c.slice(1), 16), f = dark ? 1 : 0.72;
        const rgb = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * f));
        document.documentElement.style.setProperty(`--l${i + 1}`, `rgb(${rgb.join(',')})`);
    });
}
function renderLed() {
    const card = $('led-card');
    if (!S.ext) { card.innerHTML = needsExt('Lampjes'); return; }
    const led = S.ext.led;
    card.innerHTML = `<h3>${esc(t('Lampjes'))}</h3><p class="sub">${esc(t('De lamp op het bordje toont in welke laag je zit. Wijzigingen zie je meteen; ze blijven pas bewaard na “Opslaan op bordje”.'))}</p>` +
        led.colors.map((c, i) => `<div class="field"><label for="col${i}">${esc(t('Kleur laag {n}', { n: i + 1 }))}</label><input type="color" id="col${i}" data-color="${i}" value="${c}"></div>`).join('') +
        `<div class="field"><label for="bright">${esc(t('Helderheid'))}</label><div class="inline"><input type="range" id="bright" min="0" max="255" value="${led.brightness}"><span id="bright-val">${Math.round(led.brightness / 2.55)}%</span></div></div>`;
}
function stripCurrent() {
    const led = S.ext.led;
    return Math.round(led.stripCount * 60 * led.brightness / 255);
}
function renderBoard() {
    const card = $('board-card'), strip = $('strip-card');
    if (!S.ext) { card.innerHTML = needsExt('Bord inrichten'); strip.hidden = true; return; }
    strip.hidden = false;
    const e = S.ext, led = e.led;
    const T = x => esc(t(x));
    card.innerHTML = `<h3>${T('Jacks en pinnen')}</h3><p class="sub">${T('Geef elke pin waar je een jack of schakelaar aan hebt gesoldeerd een naam. Die naam zie je daarna overal in plaats van het pinnummer. Druk op een schakelaar om te zien welke pin het is.')} ${T('Een schakelaar of jack sluit je aan tussen de pin en GND; meerdere schakelaars mogen dezelfde GND delen.')}</p>` +
        `<div class="pins">` + e.boardPins.map(p => {
            const taken = p === e.activeStripPin || p === led.stripPin;
            return `<div class="pin${taken ? ' taken' : ''}" data-pin="${p}"><span class="lamp"></span><span class="n">GPIO ${p}</span>` +
                `<input type="text" data-pinname="${p}" maxlength="16" placeholder="${T(taken ? 'LED-strip' : 'bijv. Input Jack 1')}" value="${esc(e.pinNames[p] || '')}" aria-label="${esc(t('Naam voor GPIO {n}', { n: p }))}"></div>`;
        }).join('') + `</div>`;
    const mA = stripCurrent();
    strip.innerHTML = `<h3>${T('LED-strip of -ring')}</h3><p class="sub">${T('Een WS2812-strip of -ring die de laagkleur toont. Sluit de datalijn aan op de gekozen pin.')}</p>` +
        (e.maxStripLeds ? `
        <div class="field"><label for="strip-pin">${T('Pin')}</label><select id="strip-pin"><option value="">${T('Geen strip')}</option>${e.boardPins.map(p => `<option value="${p}"${p === led.stripPin ? ' selected' : ''}>GPIO ${p}${e.pinNames[p] ? ' · ' + esc(e.pinNames[p]) : ''}</option>`).join('')}</select>
            <span class="hint">${T('Een andere pin werkt pas nadat je hebt opgeslagen en het bordje opnieuw hebt ingestoken.')}${e.activeStripPin !== led.stripPin ? ` <b>${T('Nog niet actief.')}</b>` : ''}</span></div>
        <div class="field"><label for="strip-count">${T('Aantal LEDs')}</label><input type="number" id="strip-count" min="0" max="${e.maxStripLeds}" value="${led.stripCount}"></div>
        <div class="field"><label for="strip-order">${T('Kleurvolgorde')}</label><select id="strip-order"><option value="0"${led.stripOrder === 0 ? ' selected' : ''}>${T('GRB (meeste strips)')}</option><option value="1"${led.stripOrder === 1 ? ' selected' : ''}>RGB</option></select>
            <span class="hint">${T('Kloppen de kleuren niet (rood en groen verwisseld)? Kies dan de andere volgorde.')}</span></div>
        ${mA > 400 ? `<div class="warn"><span><b>${T('Let op.')}</b> ${esc(t('{count} LEDs op deze helderheid kunnen tot ongeveer {mA} mA trekken. Dat is meer dan een USB-poort veilig levert; verlaag de helderheid of voed de strip apart.', { count: led.stripCount, mA }))}</span></div>` : ''}`
        : `<p class="sub">${T('Deze firmware kan geen strip aansturen.')}</p>`);
    paintPins();
}
// Firmware offered for download (files live next to the app on the site).
const FIRMWARE = [
    { file: 'firmware/techremap_rp2040_zero.uf2', name: 'Waveshare RP2040-Zero', note: 'USB-poort zelf aansluiten: D+ op GP0, D- op GP1, 5V en GND.' },
    { file: 'firmware/techremap_rp2350_usb_a.uf2', name: 'Waveshare RP2350-USB-A', note: 'Voor betrouwbare herkenning: weerstand R13 verwijderen.' },
    { file: 'firmware/techremap_pico.uf2', name: 'Raspberry Pi Pico (RP2040)', note: 'USB-poort zelf aansluiten: D+ op GPIO0, D- op GPIO1, VBUS en GND.' },
];
function firmwareHTML() {
    const T = x => esc(t(x));
    return `<div class="fw-list">${FIRMWARE.map(f => `<div class="fw"><div><b>${esc(f.name)}</b><span>${T(f.note)}</span></div>` +
        `<a class="btn" href="${f.file}" download>${T('Download')}</a></div>`).join('')}</div>
        <ol class="fw-steps"><li>${T('Houd de BOOT-knop op het bordje ingedrukt en steek het in je computer.')}</li>
        <li>${T('Er verschijnt een USB-schijf (RPI-RP2 of RP2350). Sleep het gedownloade bestand erop.')}</li>
        <li>${T('Het bordje start vanzelf opnieuw. Klik daarna op “Verbind bordje”.')}</li></ol>
        <p class="hint">${T('Andere borden en de originele firmware vind je bij')} <a href="https://github.com/jfedor2/hid-remapper/releases/latest" target="_blank" rel="noopener">HID Remapper</a>.</p>`;
}
const devtypeSelect = (id, cur) => `<select id="${id}" aria-label="${esc(t('De pc ziet het bordje als'))}">` +
    DEVICE_ORDER.map(n => `<option value="${n}"${n === cur ? ' selected' : ''}>${esc(t(DEVICES[n].label))}</option>`).join('') + '</select>';
const wipeHTML = () => S.offerWipe ? `<div class="warn"><span><b>${esc(t('Let op.'))}</b> ${esc(t('De toewijzingen die je al had zijn voor het vorige apparaat gemaakt en betekenen hier iets anders.'))} <button type="button" class="btn" id="wipe">${esc(t('Begin met een lege indeling'))}</button> <button type="button" class="btn" id="keep">${esc(t('Behoud ze toch'))}</button></span></div>` : '';

function renderSettings() {
    const c = S.cfg, pass = c.unmapped_passthrough_layers.length > 0, T = x => esc(t(x));
    const fw = S.demo ? t('Demo, geen bordje verbonden')
        : S.ext ? (BOARD_NAMES[S.ext.board] ? t('TechRemap-firmware op {board}', { board: BOARD_NAMES[S.ext.board] }) : t('TechRemap-firmware')) : t('Officiële HID Remapper-firmware');
    $('settings-card').innerHTML = `<h3>${T('Instellingen')}</h3>
        <div class="field"><label for="pass">${T('Niet-toegewezen knoppen')}</label><div class="inline"><input type="checkbox" id="pass"${pass ? ' checked' : ''}><label for="pass">${T('gewoon doorgeven aan de pc')}</label></div>
            <span class="hint">${T('Handig als je een gewone controller insteekt en maar een paar knoppen wilt veranderen.')}</span></div>
        <div class="field"><label for="lang">${T('Taal')}</label><select id="lang"><option value="nl"${lang === 'nl' ? ' selected' : ''}>Nederlands</option><option value="en"${lang === 'en' ? ' selected' : ''}>English</option></select></div>
        <div class="field"><span class="flabel">${T('Reservekopie')}</span><div class="inline"><button type="button" class="btn" id="export">${T('Bewaar als bestand')}</button><button type="button" class="btn" id="import">${T('Laad uit bestand')}</button><input type="file" id="import-file" accept=".json,application/json" hidden></div></div>
        <div class="field"><span class="flabel">${T('Voor gevorderden')}</span><div class="inline"><a class="btn" href="${CLASSIC_URL}" target="_blank" rel="noopener">${T('Open de originele HID Remapper-tool')}</a></div>
            <span class="hint">${T('Macro’s, expressies en quirks stel je voorlopig daar in. Wat je hier instelt blijft daar zichtbaar, en andersom.')}</span></div>
        <div class="field"><span class="flabel">${T('Firmware')}</span><span>${esc(fw)}</span></div>
        <details class="field-details"${S.flashAsk ? ' open' : ''}><summary>${T('Firmware downloaden of bijwerken')}</summary>
            ${S.connected ? `<div class="flash">${S.flashAsk
                ? `<p>${T(S.dirty ? 'Je hebt wijzigingen die nog niet zijn opgeslagen. Die gaan verloren.' : 'Het bordje stopt even met werken en verschijnt als USB-schijf.')}</p>
                   <button type="button" class="btn primary" id="flash-go">${T('Ja, start de firmware-update')}</button> <button type="button" class="btn" id="flash-no">${T('Annuleer')}</button>`
                : `<button type="button" class="btn" id="flash">${T('Zet het bordje klaar voor een firmware-update')}</button>
                   <span class="hint">${T('Het bordje start opnieuw als USB-schijf, zonder dat je de BOOT-knop hoeft in te drukken. Sleep daarna het juiste bestand hieronder erop.')}</span>`}</div>` : ''}
            ${firmwareHTML()}</details>`;
}

function render() {
    const has = !!S.cfg;
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
    document.querySelectorAll('.ln[data-n]').forEach(el => { el.textContent = t('Laag {n}', { n: el.dataset.n }); });
    document.querySelectorAll('[data-t-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.tLabel)); });
    document.querySelectorAll('#lang-pick button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.langSet === lang)));
    $('welcome').hidden = has;
    if (!has) $('fw-welcome').innerHTML = firmwareHTML();
    $('app').hidden = !has;
    $('status').classList.toggle('on', S.connected);
    $('status-text').textContent = S.connected ? S.deviceName : t(S.demo ? 'Demo zonder bordje' : 'Geen bordje verbonden');
    $('connect').hidden = S.connected;
    $('save').disabled = !has || !S.dirty;
    $('save').textContent = t(S.dirty || !has ? 'Opslaan op bordje' : 'Opgeslagen');
    if (!has) return;
    applyLayerColors();
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === S.tab)));
    for (const t of ['remap', 'led', 'board', 'settings']) $('page-' + t).hidden = t !== S.tab;
    $('sim').hidden = !S.demo;
    if (S.demo) renderSim();
    if (S.tab === 'remap') renderRemap();
    if (S.tab === 'led') renderLed();
    if (S.tab === 'board') renderBoard();
    if (S.tab === 'settings') renderSettings();
}

let toastTimer = 0;
function toast(text, err = false) {
    const box = $('toast');
    box.textContent = text; box.className = 'toast' + (err ? ' err' : ''); box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, err ? 7000 : 3500);
}

// ── device ───────────────────────────────────────────────────────────────────
async function connect() {
    try {
        const info = await Dev.connectDevice();
        S.cfg = M.normalize(await Dev.loadConfig());
        S.ext = await Dev.loadExt();
        S.connected = true; S.demo = false; S.dirty = false;
        S.deviceName = info.name || 'HID Remapper';
        S.selected = null; S.listen = S.pending = S.last = S.listenSwitch = null;
        await Dev.enableMonitor(r => onInput(r.usage, r.value));
        render();
    } catch (e) {
        if (e && e.name !== 'NotFoundError') toast(String(e.message || e), true);
    }
}
let previewTimer = 0;
function previewLed() {
    if (!S.connected) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => Dev.previewLed(S.ext.led).catch(() => {}), 60);
}
async function save() {
    if (S.demo) { S.dirty = false; toast(t('Demo: er is geen bordje om op te slaan.')); render(); return; }
    $('save').disabled = true; $('save').textContent = t('Bezig…');
    try {
        await Dev.saveConfig(S.cfg, S.ext);
        S.dirty = false; S.last = null;
        toast(t('Opgeslagen op het bordje.'));
    } catch (e) {
        toast(t('Opslaan is niet gelukt: {why}', { why: e.message || e }), true);
    }
    render();
}
function startDemo() {
    S.cfg = M.normalize(Dev.makeDefaultConfig());
    S.cfg.our_descriptor_number = 5;
    S.ext = {
        version: 1, board: 1, nlayers: 4, onboardLedPin: 16, maxStripLeds: 64, activeStripPin: null,
        boardPins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 26, 27, 28, 29],
        usablePins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 26, 27, 28, 29],
        led: { brightness: 64, stripPin: null, stripCount: 0, stripOrder: 0, colors: ['#0000ff', '#00ff00', '#ff0000', '#ffff00'] },
        pinNames: { 2: 'Input Jack 1', 3: 'Input Jack 2', 4: 'Input Jack 3' },
    };
    S.demo = true; S.connected = false; S.dirty = false;
    const sims = [['0xfff40002', 0], ['0xfff40003', 0], ['0xfff40004', 0], ['0x00090001', 0], ['0xfff90003', 0], ['0x00010030', 1], ['0x00010032', 1]];
    S.sims = sims;
    sims.filter(s => s[1]).forEach(([u]) => onInput(u, 128));
    render();
}
function renderSim() {
    $('sim').innerHTML = `<span class="lbl">${esc(t('Demo: druk op je hardware'))}</span>` +
        S.sims.map(([u, a]) => `<button type="button" data-sim="${u}" data-analog="${a}">${esc(sourceName(u, true))}</button>`).join('');
}

// ── events ───────────────────────────────────────────────────────────────────
function onClick(e) {
    const tg = e.target, q = sel => tg.closest(sel);
    let el;
    if ((el = q('[data-lang-set]'))) { pickLang(el.dataset.langSet); return; }
    if ((el = q('[data-theme-set]'))) {
        document.documentElement.dataset.theme = el.dataset.themeSet;
        try { localStorage.setItem('techremap-theme', el.dataset.themeSet); } catch (_) {}
        showTheme();
        if (S.cfg) render();
        return;
    }
    if (q('#connect') || q('#connect2')) { connect(); return; }
    if (q('#demo')) { startDemo(); return; }
    if (q('#save')) { save(); return; }
    if (!S.cfg) return;
    if ((el = q('#tabs button'))) { S.tab = el.dataset.tab; S.listen = S.pending = S.listenSwitch = null; }
    else if ((el = q('[data-sim]'))) {
        const u = el.dataset.sim, analog = el.dataset.analog === '1';
        onInput(u, analog ? 255 : 1);
        setTimeout(() => onInput(u, analog ? 128 : 0), 250);
        return;
    }
    else if ((el = q('[data-listen]'))) { S.listen = { id: S.selected, layer: Number(el.dataset.listen) }; S.pending = S.last = S.listenSwitch = null; }
    else if ((el = q('[data-add]'))) { S.listen = { id: S.selected, layer: Number(el.dataset.add), add: true }; S.pending = S.last = S.listenSwitch = null; }
    else if ((el = q('[data-remove]'))) {
        const c = device().controls[S.selected], [l, src] = el.dataset.remove.split('|');
        change(t('{source} bedient {control} niet meer op laag {n}.', { source: sourceName(src, stickLike(c)), control: tKey(c.name), n: layerNo(Number(l)) }),
            () => M.removeSource(S.cfg, c, Number(l), src));
    }
    else if ((el = q('[data-clear]'))) {
        const c = device().controls[S.selected], l = Number(el.dataset.clear);
        change(t('{control} doet niets meer op laag {n}.', { control: tKey(c.name), n: layerNo(l) }), () => M.clear(S.cfg, c, l));
    }
    else if ((el = q('[data-inherit]'))) {
        const c = device().controls[S.selected], l = Number(el.dataset.inherit);
        change(t('{control} volgt op laag {n} weer laag 1.', { control: tKey(c.name), n: layerNo(l) }), () => M.inherit(S.cfg, c, l));
    }
    else if (q('[data-cancel]')) { S.listen = S.pending = S.listenSwitch = null; }
    else if (q('[data-undo]')) { undo(); S.dirty = true; }
    else if ((el = q('[data-unswitch]'))) {
        const s = M.switches(S.cfg)[Number(el.dataset.unswitch)];
        if (s) change(t('Laagknop verwijderd.'), () => M.removeSwitch(S.cfg, s.mapping));
    }
    else if (q('#sw-add')) {
        if (S.listenSwitch) S.listenSwitch = null;
        else {
            const from = Number($('sw-from').value), to = Number($('sw-to').value), type = $('sw-type').value;
            if (from === to) { toast(t('Kies twee verschillende lagen.'), true); return; }
            if (type === 'hold' && to === 0) { toast(t('Laag 1 is de basis; “zolang ingedrukt” werkt alleen naar laag 2, 3 of 4.'), true); return; }
            S.listenSwitch = { type, from, to }; S.listen = S.pending = S.last = null;
        }
    }
    else if ((el = q('#layers button'))) { S.shown = Number(el.dataset.layer); }
    else if (q('#wipe')) {
        change(null, () => { S.cfg.mappings = S.cfg.mappings.filter(m => (parseInt(m.target_usage, 16) >>> 16) >= 0xfff0); });
        S.offerWipe = false;
    }
    else if (q('#keep')) { S.offerWipe = false; }
    else if (q('#flash')) { S.flashAsk = true; }
    else if (q('#flash-no')) { S.flashAsk = false; }
    else if (q('#flash-go')) {
        S.flashAsk = false; S.flashing = true;
        Dev.rebootToBootloader().catch(e => { S.flashing = false; toast(String(e.message || e), true); });
        return;
    }
    else if (q('#export')) { exportFile(); return; }
    else if (q('#import')) { $('import-file').click(); return; }
    else if ((el = q('#page-remap [data-id]'))) {
        const id = el.dataset.id;
        S.listen = null;
        if (S.pending) {
            // pressing first and clicking a control that already has an input adds to it, so nothing is lost
            const src = S.pending, layer = Math.max(S.shown, 0);
            S.pending = null;
            doAssign(id, layer, src, M.layerState(S.cfg, device().controls[id], layer).state === 'set');
        }
        else S.selected = id;
    }
    else return;
    render();
}
function onInputEvent(e) {
    const tg = e.target;
    if (!S.cfg) return;
    const touched = () => { S.dirty = true; $('save').disabled = false; $('save').textContent = t('Opslaan op bordje'); };
    if (tg.id === 'speed') { M.setSpeed(S.cfg, device().controls[S.selected], Number(tg.value)); $('speed-val').textContent = scalingText(Number(tg.value)); touched(); return; }
    if (tg.id === 'deadzone') { M.setDeadzone(S.cfg, device().controls[S.selected], Number(tg.value) * 1280); $('deadzone-val').textContent = tg.value + '%'; touched(); return; }
    if (tg.dataset.color !== undefined) { S.ext.led.colors[Number(tg.dataset.color)] = tg.value; }
    else if (tg.id === 'bright') { S.ext.led.brightness = Number(tg.value); $('bright-val').textContent = Math.round(tg.value / 2.55) + '%'; }
    else if (tg.dataset.pinname !== undefined) { const p = Number(tg.dataset.pinname); tg.value ? S.ext.pinNames[p] = tg.value : delete S.ext.pinNames[p]; touched(); return; }
    else return;
    touched();
    applyLayerColors();
    previewLed();
}
function onChange(e) {
    const tg = e.target;
    if (!S.cfg) return;
    if (tg.id === 'devtype') {
        S.cfg.our_descriptor_number = Number(tg.value); S.selected = null;
        // usage codes mean different things on different devices, so old assignments rarely make sense
        S.offerWipe = S.cfg.mappings.some(m => (parseInt(m.target_usage, 16) >>> 16) < 0xfff0);
        S.devChanged = true;
    }
    else if (tg.id === 'pass') { S.cfg.unmapped_passthrough_layers = tg.checked ? [0, 1, 2, 3] : []; }
    else if (tg.id === 'strip-pin') { S.ext.led.stripPin = tg.value === '' ? null : Number(tg.value); }
    else if (tg.id === 'strip-count') { S.ext.led.stripCount = Math.max(0, Math.min(S.ext.maxStripLeds, Number(tg.value) || 0)); previewLed(); }
    else if (tg.id === 'strip-order') { S.ext.led.stripOrder = Number(tg.value); previewLed(); }
    else if (tg.id === 'lang') { pickLang(tg.value); return; }
    else if (tg.id === 'import-file') { importFile(tg.files[0]); tg.value = ''; return; }
    else return;
    S.dirty = true;
    render();
}
function exportFile() {
    const data = JSON.stringify({ ...S.cfg, techremap: S.ext ? { led: S.ext.led, pinNames: S.ext.pinNames } : undefined }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = 'techremap-config.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function importFile(file) {
    if (!file) return;
    try {
        const parsed = Dev.importConfigJSON(await file.text());
        const extra = parsed.techremap; delete parsed.techremap;
        S.cfg = M.normalize({ ...Dev.makeDefaultConfig(), ...parsed });
        if (extra && S.ext) { Object.assign(S.ext.led, extra.led || {}); S.ext.pinNames = extra.pinNames || {}; previewLed(); }
        S.dirty = true; S.selected = null; S.last = null;
        toast(t('Bestand geladen. Klik op “Opslaan op bordje” om het te bewaren.'));
    } catch (e) {
        toast(t('Dit bestand kan ik niet lezen: {why}', { why: e.message || e }), true);
    }
    render();
}
function pickLang(l) {
    setLang(l);
    try { localStorage.setItem('techremap-lang', l); } catch (_) {}
    S.last = null;   // its text was written in the other language
    $('toast').hidden = true;
    render();
}
function showTheme() {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.querySelectorAll('#themes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === cur)));
}

export function init() {
    try { const th = localStorage.getItem('techremap-theme'); if (th) document.documentElement.dataset.theme = th; } catch (_) {}
    let l = (navigator.language || 'nl').toLowerCase().startsWith('nl') ? 'nl' : 'en';
    try { l = localStorage.getItem('techremap-lang') || l; } catch (_) {}
    setLang(l);
    showTheme();
    if (!('hid' in navigator)) { $('nohid').hidden = false; $('connect').disabled = true; $('connect2').disabled = true; }
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInputEvent);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.pad-hit')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
    });
    window.addEventListener('beforeunload', e => { if (S.dirty && S.connected) { e.preventDefault(); e.returnValue = ''; } });
    Dev.onHIDDisconnect(() => {
        S.connected = false; S.cfg = null; S.ext = null; S.dirty = false;
        if (S.flashing) {
            // the board went into update mode on purpose: show the downloads straight away
            S.flashing = false;
            toast(t('Het bordje is nu een USB-schijf. Sleep het firmwarebestand erop.'));
            setTimeout(() => { const d = document.querySelector('.fw-welcome'); if (d) d.open = true; }, 0);
        } else toast(t('Het bordje is losgekoppeld.'));
        render();
    });
    render();
}
