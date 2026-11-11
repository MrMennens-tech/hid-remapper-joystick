// TechRemap - the devices the PC can see: which controls each has, which HID
// usage every control is, and how the device is drawn.
//
// Drawings are defined for the RIGHT half around the centre line x = 590 and
// mirrored, so a controller cannot come out lopsided. Usage codes per device
// follow HID Remapper's own tables (config-tool-web/usages.js).

const CX = 590;
const mx = x => 2 * CX - x;
const UPPER = 218, LOWER_X = 60, UPPER_X = 100;
export const PANEL_W = 320, LEFT_X = 12, RIGHT_X = 848;
export const panelH = n => 22 + 30 * n + 18 + 2 * (n - 1);

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const btnUsage = n => '0x0009' + n.toString(16).padStart(4, '0');
const keyUsage = n => '0x0007' + n.toString(16).padStart(4, '0');

const LX = '0x00010030', LY = '0x00010031', RX = '0x00010032', RY = '0x00010035';
const button = (g, name, n, axis) => ({
    g, name, kind: 'button',
    targets: [{ u: btnUsage(n), d: 1000, a: 1000 }].concat(axis ? [{ u: axis, d: 255000, a: 1000 }] : []),
});
const usageButton = (g, name, u) => ({ g, name, kind: 'button', targets: [{ u, d: 1000, a: 1000 }] });

function stickControls(id, name, x, y, click) {
    const c = {};
    c[id] = { g: id === 'ls' ? 'L' : 'R', name, kind: 'stick', axes: [x, y] };
    c[id + '_l'] = { g: '←', name: name + ' naar links', kind: 'dir', targets: [{ u: x, d: 0 }] };
    c[id + '_r'] = { g: '→', name: name + ' naar rechts', kind: 'dir', targets: [{ u: x, d: 255000 }] };
    c[id + '_u'] = { g: '↑', name: name + ' omhoog', kind: 'dir', targets: [{ u: y, d: 0 }] };
    c[id + '_d'] = { g: '↓', name: name + ' omlaag', kind: 'dir', targets: [{ u: y, d: 255000 }] };
    c[id + '_c'] = button(click.g, name + ' indrukken', click.n);
    return c;
}
const STICK_ROWS = id => [id, id + '_l', id + '_r', id + '_u', id + '_d', id + '_c'];

