// TechRemap - how the screen's idea of "this control is driven by that input on
// this layer" maps onto HID Remapper's flat list of mappings. No DOM in here.
//
// A control is something on the device the PC sees (a button, a stick, a
// direction of a stick, a mouse movement). Each mapping in the config says
// "source -> target on these layers". The rules that make layers pleasant:
//
//  - An assignment made on layer 1 (index 0) is the base. It also applies on
//    the other layers, except where the same input was given another job.
//  - An assignment made on another layer applies there only, and on that layer
//    it replaces what the input does on the base.
//
// The mappings stay the source of truth; nothing here is stored separately,
// so the result can always be saved to, and read back from, the device.

export const NLAYERS = 4;
export const LAYER_HOLD_PAGE = 0xfff10000;   // active while held, or toggled when "sticky"
export const LAYER_GOTO_PAGE = 0xfffc0000;   // TechRemap firmware: go to a layer and stay

export const hex = n => '0x' + (n >>> 0).toString(16).padStart(8, '0');
const page = u => parseInt(u, 16) >>> 16;
const low = u => parseInt(u, 16) & 0xffff;

// ── inputs ───────────────────────────────────────────────────────────────────
const STICK_PAIRS = [['0x00010030', '0x00010031'], ['0x00010032', '0x00010035'], ['0x00010033', '0x00010034']];

export function isAnalog(usage) {
    const p = page(usage), l = low(usage);
    return (p === 0x0001 && l >= 0x30 && l <= 0x38) || (p === 0x0002 && (l === 0xc4 || l === 0xc5)) || p === 0xfff8;
}
// [x, y] of the stick this axis belongs to, or null
export const stickPair = usage => STICK_PAIRS.find(p => p.includes(usage)) || null;

// ── joystick -> cursor/scroll ────────────────────────────────────────────────
// A stick rests at 128, so it cannot drive a relative output directly. The
// firmware needs an expression: centre the axis, ignore a dead zone, scale.
// (Same recipe as HID Remapper's "gamepad-to-mouse adapter" example. Numbers
// in expressions are thousandths: -128000 is -128.)
const EXPR_PAGE = 0xfff3;
const STICK_EXPR = /^(0x[0-9a-f]{8}) input_state -128000 add dup abs (\d+) gt mul (?:(-?\d+) mul )?(\d+) mul$/;
export function parseStickExpr(text) {
    const m = STICK_EXPR.exec((text || '').trim().replace(/\s+/g, ' '));
    return m ? { axis: m[1], dz: Number(m[2]), pre: m[3] === undefined ? null : Number(m[3]), speed: Number(m[4]) } : null;
}
const stickExprText = (axis, dz, pre, speed) =>
    `${axis} input_state -128000 add dup abs ${dz} gt mul ${pre === null ? '' : pre + ' mul '}${speed} mul`;
const exprUsage = i => hex((EXPR_PAGE << 16) | (i + 1));
function exprOf(cfg, usage) {
    const i = low(usage) - 1;
    return page(usage) === EXPR_PAGE && cfg.expressions && i >= 0 && i < cfg.expressions.length ? parseStickExpr(cfg.expressions[i]) : null;
}
// Expression slot holding exactly this text; made if `create`. Returns its usage or null.
function exprSlot(cfg, text, create) {
    let i = cfg.expressions.findIndex(e => (e || '').trim() === text);
    if (i < 0 && create) {
        i = cfg.expressions.findIndex(e => !(e || '').trim());
        if (i >= 0) cfg.expressions[i] = text;
    }
    return i < 0 ? null : exprUsage(i);
}
// Drop joystick expressions nothing points at any more.
function sweepExpressions(cfg) {
    (cfg.expressions || []).forEach((e, i) => {
        if (parseStickExpr(e) && !cfg.mappings.some(m => m.source_usage === exprUsage(i))) cfg.expressions[i] = '';
    });
}

