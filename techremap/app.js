// TechRemap - the screen. State lives in `S`; every change ends in render().

import * as Dev from './device.js?v=1';
import * as M from './model.js?v=1';
import { DEVICES, DEVICE_ORDER, PANEL_W, keyName } from './pads.js?v=1';

const CLASSIC_URL = '../config-tool-web-v2/';
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
    if (page === 0x0009) return `Knop ${low}`;
    if (page === 0xfff9) return 'D-pad ' + ({ 1: '←', 2: '→', 3: '↑', 4: '↓' }[low] || low);
    if (page === 0x0007) return keyName(u) || `Toets ${low}`;
    if (page === 0x0001) {
        const axes = { 0x30: ['Linker stick', '↔'], 0x31: ['Linker stick', '↕'], 0x32: ['Rechter stick', '↔'], 0x35: ['Rechter stick', '↕'],
                       0x33: ['Derde stick', '↔'], 0x34: ['Derde stick', '↕'], 0x36: ['Schuif', ''], 0x38: ['Scrollwiel', ''] };
        if (axes[low]) return asStick ? axes[low][0] : (axes[low][0] + ' ' + axes[low][1]).trim();
    }
    if (page === 0x0002 && low === 0xc4) return 'Gaspedaal';
    if (page === 0x0002 && low === 0xc5) return 'Rempedaal';
    if (page === 0xfff3) return `Expressie ${low}`;
    return u;
}
function targetName(u) {
    const c = Object.values(device().controls).find(x => (x.targets || []).some(t => t.u === u) || (x.axes || []).includes(u));
    if (c) return c.name;
    const n = parseInt(u, 16);
    if ((n >>> 16) === 0xfff1) return `laag ${layerNo(n & 0xffff)} (zolang ingedrukt)`;
    if ((n >>> 16) === 0xfffc) return `ga naar laag ${layerNo(n & 0xffff)}`;
    return 'een andere functie';
}
const REASONS = {
    'stick-needs-stick': 'Hier hoort een joystick bij. Beweeg een joystick, of gebruik de richtingen ← → ↑ ↓ voor losse knoppen.',
    'needs-button': 'Hier hoort een knop of jack bij, geen joystick.',
};

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
function doAssign(id, layer, source) {
    const control = device().controls[id];
    const reason = M.rejects(control, source);
    if (reason) { toast(REASONS[reason], true); return false; }
    const label = sourceName(source, control.kind === 'stick');
    change(`${label} bedient nu ${control.name} op laag ${layerNo(layer)}.`, () => M.assign(S.cfg, control, layer, source));
    const also = M.alsoDrives(S.cfg, control, source, layer).filter(m => (parseInt(m.target_usage, 16) >>> 16) < 0xfff0);
    if (also.length) S.last.text += ` Let op: op deze laag bedient ${label} ook ${[...new Set(also.map(m => targetName(m.target_usage)))].join(' en ')}.`;
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
        const what = type === 'goto' ? `gaat naar laag ${layerNo(to)}` : `activeert laag ${layerNo(to)} zolang ingedrukt`;
        change(`${sourceName(usage)} ${what} (op laag ${layerNo(from)}).`, () => M.addSwitch(S.cfg, type, from, to, usage));
    } else if (S.listen) {
        const { id, layer } = S.listen;
        if (doAssign(id, layer, usage)) S.listen = null;
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
        if (M.chips(S.cfg, ctl[id]).some(c => usages.has(c.source) || (ctl[id].kind === 'stick' && (M.stickPair(c.source) || []).some(a => usages.has(a))))) ids.add(id);
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
    return cs.length ? cs.map(c => chip(c.layer, sourceName(c.source, control.kind === 'stick'))).join('') : '<span class="muted">Niet toegewezen</span>';
}