// ── gamepads ─────────────────────────────────────────────────────────────────
const PAD_SPECS = {
    // XAC/Flex compatible: an Xbox-style pad. It has X1/X2 where triggers would be and no guide button.
    5: {
        key: 'xbox', label: 'Xbox (XAC/Flex)',
        // From the HID Remapper manual and Xbox's May 2024 Adaptive Controller update.
        notes: {
            title: 'Goed om te weten bij de Xbox Adaptive Controller en Hori Flex',
            items: [
                'Een Xbox Adaptive Controller met recente firmware leest per USB-poort twee sticks, het D-pad en 12 knoppen. Met oudere firmware is dat minder; werk de controller bij in de Xbox Accessories-app.',
                'De knopnamen hier kloppen als je het bordje in de linker USB-poort van de Xbox Adaptive Controller steekt. In de rechterpoort zijn sommige knoppen verwisseld.',
                'Analoge trekkers werken op de Xbox Adaptive Controller alleen als aan/uit-knop.',
                'De Hori Flex accepteert via USB alleen een analoge stick, geen knoppen, en één stick per poort.',
            ],
        },
        half: 'M590,152 L672,152 C712,152 738,166 752,196 C778,252 800,340 796,402 C793,442 764,456 742,432 C722,410 708,372 688,356 C678,348 668,346 656,346 L590,346',
        sticks: 'offset', lowerY: 296,
        lt: button('X1', 'X1-knop', 1), rt: button('X2', 'X2-knop', 2),
        lb: button('LB', 'Linker bumper', 4), rb: button('RB', 'Rechter bumper', 10),
        face: { ftop: button('Y', 'Knop Y', 12), fright: button('B', 'Knop B', 6), fbottom: button('A', 'Knop A', 5), fleft: button('X', 'Knop X', 11) },
        click: { l: { g: 'LS', n: 3 }, r: { g: 'RS', n: 9 } },
        center: [
            { id: 'c1', at: [562, 218], r: 9.5, sym: '⧉', ...button('View', 'View-knop', 7) },
            { id: 'c2', at: [618, 218], r: 9.5, sym: '≡', ...button('Menu', 'Menu-knop', 8) },
        ],
        lead: { end: 244, bracket: [562, 618, 227.5, 244] },
    },
    3: {
        key: 'ps4', label: 'PS4',
        notes: {
            title: 'Goed om te weten bij PlayStation',
            items: [
                'Op een PS4 werkt dit direct. Op een PS5 werkt het rechtstreeks alleen bij vechtspellen, en dan met een apart authenticatie-apparaat. Via een adapter zoals de Brook Wingman FGC2, Beloader of Besavior werkt het in alle PS5-spellen.',
                'Van de touchpad wordt alleen de klik doorgegeven, geen vingerbeweging.',
            ],
        },
        half: 'M590,158 L700,158 C738,158 762,170 774,196 C790,232 796,268 800,300 L822,418 C828,452 808,470 784,468 C764,466 752,452 744,432 L716,366 C708,348 694,338 676,338 L590,338',
        sticks: 'low', lowerY: 290,
        lt: button('L2', 'L2', 7, '0x00010033'), rt: button('R2', 'R2', 8, '0x00010034'),
        lb: button('L1', 'L1', 5), rb: button('R1', 'R1', 6),
        face: { ftop: button('△', 'Driehoek', 4), fright: button('○', 'Rondje', 3), fbottom: button('✕', 'Kruisje', 2), fleft: button('□', 'Vierkant', 1) },
        click: { l: { g: 'L3', n: 11 }, r: { g: 'R3', n: 12 } },
        center: [
            { id: 'c1', at: [537, 178], r: 7.5, sym: '', ...button('Share', 'Share-knop', 9) },
            { id: 'c2', at: [643, 178], r: 7.5, sym: '', ...button('Opt.', 'Options-knop', 10) },
            { id: 'c3', at: [590, 292], r: 12, sym: 'PS', fs: 10, ...button('PS', 'PS-knop', 13) },
            { id: 'c4', rect: [548, 168, 84, 60], sym: '', ...button('Pad', 'Touchpad-klik', 14) },
        ],
        lead: { end: 304 },
    },
    2: {
        key: 'switch', label: 'Switch Pro',
        half: 'M590,150 L668,150 C730,150 762,172 772,214 L812,420 C818,452 796,470 772,466 C752,462 742,448 734,430 L700,350 L590,350',
        extra: '<path class="pad-seam" d="M785,282 L706,350"/>',
        sticks: 'offset', lowerY: 296,
        lt: button('ZL', 'ZL', 7), rt: button('ZR', 'ZR', 8),
        lb: button('L', 'L', 5), rb: button('R', 'R', 6),
        face: { ftop: button('X', 'Knop X', 4), fright: button('A', 'Knop A', 3), fbottom: button('B', 'Knop B', 2), fleft: button('Y', 'Knop Y', 1) },
        click: { l: { g: 'LS', n: 11 }, r: { g: 'RS', n: 12 } },
        center: [
            { id: 'c1', at: [548, 198], r: 9.5, sym: '−', fs: 14, ...button('−', 'Min-knop', 9) },
            { id: 'c2', at: [632, 198], r: 9.5, sym: '+', fs: 14, ...button('+', 'Plus-knop', 10) },
            { id: 'c3', at: [614, 240], r: 9.5, sym: '⌂', ...button('Home', 'Home-knop', 13) },
            { id: 'c4', at: [566, 240], r: 9.5, sym: '◉', ...button('Capt.', 'Capture-knop', 14) },
        ],
        lead: { end: 264, bracket: [566, 614, 249.5, 264] },
    },
    4: {
        key: 'stadia', label: 'Stadia',
        half: 'M590,150 L690,150 C748,150 778,186 786,240 C794,300 806,372 806,410 C806,448 780,462 752,462 C728,462 716,448 712,420 C708,384 692,346 650,346 L590,346',
        sticks: 'low', lowerY: 292,
        lt: button('L2', 'L2', 0x14, '0x000200c5'), rt: button('R2', 'R2', 0x13, '0x000200c4'),
        lb: button('L1', 'L1', 7), rb: button('R1', 'R1', 8),
        face: { ftop: button('Y', 'Knop Y', 5), fright: button('B', 'Knop B', 2), fbottom: button('A', 'Knop A', 1), fleft: button('X', 'Knop X', 4) },
        click: { l: { g: 'L3', n: 14 }, r: { g: 'R3', n: 15 } },
        center: [
            { id: 'c1', at: [552, 190], r: 9, sym: '⋯', ...button('⋯', 'Options-knop', 11) },
            { id: 'c2', at: [628, 190], r: 9, sym: '≡', ...button('≡', 'Menu-knop', 12) },
            { id: 'c3', at: [590, 256], r: 13, sym: 'S', fs: 12, ...button('S', 'Stadia-knop', 13) },
            { id: 'c4', at: [566, 222], r: 8, sym: '●', fs: 8, ...button('Ass.', 'Assistent-knop', 0x11) },
            { id: 'c5', at: [614, 222], r: 8, sym: '◉', fs: 9, ...button('Capt.', 'Capture-knop', 0x12) },
        ],
        lead: { end: 269 },
    },
};