// ── config housekeeping ──────────────────────────────────────────────────────
// The firmware treats an empty layer list as "all layers"; make that explicit.
export function normalize(cfg) {
    for (const m of cfg.mappings) {
        m.layers = (m.layers.length ? m.layers : [0, 1, 2, 3]).filter(l => l < NLAYERS).sort();
    }
    cfg.unmapped_passthrough_layers = cfg.unmapped_passthrough_layers.filter(l => l < NLAYERS);
    cfg.expressions = cfg.expressions || [];
    return cfg;
}
const newMapping = (source, target, scaling, layers) => ({
    source_usage: source, target_usage: target, scaling, layers: layers.slice().sort(),
    sticky: false, tap: false, hold: false, source_port: 0, target_port: 0,
});
const isSwitch = m => [LAYER_HOLD_PAGE >>> 16, LAYER_GOTO_PAGE >>> 16].includes(page(m.target_usage));
const isBase = m => m.layers.includes(0);
function strip(cfg, m, layer) {
    m.layers = m.layers.filter(l => l !== layer);
    if (!m.layers.length) cfg.mappings.splice(cfg.mappings.indexOf(m), 1);
}
function addLayer(m, layer) {
    if (!m.layers.includes(layer)) m.layers = m.layers.concat(layer).sort();
}

// ── controls ─────────────────────────────────────────────────────────────────
// kind 'button': targets [{ u, d, a }]   d/a = scaling for a digital/analog input
// kind 'stick' : axes [x, y]             driven by a joystick, axis for axis
// kind 'dir'   : targets [{ u, d }]      one direction of a stick, from a button
// kind 'rel'   : targets [{ u }], sign   one direction of cursor/scroll, from a button
// kind 'expr'  : targets [{ u, ax, pre }] cursor/scroll from a joystick, through an expression
const DIR_MID = 128000;

function entries(control) {
    return control.kind === 'stick' ? control.axes.map(u => ({ u })) : control.targets;
}
const isDigital = u => !isAnalog(u) && page(u) !== EXPR_PAGE;
function matches(cfg, control, i, m) {
    const e = entries(control)[i];
    if (m.target_usage !== e.u) return false;
    switch (control.kind) {
        case 'stick': return isAnalog(m.source_usage);
        case 'dir': return isDigital(m.source_usage) && (m.scaling >= DIR_MID) === (e.d >= DIR_MID);
        case 'rel': return isDigital(m.source_usage) && Math.sign(m.scaling) === control.sign;
        case 'expr': { const x = exprOf(cfg, m.source_usage); return !!x && x.pre === (e.pre ?? null); }
        default: return true;
    }
}
const own = (cfg, control, i) => cfg.mappings.filter(m => matches(cfg, control, i, m));

// What kind of input a control takes. Returns null if `source` fits, else a reason.
export function rejects(control, source, cfg) {
    if ((control.kind === 'stick' || control.kind === 'expr') && !isAnalog(source)) return 'stick-needs-stick';
    if (control.kind === 'expr') {
        const texts = exprTexts(cfg, control, source);
        const missing = new Set(texts.filter(t => !exprSlot(cfg, t, false))).size;
        if (missing > cfg.expressions.filter(e => !(e || '').trim()).length) return 'no-slot';
    }
    if ((control.kind === 'dir' || control.kind === 'rel') && isAnalog(source)) return 'needs-button';
    return null;
}
function exprTexts(cfg, control, source) {
    const pair = stickPair(source) || [source, source];
    const sp = speed(cfg, control) ?? control.speed, dz = deadzone(cfg, control) ?? control.dz;
    return control.targets.map(e => stickExprText(pair[e.ax], dz, e.pre ?? null, sp));
}
// The inputs that feed each target of the control when `source` is assigned.
function sourcesFor(cfg, control, source, create = true) {
    if (control.kind === 'expr') return exprTexts(cfg, control, source).map(t => exprSlot(cfg, t, create));
    if (control.kind !== 'stick') return entries(control).map(() => source);
    const pair = stickPair(source);
    return pair ? pair : [source];       // an odd axis only drives X
}
function scalingFor(control, i, source) {
    const e = entries(control)[i];
    if (control.kind === 'stick' || control.kind === 'expr') return 1000;
    if (control.kind === 'rel') return control.sign * (control.speed || 500);
    if (control.kind === 'dir') return e.d;
    return isAnalog(source) ? (e.a ?? 1000) : (e.d ?? 1000);
}
// Label input for a mapping of this control: sticks are named by their X axis.
function canonical(cfg, control, m) {
    if (control.kind !== 'stick' && control.kind !== 'expr') return m.source_usage;
    const axis = control.kind === 'expr' ? exprOf(cfg, m.source_usage).axis : m.source_usage;
    const pair = stickPair(axis);
    return pair ? pair[0] : axis;
}