function renderRemap() {
    const dev = device(), ctl = dev.controls, scene = dev.scene();
    S.scene = scene;
    if (!ctl[S.selected]) S.selected = Object.keys(ctl)[0];
    $('device-pill').innerHTML = `De pc ziet: <b>${esc(dev.label)}</b>`;

    const row = id => `<button type="button" class="row" data-id="${id}"><span class="glyph">${esc(ctl[id].g)}</span><span class="chips">${chipsHTML(ctl[id])}</span></button>`;
    let marks = '';
    for (const id in scene.markAt) {
        const layers = [...new Set((scene.stands[id] || [id]).flatMap(x => M.chips(S.cfg, ctl[x]).map(c => c.layer)))].sort();
        layers.forEach((l, i) => { marks += `<circle class="mark m${l + 1}" data-l="${l}" cx="${scene.markAt[id][0] + i * 9}" cy="${scene.markAt[id][1]}" r="5"/>`; });
    }
    const panels = scene.panels.map(p => `<foreignObject x="${p.x}" y="${p.y}" width="${PANEL_W}" height="${p.h}">` +
        `<div xmlns="http://www.w3.org/1999/xhtml" class="panel"><h2>${esc(p.title)}</h2>${p.ids.map(row).join('')}</div></foreignObject>`).join('');
    const stage = $('stage');
    stage.setAttribute('viewBox', `0 44 1180 ${scene.bottom + 14 - 44}`);
    stage.innerHTML = scene.drawing + scene.leaders + marks + panels;

    $('kbd-card').hidden = !dev.keyboard;
    $('kbd').innerHTML = !dev.keyboard ? '' : dev.keyboard.map(r => '<div class="kbd-row">' + r.map(k =>
        `<button type="button" class="kkey" data-id="${k.id}" style="flex-grow:${k.w}" aria-label="${esc(k.name)}">${esc(k.g)}` +
        `<span class="kd">${M.chips(S.cfg, ctl[k.id]).map(c => `<span class="dot d${c.layer + 1} mark" data-l="${c.layer}"></span>`).join('')}</span></button>`).join('') + '</div>').join('');

    renderDetail(ctl[S.selected]);
    renderSwitches();

    const banner = $('banner');
    banner.className = 'banner';
    banner.hidden = false;
    if (S.listenSwitch) banner.innerHTML = `<span>Druk nu op de knop of jack die de laag moet wisselen.</span><button type="button" data-cancel>Annuleer</button>`;
    else if (S.pending) banner.innerHTML = `<span><b>${esc(sourceName(S.pending))}</b> ingedrukt. Klik op wat hij moet bedienen op laag ${layerNo(Math.max(S.shown, 0))}.</span><button type="button" data-cancel>Annuleer</button>`;
    else if (S.last) banner.innerHTML = `<span>${esc(S.last.text)}</span><button type="button" data-undo>Ongedaan maken</button>`;
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
    $('detail-title').textContent = control.name;
    $('detail-sub').textContent = control.kind === 'stick'
        ? 'Klik op “Wijzig” en beweeg daarna de joystick die deze stick moet bedienen.'
        : 'Klik op “Wijzig” en druk daarna op je knop of jack.';
    const asStick = control.kind === 'stick';
    let html = '';
    for (let l = 0; l < M.NLAYERS; l++) {
        const st = M.layerState(S.cfg, control, l);
        const on = S.listen && S.listen.id === S.selected && S.listen.layer === l;
        const names = (st.sources || []).map(s => sourceName(s, asStick)).join(' en ');
        const text = { set: names, same: `Zelfde als laag 1 (${names})`,
            moved: st.state === 'moved' ? `Niets. ${sourceName(st.source, asStick)} doet hier: ${targetName(st.to)}.` : '',
            off: 'Niets op deze laag', empty: 'Niet toegewezen' }[st.state];
        const acts = [];
        if (on) acts.push('<button type="button" class="go" data-cancel>Annuleer</button>');
        else {
            acts.push(`<button type="button" data-listen="${l}">Wijzig</button>`);
            if (l === 0 && st.state === 'set') acts.push(`<button type="button" data-clear="${l}">Wis</button>`);
            if (l > 0 && ['set', 'off', 'moved'].includes(st.state) && M.layerState(S.cfg, control, 0).state === 'set') acts.push(`<button type="button" data-inherit="${l}">Zelfde als laag 1</button>`);
            if (l > 0 && ['set', 'same'].includes(st.state)) acts.push(`<button type="button" data-clear="${l}">Niets</button>`);
        }
        html += `<div class="detail-row${on ? ' listening' : ''}"><span class="lname"><span class="dot d${l + 1}"></span>Laag ${layerNo(l)}</span>` +
            `<span class="val${st.state === 'set' || on ? '' : ' same'}">${on ? (asStick ? 'Beweeg nu de joystick…' : 'Druk nu op je knop of jack…') : esc(text)}</span>` +
            `<span class="acts">${acts.join('')}</span></div>`;
    }
    if (control.kind === 'rel') {
        const sp = M.speed(S.cfg, control) ?? control.speed;
        const [min, max] = control.speed >= 100 ? [50, 2000] : [1, 50];
        html += `<div class="detail-row"><span class="lname">Snelheid</span><span class="val"><input type="range" id="speed" min="${min}" max="${max}" value="${sp}" aria-label="Snelheid"></span><span class="acts"></span></div>`;
    }
    $('detail-rows').innerHTML = html;
}