function buildPad(spec) {
    const off = spec.sticks === 'offset';
    const pos = {
        face: [CX + UPPER_X, UPPER], rs: [CX + LOWER_X, spec.lowerY],
        ls: off ? [CX - UPPER_X, UPPER] : [CX - LOWER_X, spec.lowerY],
        dpad: off ? [CX - LOWER_X, spec.lowerY] : [CX - UPPER_X, UPPER],
    };
    const controls = {
        lt: spec.lt, lb: spec.lb, rt: spec.rt, rb: spec.rb, ...spec.face,
        du: usageButton('↑', 'D-pad omhoog', '0xfff90003'), dr: usageButton('→', 'D-pad rechts', '0xfff90002'),
        dd: usageButton('↓', 'D-pad omlaag', '0xfff90004'), dl: usageButton('←', 'D-pad links', '0xfff90001'),
        ...stickControls('ls', 'Linker stick', LX, LY, spec.click.l),
        ...stickControls('rs', 'Rechter stick', RX, RY, spec.click.r),
    };
    spec.center.forEach(b => { controls[b.id] = { g: b.g, name: b.name, kind: b.kind, targets: b.targets }; });

    function scene() {
        const c = controls;
        const hit = (id, inner) => `<g class="pad-hit" data-id="${id}" tabindex="0" role="button" aria-label="${esc(c[id].name)}">${inner}</g>`;
        const mirror = inner => `<g transform="translate(${2 * CX},0) scale(-1,1)">${inner}</g>`;
        const text = (x, y, t, fs) => `<text class="pad-text" x="${x}" y="${y}" font-size="${fs}">${esc(t)}</text>`;
        const trig = '<rect class="pad-back" x="672" y="96" width="70" height="60" rx="16"/>';
        const bump = '<path class="pad-back" d="M654,196 L654,146 Q654,136 664,136 L676,136 C722,136 752,150 766,198 Z"/>';
        const stick = id => { const [x, y] = pos[id]; return hit(id,
            `<circle class="pad-well" cx="${x}" cy="${y}" r="34"/><circle class="pad-part" cx="${x}" cy="${y}" r="23"/>` + text(x, y, c[id].g, 15)); };
        const [fx, fy] = pos.face, [dx, dy] = pos.dpad, o = 29;
        const round = (id, x, y, r, fs) => hit(id, `<circle class="pad-part" cx="${x}" cy="${y}" r="${r}"/>` + text(x, y, c[id].g, fs));
        const arm = (id, x, y, w, h, tx, ty) => hit(id, `<rect class="pad-part" x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/>` + text(tx, ty, c[id].g, 13));
        const centre = spec.center.map(b => b.rect
            ? hit(b.id, `<rect class="pad-flat" x="${b.rect[0]}" y="${b.rect[1]}" width="${b.rect[2]}" height="${b.rect[3]}" rx="10"/>`)
            : hit(b.id, `<circle class="pad-part" cx="${b.at[0]}" cy="${b.at[1]}" r="${b.r}"/>` + text(b.at[0], b.at[1], b.sym, b.fs || 11))).join('');

        const drawing = [
            hit('rt', trig + text(707, 116, c.rt.g, 13)), hit('lt', mirror(trig) + text(mx(707), 116, c.lt.g, 13)),
            hit('rb', bump + text(700, 144.5, c.rb.g, 11)), hit('lb', mirror(bump) + text(mx(700), 144.5, c.lb.g, 11)),
            `<path class="pad-body" d="${spec.half} Z"/>`, mirror(`<path class="pad-body" d="${spec.half} Z"/>`),
            `<path class="pad-outline" d="${spec.half}"/>`, mirror(`<path class="pad-outline" d="${spec.half}"/>`),
            spec.extra ? spec.extra + mirror(spec.extra) : '',
            centre, stick('ls'), stick('rs'),
            `<circle class="pad-well" cx="${dx}" cy="${dy}" r="40"/>`,
            arm('du', dx - 11, dy - 34, 22, 26, dx, dy - 21), arm('dd', dx - 11, dy + 8, 22, 26, dx, dy + 21),
            arm('dl', dx - 34, dy - 11, 26, 22, dx - 21, dy), arm('dr', dx + 8, dy - 11, 26, 22, dx + 21, dy),
            round('ftop', fx, fy - o, 14.5, 14), round('fright', fx + o, fy, 14.5, 14),
            round('fbottom', fx, fy + o, 14.5, 14), round('fleft', fx - o, fy, 14.5, 14),
        ].join('');

        // where the layer dots go, and which controls each drawn part stands for
        const markAt = {
            rt: [736, 100], lt: [mx(678), 100], rb: [744, 148], lb: [mx(668), 142],
            ls: [pos.ls[0] + 26, pos.ls[1] - 26], rs: [pos.rs[0] + 26, pos.rs[1] - 26],
            du: [dx + 12, dy - 35], dr: [dx + 35, dy - 12], dd: [dx + 12, dy + 35], dl: [dx - 35, dy - 12],
            ftop: [fx + 12, fy - o - 12], fright: [fx + o + 12, fy - 12], fbottom: [fx + 12, fy + o - 12], fleft: [fx - o + 12, fy - 12],
        };
        spec.center.forEach(b => { markAt[b.id] = b.rect ? [b.rect[0] + b.rect[2] - 8, b.rect[1] + 8] : [b.at[0] + b.r * 0.8, b.at[1] - b.r * 0.8]; });
        const stands = { ls: STICK_ROWS('ls'), rs: STICK_ROWS('rs') };

        const panels = [], leaders = [];
        const lead = (d, ex, ey) => leaders.push(`<path class="leader" d="${d}"/><circle class="leader-end" cx="${ex}" cy="${ey}" r="3"/>`);
        const column = (x, side, groups) => {
            let y = 184;
            groups.forEach(([title, ids, key]) => {
                const h = panelH(ids.length); panels.push({ title, ids, x, y, h });
                const [tx, ty] = pos[key], rad = key === 'dpad' ? 40 : key === 'face' ? o + 14.5 : 34;
                const edge = side < 0 ? x + PANEL_W : x, ly = Math.min(Math.max(ty, y + 22), y + h - 22);
                if (ly === ty) lead(`M${edge},${ly} H${tx + side * rad}`, tx + side * rad, ty);
                else {
                    const ex = edge - side * 78, len = Math.hypot(ex - tx, ly - ty);
                    const px = (tx + (ex - tx) / len * rad).toFixed(1), py = (ty + (ly - ty) / len * rad).toFixed(1);
                    lead(`M${edge},${ly} H${ex} L${px},${py}`, px, py);
                }
                y += h + 18;
            });
            return y;
        };
        panels.push({ title: 'Schouder links', ids: ['lt', 'lb'], x: LEFT_X, y: 62, h: panelH(2) });
        panels.push({ title: 'Schouder rechts', ids: ['rt', 'rb'], x: RIGHT_X, y: 62, h: panelH(2) });
        lead(`M${LEFT_X + PANEL_W},113 H${mx(742)}`, mx(742), 113);
        lead(`M${RIGHT_X},113 H742`, 742, 113);
        const stickL = ['Linker stick', STICK_ROWS('ls'), 'ls'], dpad = ['D-pad', ['du', 'dr', 'dd', 'dl'], 'dpad'];
        const yL = column(LEFT_X, -1, off ? [stickL, dpad] : [dpad, stickL]);
        const yR = column(RIGHT_X, 1, [['Knoppen', ['ftop', 'fright', 'fbottom', 'fleft'], 'face'], ['Rechter stick', STICK_ROWS('rs'), 'rs']]);
        const cIds = spec.center.map(b => b.id), cy = 486, ch = panelH(cIds.length);
        panels.push({ title: 'Midden', ids: cIds, x: CX - PANEL_W / 2, y: cy, h: ch });
        const br = spec.lead.bracket;
        leaders.push(`<path class="leader" d="M${CX},${cy} V${spec.lead.end}${br ? ` M${br[0]},${br[2]} V${br[3]} H${br[1]} V${br[2]}` : ''}"/>` +
            (br ? '' : `<circle class="leader-end" cx="${CX}" cy="${spec.lead.end}" r="3"/>`));
        return { drawing, leaders: leaders.join(''), markAt, stands, panels, bottom: Math.max(cy + ch, yL - 18, yR - 18) };
    }
    return { key: spec.key, label: spec.label, notes: spec.notes || null, controls, scene, keyboard: null };
}