// Which physical input a source is. The two axes of a stick count as one input,
// also when they come in through a joystick expression, so a stick does one thing per layer.
function inputKey(cfg, usage) {
    const x = exprOf(cfg, usage), pair = stickPair(x ? x.axis : usage);
    return pair ? 'stick:' + pair[0] : usage;
}
const sameInput = (cfg, a, b) => a === b || inputKey(cfg, a) === inputKey(cfg, b);

// Has this input been given a job of its own on `layer` (not inherited from the base)?
const hasOwnJob = (cfg, source, layer) =>
    cfg.mappings.some(m => sameInput(cfg, m.source_usage, source) && m.layers.includes(layer) && !isBase(m));

// Give the input's base jobs back to `layer` once it no longer has a job of its own there.
function restoreBase(cfg, source, layer) {
    if (hasOwnJob(cfg, source, layer)) return;
    for (const m of cfg.mappings) {
        if (!sameInput(cfg, m.source_usage, source) || !isBase(m) || isSwitch(m)) continue;
        const taken = cfg.mappings.some(o => o !== m && o.target_usage === m.target_usage && o.layers.includes(layer) && !isBase(o));
        if (!taken) addLayer(m, layer);
    }
}

// ── reading ──────────────────────────────────────────────────────────────────
// Inputs driving the control: [{ layer, source, base }]. A base assignment is
// reported once, on layer 0; other layers only list what was set there.
export function chips(cfg, control) {
    const out = [];
    for (const m of own(cfg, control, 0)) {
        const source = canonical(cfg, control, m);
        if (isBase(m)) out.push({ layer: 0, source, base: true });
        else for (const l of m.layers) out.push({ layer: l, source, base: false });
    }
    return out.sort((a, b) => a.layer - b.layer);
}

// What the control does on one layer, for the detail panel:
//   { state: 'set', sources }             assigned on this layer
//   { state: 'same', sources }            follows layer 1
//   { state: 'moved', source, to }        layer 1's input does something else here (to = target usage)
//   { state: 'off', source }              layer 1's input was switched off here
//   { state: 'empty' }                    nothing assigned at all
export function layerState(cfg, control, layer) {
    const mine = own(cfg, control, 0);
    const here = mine.filter(m => m.layers.includes(layer));
    const set = here.filter(m => layer === 0 || !isBase(m));
    if (set.length) return { state: 'set', sources: set.map(m => canonical(cfg, control, m)) };
    if (here.length) return { state: 'same', sources: here.map(m => canonical(cfg, control, m)) };
    const base = mine.find(isBase);
    if (!base || layer === 0) return { state: 'empty' };
    const other = cfg.mappings.find(m => sameInput(cfg, m.source_usage, base.source_usage) && m.layers.includes(layer) && !isBase(m));
    return other ? { state: 'moved', source: canonical(cfg, control, base), to: other.target_usage, toMapping: other }
                 : { state: 'off', source: canonical(cfg, control, base) };
}

// Other targets this input also drives on the layer (to tell the user after assigning).
export function alsoDrives(cfg, control, source, layer) {
    const mineTargets = new Set(entries(control).map(e => e.u));
    if (control.kind === 'expr') return [];
    const srcs = new Set(sourcesFor(cfg, control, source, false));
    return cfg.mappings.filter(m => srcs.has(m.source_usage) && m.layers.includes(layer) && !mineTargets.has(m.target_usage));
}