function renderSwitches() {
    const sw = M.switches(S.cfg);
    const text = s => ({ goto: `Ga naar laag ${layerNo(s.to)}`, hold: `⇧ Laag ${layerNo(s.to)} zolang ingedrukt`, toggle: `Laag ${layerNo(s.to)} aan/uit` }[s.type]);
    $('switches').innerHTML = sw.length ? sw.map((s, i) =>
        `<div class="row" style="cursor:default"><span class="chips"><span class="chip key"><span class="t">${esc(text(s))}</span></span>` +
        s.from.map(l => chip(l, sourceName(s.source))).join('') + `</span><button type="button" class="xbtn" data-unswitch="${i}" aria-label="Verwijder">Verwijder</button></div>`).join('')
        : '<span class="muted" style="padding:4px 6px">Nog geen laagknoppen.</span>';
    const stranded = M.strandedLayers(S.cfg);
    $('switch-warn').hidden = !stranded.length;
    $('switch-warn').innerHTML = stranded.map(l => `<span><b>Let op.</b> Vanuit laag ${layerNo(l)} kun je niet terug naar laag 1. Opnieuw insteken brengt je altijd terug.</span>`).join('');
    const canGoto = S.demo || !!S.ext;
    const type = $('sw-type'), keep = type.value;
    type.innerHTML = (canGoto ? '<option value="goto">ga naar</option>' : '') + '<option value="hold">zolang ingedrukt naar</option>';
    if ([...type.options].some(o => o.value === keep)) type.value = keep;
    $('sw-add').textContent = S.listenSwitch ? 'Annuleer' : 'Kies knop of jack';
}