// ── mouse and keyboard ───────────────────────────────────────────────────────
const KEY_CODES = {
    Esc: 0x29, F1: 0x3a, F2: 0x3b, F3: 0x3c, F4: 0x3d, F5: 0x3e, F6: 0x3f, F7: 0x40, F8: 0x41, F9: 0x42, F10: 0x43, F11: 0x44, F12: 0x45,
    '`': 0x35, 1: 0x1e, 2: 0x1f, 3: 0x20, 4: 0x21, 5: 0x22, 6: 0x23, 7: 0x24, 8: 0x25, 9: 0x26, 0: 0x27, '-': 0x2d, '=': 0x2e, Backspace: 0x2a,
    Tab: 0x2b, '[': 0x2f, ']': 0x30, '\\': 0x31, Caps: 0x39, ';': 0x33, "'": 0x34, Enter: 0x28,
    Shift: 0xe1, ',': 0x36, '.': 0x37, '/': 0x38, 'Shift rechts': 0xe5,
    Ctrl: 0xe0, Win: 0xe3, Alt: 0xe2, Spatie: 0x2c, 'Alt rechts': 0xe6, 'Ctrl rechts': 0xe4, '←': 0x50, '↑': 0x52, '↓': 0x51, '→': 0x4f,
};
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((ch, i) => { KEY_CODES[ch] = 4 + i; });
const KB_ROWS = [
    ['Esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', ['Backspace', 2]],
    [['Tab', 1.5], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', ['\\', 1.5]],
    [['Caps', 1.8], 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", ['Enter', 2.2]],
    [['Shift', 2.3], 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', ['Shift', 2.7, 'Shift rechts']],
    [['Ctrl', 1.4], ['Win', 1.3], ['Alt', 1.3], ['Spatie', 4.3], ['Alt', 1.3, 'Alt rechts'], ['Ctrl', 1.4, 'Ctrl rechts'], '←', '↑', '↓', '→'],
].map(r => r.map(k => {
    const [g, w, full] = Array.isArray(k) ? k : [k, 1];
    const name = full || g;
    return { g, w, id: 'k' + KEY_CODES[name].toString(16), name: 'Toets ' + name, usage: keyUsage(KEY_CODES[name]) };
}));
export const keyName = usage => {
    const k = KB_ROWS.flat().find(x => x.usage === usage);
    return k ? k.name : null;
};

function buildMouse(label) {
    const rel = (g, name, u, sign, speed) => ({ g, name, kind: 'rel', sign, speed, range: speed >= 100 ? [50, 2000] : [1, 50], targets: [{ u }] });
    const VSCROLL = '0x00010038', HSCROLL = '0x000c0238';
    // Defaults follow HID Remapper's own examples where there is one: 500 for cursor keys
    // ("arrows act as mouse"), 25 and a dead zone of 10 for a stick ("gamepad-to-mouse adapter").
    // Speeds: a button moves `speed` thousandths of a pixel (or scroll notch) per millisecond;
    // a joystick at full tilt moves 0.128 * speed pixels per millisecond (scroll: a hundredth of that).
    const joy = (name, speed, targets) => ({ g: 'Joy', name, kind: 'expr', speed, dz: 10240, range: [2, 60], targets });
    const controls = {
        cj: joy('Cursor met joystick', 25, [{ u: LX, ax: 0 }, { u: LY, ax: 1 }]),
        sj: joy('Scrollen met joystick', 12, [{ u: VSCROLL, ax: 1, pre: -10 }]),
        mb1: button('L', 'Linkermuisknop', 1), mb3: button('M', 'Middelste knop (wiel)', 3), mb2: button('R', 'Rechtermuisknop', 2),
        mb5: button('▲', 'Zijknop vooruit', 5), mb4: button('▼', 'Zijknop terug', 4),
        su: rel('↑', 'Scrollen omhoog', VSCROLL, 1, 10), sd: rel('↓', 'Scrollen omlaag', VSCROLL, -1, 10),
        sl: rel('←', 'Scrollen naar links', HSCROLL, -1, 10), sr: rel('→', 'Scrollen naar rechts', HSCROLL, 1, 10),
        cl: rel('←', 'Cursor naar links', LX, -1, 500), cr: rel('→', 'Cursor naar rechts', LX, 1, 500),
        cu: rel('↑', 'Cursor omhoog', LY, -1, 500), cd: rel('↓', 'Cursor omlaag', LY, 1, 500),
    };
    KB_ROWS.flat().forEach(k => { controls[k.id] = usageButton(k.g, k.name, k.usage); });

    function scene() {
        const c = controls;
        const hit = (id, inner) => `<g class="pad-hit" data-id="${id}" tabindex="0" role="button" aria-label="${esc(c[id].name)}">${inner}</g>`;
        const mirror = inner => `<g transform="translate(${2 * CX},0) scale(-1,1)">${inner}</g>`;
        const text = (x, y, t, fs) => `<text class="pad-text" x="${x}" y="${y}" font-size="${fs}">${esc(t)}</text>`;
        const HALF = 'M590,110 C640,110 660,150 660,200 L660,330 C660,376 632,400 590,400';
        const BTN = '<path class="pad-part" d="M590,110 C640,110 660,150 660,200 L660,236 L590,236 Z"/>';
        const tri = d => `<path class="pad-part" d="${d}"/>`;
        const pad = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>`;
        const drawing = [
            hit('mb5', '<rect class="pad-back" x="508" y="250" width="24" height="34" rx="8"/>'),
            hit('mb4', '<rect class="pad-back" x="508" y="290" width="24" height="34" rx="8"/>'),
            `<path class="pad-body" d="${HALF} Z"/>`, mirror(`<path class="pad-body" d="${HALF} Z"/>`),
            hit('mb2', BTN + text(640, 196, 'R', 14)), hit('mb1', mirror(BTN) + text(540, 196, 'L', 14)),
            `<path class="pad-outline" d="${HALF}"/>`, mirror(`<path class="pad-outline" d="${HALF}"/>`),
            hit('su', pad(578, 122, 24, 20) + tri('M590,126 l9,12 h-18 Z')), hit('sd', pad(578, 214, 24, 20) + tri('M590,230 l9,-12 h-18 Z')),
            hit('sl', pad(554, 166, 20, 24) + tri('M558,178 l12,-9 v18 Z')), hit('sr', pad(606, 166, 20, 24) + tri('M622,178 l-12,-9 v18 Z')),
            hit('mb3', '<rect class="pad-well" x="578" y="150" width="24" height="56" rx="12"/><rect class="pad-part" x="584" y="160" width="12" height="36" rx="6"/>'),
            hit('cl', pad(701, 304, 26, 32) + tri('M705,320 l16,-12 v24 Z')), hit('cr', pad(763, 304, 26, 32) + tri('M785,320 l-16,-12 v24 Z')),
            hit('cu', pad(729, 276, 32, 26) + tri('M745,280 l12,16 h-24 Z')), hit('cd', pad(729, 338, 32, 26) + tri('M745,360 l12,-16 h-24 Z')),
            hit('cj', '<circle class="pad-part" cx="745" cy="320" r="9"/>'),
        ].join('');
        const markAt = {
            mb1: [552, 214], mb2: [628, 214], mb3: [606, 154], mb5: [510, 252], mb4: [510, 322],
            su: [602, 126], sd: [602, 232], sl: [556, 166], sr: [626, 166],
            cl: [707, 306], cr: [790, 306], cu: [760, 280], cd: [760, 362], cj: [754, 311],
        };
        const L = (d, ex, ey) => `<path class="leader" d="${d}"/><circle class="leader-end" cx="${ex}" cy="${ey}" r="3"/>`;
        const leaders = [
            L(`M${LEFT_X + PANEL_W},150 H548`, 548, 150), L(`M${LEFT_X + PANEL_W},287 H508`, 508, 287),
            L(`M${RIGHT_X},178 H626`, 626, 178), L(`M${RIGHT_X},320 H789`, 789, 320),
        ].join('');
        const panels = [
            { title: 'Knoppen', ids: ['mb1', 'mb3', 'mb2'], x: LEFT_X, y: 82, h: panelH(3) },
            { title: 'Zijknoppen', ids: ['mb5', 'mb4'], x: LEFT_X, y: 236, h: panelH(2) },
            { title: 'Scrollen', ids: ['sj', 'su', 'sd', 'sl', 'sr'], x: RIGHT_X, y: 62, h: panelH(5) },
            { title: 'Cursor bewegen', ids: ['cj', 'cu', 'cd', 'cl', 'cr'], x: RIGHT_X, y: 278, h: panelH(5) },
        ];
        return { drawing, leaders, markAt, stands: {}, panels, bottom: 278 + panelH(5) };
    }
    return { key: 'mouse', label, notes: null, controls, scene, keyboard: KB_ROWS };
}

// descriptor number (the firmware's "emulated device type") -> device
export const DEVICES = {
    0: buildMouse('Muis + toetsenbord'),
    1: buildMouse('Muis (absoluut) + toetsenbord'),
    2: buildPad(PAD_SPECS[2]),
    3: buildPad(PAD_SPECS[3]),
    4: buildPad(PAD_SPECS[4]),
    5: buildPad(PAD_SPECS[5]),
};
export const DEVICE_ORDER = [5, 3, 2, 4, 0, 1];