// ── writing ──────────────────────────────────────────────────────────────────
// With `add`, the input joins the ones already driving the control on that layer
// (two people, or two switches, for the same button) instead of replacing them.
export function assign(cfg, control, layer, source, add = false) {
    const srcs = sourcesFor(cfg, control, source);
    srcs.forEach((src, i) => {
        if (i >= entries(control).length || src === null) return;
        const target = entries(control)[i].u;
        const mine = own(cfg, control, i);
        if (add && mine.some(m => m.source_usage === src && m.layers.includes(layer) && (layer > 0 || isBase(m)))) return;
        if (layer === 0) {
            if (!add) mine.filter(isBase).forEach(m => cfg.mappings.splice(cfg.mappings.indexOf(m), 1));
            const layers = [0];
            for (let l = 1; l < NLAYERS; l++) {
                const takenHere = own(cfg, control, i).some(m => m.layers.includes(l) && !isBase(m));
                if (!takenHere && !hasOwnJob(cfg, src, l)) layers.push(l);
            }
            cfg.mappings.push(newMapping(src, target, scalingFor(control, i, src), layers));
        } else {
            const replaced = add ? [] : mine.filter(m => m.layers.includes(layer) && !isBase(m)).map(m => m.source_usage);
            if (!add) mine.filter(m => m.layers.includes(layer)).forEach(m => strip(cfg, m, layer));
            // on this layer the input now does this instead of its base jobs
            cfg.mappings.filter(m => sameInput(cfg, m.source_usage, src) && isBase(m) && m.layers.includes(layer) && !isSwitch(m))
                .forEach(m => strip(cfg, m, layer));
            cfg.mappings.push(newMapping(src, target, scalingFor(control, i, src), [layer]));
            replaced.forEach(s => restoreBase(cfg, s, layer));
        }
    });
    sweepExpressions(cfg);
}

// Take one input away from the control on this layer, leaving the others.
export function removeSource(cfg, control, layer, source) {
    sourcesFor(cfg, control, source, false).forEach((src, i) => {
        if (i >= entries(control).length || src === null) return;
        const mine = own(cfg, control, i).filter(m => m.source_usage === src);
        if (layer === 0) mine.filter(isBase).forEach(m => cfg.mappings.splice(cfg.mappings.indexOf(m), 1));
        else {
            mine.filter(m => m.layers.includes(layer) && !isBase(m)).forEach(m => strip(cfg, m, layer));
            restoreBase(cfg, src, layer);
        }
    });
    sweepExpressions(cfg);
}

// Nothing drives the control on this layer. On layer 1 that removes the base assignment.
export function clear(cfg, control, layer) {
    entries(control).forEach((_, i) => {
        const mine = own(cfg, control, i);
        if (layer === 0) {
            mine.filter(isBase).forEach(m => cfg.mappings.splice(cfg.mappings.indexOf(m), 1));
        } else {
            const freed = mine.filter(m => m.layers.includes(layer) && !isBase(m)).map(m => m.source_usage);
            mine.filter(m => m.layers.includes(layer)).forEach(m => strip(cfg, m, layer));
            freed.forEach(s => restoreBase(cfg, s, layer));
        }
    });
    sweepExpressions(cfg);
}

// The layer follows layer 1 again.
export function inherit(cfg, control, layer) {
    if (layer === 0) return;
    entries(control).forEach((_, i) => {
        const mine = own(cfg, control, i);
        const freed = mine.filter(m => m.layers.includes(layer) && !isBase(m)).map(m => m.source_usage);
        mine.filter(m => m.layers.includes(layer) && !isBase(m)).forEach(m => strip(cfg, m, layer));
        freed.forEach(s => restoreBase(cfg, s, layer));
        own(cfg, control, i).filter(isBase).forEach(m => { if (!hasOwnJob(cfg, m.source_usage, layer)) addLayer(m, layer); });
    });
}