// ── rendering: other tabs ────────────────────────────────────────────────────
const needsExt = what => `<h3>${what}</h3><p class="sub">Dit bordje draait de officiële HID Remapper-firmware. Daarmee kun je knoppen en lagen instellen, maar ${what.toLowerCase()} zit alleen in de TechRemap-firmware.</p>`;

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
    card.innerHTML = `<h3>Lampjes</h3><p class="sub">De lamp op het bordje toont in welke laag je zit. Wijzigingen zie je meteen; ze blijven pas bewaard na “Opslaan op bordje”.</p>` +
        led.colors.map((c, i) => `<div class="field"><label for="col${i}">Kleur laag ${i + 1}</label><input type="color" id="col${i}" data-color="${i}" value="${c}"></div>`).join('') +
        `<div class="field"><label for="bright">Helderheid</label><div class="inline"><input type="range" id="bright" min="0" max="255" value="${led.brightness}"><span id="bright-val">${Math.round(led.brightness / 2.55)}%</span></div></div>`;
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
    card.innerHTML = `<h3>Jacks en pinnen</h3><p class="sub">Geef elke pin waar je een jack of schakelaar aan hebt gesoldeerd een naam. Die naam zie je daarna overal in plaats van het pinnummer. Druk op een schakelaar om te zien welke pin het is.</p>` +
        `<div class="pins">` + e.boardPins.map(p => {
            const taken = p === e.activeStripPin || p === led.stripPin;
            return `<div class="pin${taken ? ' taken' : ''}" data-pin="${p}"><span class="lamp"></span><span class="n">GPIO ${p}</span>` +
                `<input type="text" data-pinname="${p}" maxlength="16" placeholder="${taken ? 'LED-strip' : 'bijv. Input Jack 1'}" value="${esc(e.pinNames[p] || '')}" aria-label="Naam voor GPIO ${p}"></div>`;
        }).join('') + `</div>`;
    const mA = stripCurrent();
    strip.innerHTML = `<h3>LED-strip of -ring</h3><p class="sub">Een WS2812-strip of -ring die de laagkleur toont. Sluit de datalijn aan op de gekozen pin.</p>` +
        (e.maxStripLeds ? `
        <div class="field"><label for="strip-pin">Pin</label><select id="strip-pin"><option value="">Geen strip</option>${e.boardPins.map(p => `<option value="${p}"${p === led.stripPin ? ' selected' : ''}>GPIO ${p}${e.pinNames[p] ? ' · ' + esc(e.pinNames[p]) : ''}</option>`).join('')}</select>
            <span class="hint">Een andere pin werkt pas nadat je hebt opgeslagen en het bordje opnieuw hebt ingestoken.${e.activeStripPin !== led.stripPin ? ' <b>Nog niet actief.</b>' : ''}</span></div>
        <div class="field"><label for="strip-count">Aantal LEDs</label><input type="number" id="strip-count" min="0" max="${e.maxStripLeds}" value="${led.stripCount}"></div>
        <div class="field"><label for="strip-order">Kleurvolgorde</label><select id="strip-order"><option value="0"${led.stripOrder === 0 ? ' selected' : ''}>GRB (meeste strips)</option><option value="1"${led.stripOrder === 1 ? ' selected' : ''}>RGB</option></select>
            <span class="hint">Kloppen de kleuren niet (rood en groen verwisseld)? Kies dan de andere volgorde.</span></div>
        ${mA > 400 ? `<div class="warn"><span><b>Let op.</b> ${led.stripCount} LEDs op deze helderheid kunnen tot ongeveer ${mA} mA trekken. Dat is meer dan een USB-poort veilig levert; verlaag de helderheid of voed de strip apart.</span></div>` : ''}`
        : '<p class="sub">Deze firmware kan geen strip aansturen.</p>');
    paintPins();
}
function renderSettings() {
    const c = S.cfg, pass = c.unmapped_passthrough_layers.length > 0;
    const fw = S.demo ? 'Demo, geen bordje verbonden' : S.ext ? `TechRemap-firmware op ${BOARD_NAMES[S.ext.board] || 'een onbekend bord'}` : 'Officiële HID Remapper-firmware';
    $('settings-card').innerHTML = `<h3>Instellingen</h3>
        <div class="field"><label for="devtype">De pc ziet het bordje als</label><select id="devtype">${DEVICE_ORDER.map(n => `<option value="${n}"${n === c.our_descriptor_number ? ' selected' : ''}>${esc(DEVICES[n].label)}</option>`).join('')}</select>
            <span class="hint">Werkt nadat je hebt opgeslagen en het bordje opnieuw hebt ingestoken.</span></div>
        ${S.offerWipe ? `<div class="warn"><span><b>Let op.</b> De toewijzingen die je al had zijn voor het vorige apparaat gemaakt en betekenen hier iets anders. <button type="button" class="btn" id="wipe">Begin met een lege indeling</button> <button type="button" class="btn" id="keep">Behoud ze toch</button></span></div>` : ''}
        <div class="field"><label for="pass">Niet-toegewezen knoppen</label><div class="inline"><input type="checkbox" id="pass"${pass ? ' checked' : ''}><label for="pass">gewoon doorgeven aan de pc</label></div>
            <span class="hint">Handig als je een gewone controller insteekt en maar een paar knoppen wilt veranderen.</span></div>
        <div class="field"><span class="flabel">Reservekopie</span><div class="inline"><button type="button" class="btn" id="export">Bewaar als bestand</button><button type="button" class="btn" id="import">Laad uit bestand</button><input type="file" id="import-file" accept=".json,application/json" hidden></div></div>
        <div class="field"><span class="flabel">Voor gevorderden</span><div class="inline"><a class="btn" href="${CLASSIC_URL}" target="_blank" rel="noopener">Open de klassieke weergave</a></div>
            <span class="hint">Macro’s, expressies en quirks stel je voorlopig daar in. Wat je hier instelt blijft daar zichtbaar, en andersom.</span></div>
        <div class="field"><span class="flabel">Firmware</span><span>${esc(fw)}</span></div>`;
}

function render() {
    const has = !!S.cfg;
    $('welcome').hidden = has;
    $('app').hidden = !has;
    $('status').classList.toggle('on', S.connected);
    $('status-text').textContent = S.connected ? S.deviceName : S.demo ? 'Demo zonder bordje' : 'Geen bordje verbonden';
    $('connect').hidden = S.connected;
    $('save').disabled = !has || !S.dirty;
    $('save').textContent = S.dirty ? 'Opslaan op bordje' : 'Opgeslagen';
    if (!has) return;
    applyLayerColors();
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === S.tab)));
    for (const t of ['remap', 'led', 'board', 'settings']) $('page-' + t).hidden = t !== S.tab;
    $('sim').hidden = !S.demo;
    if (S.tab === 'remap') renderRemap();
    if (S.tab === 'led') renderLed();
    if (S.tab === 'board') renderBoard();
    if (S.tab === 'settings') renderSettings();
}

let toastTimer = 0;
function toast(text, err = false) {
    const t = $('toast');
    t.textContent = text; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, err ? 7000 : 3500);
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
    if (S.demo) { S.dirty = false; toast('Demo: er is geen bordje om op te slaan.'); render(); return; }
    $('save').disabled = true; $('save').textContent = 'Bezig…';
    try {
        await Dev.saveConfig(S.cfg, S.ext);
        S.dirty = false; S.last = null;
        toast('Opgeslagen op het bordje.');
    } catch (e) {
        toast('Opslaan is niet gelukt: ' + (e.message || e), true);
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
    $('sim').innerHTML = '<span class="lbl">Demo: druk op je hardware</span>' +
        sims.map(([u, a]) => `<button type="button" data-sim="${u}" data-analog="${a}">${esc(sourceName(u, true))}</button>`).join('');
    sims.filter(s => s[1]).forEach(([u]) => onInput(u, 128));
    render();
}