// Cursor/scroll speed of a 'rel' or 'expr' control, or null if unassigned.
export function speed(cfg, control) {
    const m = own(cfg, control, 0)[0];
    if (!m) return null;
    return control.kind === 'expr' ? exprOf(cfg, m.source_usage).speed : Math.abs(m.scaling);
}
export function deadzone(cfg, control) {
    const m = control.kind === 'expr' ? own(cfg, control, 0)[0] : null;
    return m ? exprOf(cfg, m.source_usage).dz : null;
}
// Rewrite the control's joystick expressions with other numbers.
function retune(cfg, control, change) {
    entries(control).forEach((_, i) => own(cfg, control, i).forEach(m => {
        const x = { ...exprOf(cfg, m.source_usage), ...change };
        m.source_usage = exprSlot(cfg, stickExprText(x.axis, x.dz, x.pre, x.speed), true) || m.source_usage;
    }));
    sweepExpressions(cfg);
}
export function setSpeed(cfg, control, value) {
    control.speed = value;
    if (control.kind === 'expr') retune(cfg, control, { speed: value });
    else own(cfg, control, 0).forEach(m => { m.scaling = control.sign * value; });
}
export function setDeadzone(cfg, control, value) {
    control.dz = value;
    retune(cfg, control, { dz: value });
}

// ── layer switching ──────────────────────────────────────────────────────────
// [{ type: 'hold' | 'toggle' | 'goto', to, from: [layers], source, mapping }]
export function switches(cfg) {
    return cfg.mappings.filter(isSwitch).map(m => ({
        type: page(m.target_usage) === (LAYER_GOTO_PAGE >>> 16) ? 'goto' : (m.sticky ? 'toggle' : 'hold'),
        to: low(m.target_usage), from: m.layers, source: m.source_usage, mapping: m,
    })).filter(s => s.to < NLAYERS);
}
export function addSwitch(cfg, type, from, to, source) {
    const target = hex((type === 'goto' ? LAYER_GOTO_PAGE : LAYER_HOLD_PAGE) | to);
    const dup = cfg.mappings.find(m => m.target_usage === target && m.source_usage === source && m.layers.includes(from));
    if (dup) return dup;
    if (from > 0) {
        cfg.mappings.filter(m => sameInput(cfg, m.source_usage, source) && isBase(m) && m.layers.includes(from) && !isSwitch(m))
            .forEach(m => strip(cfg, m, from));
    }
    const m = newMapping(source, target, 1000, [from]);
    m.sticky = type === 'toggle';
    cfg.mappings.push(m);
    return m;
}
export function removeSwitch(cfg, mapping) {
    const i = cfg.mappings.indexOf(mapping);
    if (i < 0) return;
    cfg.mappings.splice(i, 1);
    mapping.layers.filter(l => l > 0).forEach(l => restoreBase(cfg, mapping.source_usage, l));
}

// Layers you can end up on with "go to" and cannot leave again: [layer, ...]
export function strandedLayers(cfg) {
    const sw = switches(cfg);
    // from a layer you stand on, the layers you can briefly be on by holding/toggling
    const around = l => {
        const seen = new Set([l]);
        let grew = true;
        while (grew) {
            grew = false;
            for (const s of sw) if (s.type !== 'goto' && s.from.some(f => seen.has(f)) && !seen.has(s.to)) { seen.add(s.to); grew = true; }
        }
        return seen;
    };
    const next = l => {
        const at = around(l);
        return new Set(sw.filter(s => s.type === 'goto' && s.from.some(f => at.has(f))).map(s => s.to));
    };
    const reach = start => {
        const seen = new Set([start]), todo = [start];
        while (todo.length) for (const n of next(todo.pop())) if (!seen.has(n)) { seen.add(n); todo.push(n); }
        return seen;
    };
    return [...reach(0)].filter(l => l !== 0 && !reach(l).has(0)).sort();
}