// ── events ───────────────────────────────────────────────────────────────────
function onClick(e) {
    const t = e.target, q = sel => t.closest(sel);
    let el;
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
    else if ((el = q('[data-clear]'))) {
        const c = device().controls[S.selected], l = Number(el.dataset.clear);
        change(`${c.name} doet niets meer op laag ${layerNo(l)}.`, () => M.clear(S.cfg, c, l));
    }
    else if ((el = q('[data-inherit]'))) {
        const c = device().controls[S.selected], l = Number(el.dataset.inherit);
        change(`${c.name} volgt op laag ${layerNo(l)} weer laag 1.`, () => M.inherit(S.cfg, c, l));
    }
    else if (q('[data-cancel]')) { S.listen = S.pending = S.listenSwitch = null; }
    else if (q('[data-undo]')) { undo(); S.dirty = true; }
    else if ((el = q('[data-unswitch]'))) {
        const s = M.switches(S.cfg)[Number(el.dataset.unswitch)];
        if (s) change('Laagknop verwijderd.', () => M.removeSwitch(S.cfg, s.mapping));
    }
    else if (q('#sw-add')) {
        if (S.listenSwitch) S.listenSwitch = null;
        else {
            const from = Number($('sw-from').value), to = Number($('sw-to').value), type = $('sw-type').value;
            if (from === to) { toast('Kies twee verschillende lagen.', true); return; }
            if (type === 'hold' && to === 0) { toast('Laag 1 is de basis; “zolang ingedrukt” werkt alleen naar laag 2, 3 of 4.', true); return; }
            S.listenSwitch = { type, from, to }; S.listen = S.pending = S.last = null;
        }
    }
    else if ((el = q('#layers button'))) { S.shown = Number(el.dataset.layer); }
    else if (q('#wipe')) {
        change(null, () => { S.cfg.mappings = S.cfg.mappings.filter(m => (parseInt(m.target_usage, 16) >>> 16) >= 0xfff0); });
        S.offerWipe = false;
    }
    else if (q('#keep')) { S.offerWipe = false; }
    else if (q('#export')) { exportFile(); return; }
    else if (q('#import')) { $('import-file').click(); return; }
    else if ((el = q('#page-remap [data-id]'))) {
        const id = el.dataset.id;
        S.listen = null;
        if (S.pending) { const src = S.pending; S.pending = null; doAssign(id, Math.max(S.shown, 0), src); }
        else S.selected = id;
    }
    else return;
    render();
}
function onInputEvent(e) {
    const t = e.target;
    if (!S.cfg) return;
    if (t.id === 'speed') { M.setSpeed(S.cfg, device().controls[S.selected], Number(t.value)); S.dirty = true; $('save').disabled = false; $('save').textContent = 'Opslaan op bordje'; return; }
    if (t.dataset.color !== undefined) { S.ext.led.colors[Number(t.dataset.color)] = t.value; }
    else if (t.id === 'bright') { S.ext.led.brightness = Number(t.value); $('bright-val').textContent = Math.round(t.value / 2.55) + '%'; }
    else if (t.dataset.pinname !== undefined) { const p = Number(t.dataset.pinname); t.value ? S.ext.pinNames[p] = t.value : delete S.ext.pinNames[p]; S.dirty = true; $('save').disabled = false; $('save').textContent = 'Opslaan op bordje'; return; }
    else return;
    S.dirty = true; $('save').disabled = false; $('save').textContent = 'Opslaan op bordje';
    applyLayerColors();
    previewLed();
}
function onChange(e) {
    const t = e.target;
    if (!S.cfg) return;
    if (t.id === 'devtype') {
        S.cfg.our_descriptor_number = Number(t.value); S.selected = null;
        // usage codes mean different things on different devices, so old assignments rarely make sense
        S.offerWipe = S.cfg.mappings.some(m => (parseInt(m.target_usage, 16) >>> 16) < 0xfff0);
    }
    else if (t.id === 'pass') { S.cfg.unmapped_passthrough_layers = t.checked ? [0, 1, 2, 3] : []; }
    else if (t.id === 'strip-pin') { S.ext.led.stripPin = t.value === '' ? null : Number(t.value); }
    else if (t.id === 'strip-count') { S.ext.led.stripCount = Math.max(0, Math.min(S.ext.maxStripLeds, Number(t.value) || 0)); previewLed(); }
    else if (t.id === 'strip-order') { S.ext.led.stripOrder = Number(t.value); previewLed(); }
    else if (t.id === 'import-file') { importFile(t.files[0]); t.value = ''; return; }
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
        toast('Bestand geladen. Klik op “Opslaan op bordje” om het te bewaren.');
    } catch (e) {
        toast('Dit bestand kan ik niet lezen: ' + (e.message || e), true);
    }
    render();
}
function showTheme() {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.querySelectorAll('#themes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === cur)));
}

export function init() {
    try { const t = localStorage.getItem('techremap-theme'); if (t) document.documentElement.dataset.theme = t; } catch (_) {}
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
        toast('Het bordje is losgekoppeld.');
        render();
    });
    render();
}
