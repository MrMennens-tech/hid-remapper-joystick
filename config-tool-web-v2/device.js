// TechRemap - WebHID Device Communication
// Adapted from the original config-tool-web/code.js by @jfedor2

import crc32 from './crc.js';
import { DEFAULT_LAYER_COLORS } from './usages.js';

// ─── Protocol Constants ───────────────────────────────────────────────────────
const REPORT_ID_CONFIG  = 100;
const REPORT_ID_MONITOR = 101;
const CONFIG_SIZE       = 32;
const CONFIG_VERSION    = 18;
const VENDOR_ID         = 0xCAFE;
const PRODUCT_ID        = 0xBAF2;

const STICKY_FLAG               = 1 << 0;
const TAP_FLAG                  = 1 << 1;
const HOLD_FLAG                 = 1 << 2;
const IGNORE_AUTH_DEV_INPUTS_FLAG = 1 << 4;
const GPIO_OUTPUT_MODE_FLAG     = 1 << 5;
const NORMALIZE_GAMEPAD_INPUTS_FLAG = 1 << 6;

const NLAYERS   = 8;
const NMACROS   = 32;
const NEXPRESSIONS = 8;
const MACRO_ITEMS_IN_PACKET = 6;

// Commands
const RESET_INTO_BOOTSEL  = 1;
const SET_CONFIG          = 2;
const GET_CONFIG          = 3;
const CLEAR_MAPPING       = 4;
const ADD_MAPPING         = 5;
const GET_MAPPING         = 6;
const PERSIST_CONFIG      = 7;
const GET_OUR_USAGES      = 8;
const GET_THEIR_USAGES    = 9;
const SUSPEND             = 10;
const RESUME              = 11;
const PAIR_NEW_DEVICE     = 12;
const CLEAR_BONDS         = 13;
const FLASH_B_SIDE        = 14;
const CLEAR_MACROS        = 15;
const APPEND_TO_MACRO     = 16;
const GET_MACRO           = 17;
const CLEAR_EXPRESSIONS   = 19;
const APPEND_TO_EXPRESSION = 20;
const GET_EXPRESSION      = 21;
const SET_MONITOR_ENABLED = 22;
const CLEAR_QUIRKS        = 23;
const ADD_QUIRK           = 24;
const GET_QUIRK           = 25;

const PERSIST_CONFIG_SUCCESS        = 1;
const PERSIST_CONFIG_CONFIG_TOO_BIG = 2;

// Type tags for serialization
const UINT8  = Symbol('uint8');
const UINT16 = Symbol('uint16');
const UINT32 = Symbol('uint32');
const INT32  = Symbol('int32');

// Expression opcodes
const ops = {
    "PUSH":0,"PUSH_USAGE":1,"INPUT_STATE":2,"ADD":3,"MUL":4,"EQ":5,"TIME":6,
    "MOD":7,"GT":8,"NOT":9,"INPUT_STATE_BINARY":10,"ABS":11,"DUP":12,"SIN":13,
    "COS":14,"DEBUG":15,"AUTO_REPEAT":16,"RELU":17,"CLAMP":18,"SCALING":19,
    "LAYER_STATE":20,"STICKY_STATE":21,"TAP_STATE":22,"HOLD_STATE":23,
    "BITWISE_OR":24,"BITWISE_AND":25,"BITWISE_NOT":26,"PREV_INPUT_STATE":27,
    "PREV_INPUT_STATE_BINARY":28,"STORE":29,"RECALL":30,"SQRT":31,"ATAN2":32,
    "ROUND":33,"PORT":34,"DPAD":35,"EOL":36,"INPUT_STATE_FP32":37,
    "PREV_INPUT_STATE_FP32":38,"MIN":39,"MAX":40,"IFTE":41,"DIV":42,"SWAP":43,
    "MONITOR":44,"SIGN":45,"SUB":46,"PRINT_IF":47,"TIME_SEC":48,"LT":49,
    "PLUGGED_IN":50,"INPUT_STATE_SCALED":51,"PREV_INPUT_STATE_SCALED":52,
    "DEADZONE":53,"DEADZONE2":54,
};
const opcodes = Object.fromEntries(Object.entries(ops).map(([k,v]) => [v,k]));

// ─── Default Config ────────────────────────────────────────────────────────────
export function makeDefaultConfig() {
    return {
        version: CONFIG_VERSION,
        unmapped_passthrough_layers: [0,1,2,3,4,5,6,7],
        partial_scroll_timeout: 1000000,
        tap_hold_threshold: 200000,
        gpio_debounce_time_ms: 5,
        interval_override: 0,
        our_descriptor_number: 0,
        ignore_auth_dev_inputs: false,
        macro_entry_duration: 1,
        gpio_output_mode: 0,
        input_labels: 0,
        normalize_gamepad_inputs: true,
        mappings: [],
        macros: Array.from({length: NMACROS}, () => []),
        expressions: Array(NEXPRESSIONS).fill(''),
        quirks: [],
        layer_colors: [...DEFAULT_LAYER_COLORS],  // WS2812 LED colors per layer
    };
}

// ─── Device State ─────────────────────────────────────────────────────────────
export let device        = null;
export let busy          = false;
let monitorEnabled       = false;
let monitorCallback      = null;
let extra_usages         = { source: [], target: [] };

export function isConnected() { return device !== null && device.opened; }
export function getExtraUsages() { return extra_usages; }

// ─── CRC helpers ──────────────────────────────────────────────────────────────
function addCRC(dataview) {
    dataview.setUint32(CONFIG_SIZE - 4, crc32(dataview, CONFIG_SIZE - 4), true);
}
function checkCRC(dataview) {
    if (dataview.getUint32(CONFIG_SIZE - 4, true) !== crc32(dataview, CONFIG_SIZE - 4)) {
        throw new Error('CRC error in device response.');
    }
}

// ─── Bit helpers ──────────────────────────────────────────────────────────────
function maskToLayerList(mask) {
    const list = [];
    for (let i = 0; i < NLAYERS; i++) {
        if (mask & (1 << i)) list.push(i);
    }
    return list;
}
function layerListToMask(list) {
    return list.reduce((m, i) => m | (1 << i), 0);
}

// ─── Feature Report I/O ──────────────────────────────────────────────────────
async function sendFeatureCommand(command, fields = [], version = CONFIG_VERSION) {
    let buffer   = new ArrayBuffer(CONFIG_SIZE);
    let dataview = new DataView(buffer);
    dataview.setUint8(0, version);
    dataview.setUint8(1, command);
    let pos = 2;
    for (const [type, value] of fields) {
        switch (type) {
            case UINT8:  dataview.setUint8(pos, value);           pos += 1; break;
            case UINT16: dataview.setUint16(pos, value, true);    pos += 2; break;
            case UINT32: dataview.setUint32(pos, value, true);    pos += 4; break;
            case INT32:  dataview.setInt32(pos, value, true);     pos += 4; break;
        }
    }
    addCRC(dataview);
    await device.sendFeatureReport(REPORT_ID_CONFIG, buffer);
}

async function readConfigFeature(fields = []) {
    let attempts = 10;
    let delay    = 2;
    let data;
    while (true) {
        const raw = await device.receiveFeatureReport(REPORT_ID_CONFIG);
        data = new DataView(raw.buffer, 1);
        if (data.byteLength > 0) break;
        if (--attempts > 0) {
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
        } else {
            throw new Error('Timed out reading device response.');
        }
    }
    checkCRC(data);
    let ret = [];
    let pos = 0;
    for (const type of fields) {
        switch (type) {
            case UINT8:  ret.push(data.getUint8(pos));           pos += 1; break;
            case UINT16: ret.push(data.getUint16(pos, true));    pos += 2; break;
            case UINT32: ret.push(data.getUint32(pos, true));    pos += 4; break;
            case INT32:  ret.push(data.getInt32(pos, true));     pos += 4; break;
        }
    }
    return ret;
}

// ─── Version Check ────────────────────────────────────────────────────────────
async function checkDeviceVersion() {
    for (const v of [CONFIG_VERSION,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2]) {
        await sendFeatureCommand(GET_CONFIG, [], v);
        const [received] = await readConfigFeature([UINT8]);
        if (received === v) {
            if (v === CONFIG_VERSION) return true;
            throw new Error(`Device uses config version ${v}, but this tool needs version ${CONFIG_VERSION}. Please flash the latest firmware.`);
        }
    }
    throw new Error('Could not determine device config version.');
}

// ─── Connect / Disconnect ─────────────────────────────────────────────────────
export async function connectDevice() {
    if (busy) throw new Error('Device is busy.');
    busy = true;
    try {
        const devices = await navigator.hid.requestDevice({
            filters: [{ usagePage: 0xFF00, usage: 0x0020 }]
        });
        const iface = devices?.find(d => d.collections.some(c => c.usagePage === 0xFF00));
        if (!iface) throw new Error('No compatible HID Remapper device found.');

        device = iface;
        if (!device.opened) {
            await device.open().catch(err => {
                throw new Error(`${err}\nOn Linux: give yourself read/write access to /dev/hidraw*`);
            });
        }
        if (!device.opened) throw new Error('Failed to open device.');

        await checkDeviceVersion();
        device.addEventListener('inputreport', handleInputReport);
        extra_usages = await getDeviceUsages();
        return { name: device.productName, isBluetoothVariant: device.productName.includes('Bluetooth') };
    } finally {
        busy = false;
    }
}

export async function disconnectDevice() {
    if (!device) return;
    device.removeEventListener('inputreport', handleInputReport);
    await device.close().catch(() => {});
    device = null;
}

// ─── Input Monitor ────────────────────────────────────────────────────────────
function handleInputReport(event) {
    if (!monitorCallback) return;
    const data = new DataView(event.data.buffer);
    // Monitor report format: [usage_hi(2), usage_lo(2), hub_port(1), value(4)] * n
    let offset = 0;
    while (offset + 9 <= data.byteLength) {
        const usageHi  = data.getUint16(offset, true);     offset += 2;
        const usageLo  = data.getUint16(offset, true);     offset += 2;
        const hubPort  = data.getUint8(offset);             offset += 1;
        const value    = data.getInt32(offset, true);       offset += 4;
        const usage    = '0x' + ((usageHi << 16 | usageLo) >>> 0).toString(16).padStart(8, '0');
        if (usage !== '0x00000000') {
            monitorCallback({ usage, hubPort, value });
        }
    }
}

export async function enableMonitor(callback) {
    monitorCallback = callback;
    monitorEnabled  = true;
    if (device) await sendFeatureCommand(SET_MONITOR_ENABLED, [[UINT8, 1]]);
}

export async function disableMonitor() {
    monitorCallback = null;
    monitorEnabled  = false;
    if (device) await sendFeatureCommand(SET_MONITOR_ENABLED, [[UINT8, 0]]);
}

// ─── Load Config From Device ──────────────────────────────────────────────────
export async function loadConfig() {
    if (!device) throw new Error('No device connected.');
    if (busy) throw new Error('Device is busy.');
    busy = true;
    try {
        await sendFeatureCommand(GET_CONFIG);
        const configFields = [UINT8,UINT8,UINT8,UINT32,UINT16,UINT32,UINT32,UINT8,UINT32,UINT8,UINT8,UINT8,UINT16];
        const res = await readConfigFeature(configFields);

        const version          = res[0];
        const flags            = res[1];
        const mappingCount     = res[4];
        const quirkCount       = res[12];

        const cfg = makeDefaultConfig();
        cfg.version                  = version;
        cfg.unmapped_passthrough_layers = maskToLayerList(res[2]);
        cfg.partial_scroll_timeout   = res[3];
        cfg.tap_hold_threshold       = res[7];
        cfg.gpio_debounce_time_ms    = res[9];
        cfg.interval_override        = res[8];
        cfg.our_descriptor_number    = res[10];
        cfg.ignore_auth_dev_inputs   = !!(flags & IGNORE_AUTH_DEV_INPUTS_FLAG);
        cfg.gpio_output_mode         = (flags & GPIO_OUTPUT_MODE_FLAG) ? 1 : 0;
        cfg.normalize_gamepad_inputs = !!(flags & NORMALIZE_GAMEPAD_INPUTS_FLAG);
        cfg.macro_entry_duration     = res[11] + 1;

        // Mappings
        cfg.mappings = [];
        for (let i = 0; i < mappingCount; i++) {
            await sendFeatureCommand(GET_MAPPING, [[UINT32, i]]);
            const [target_usage, source_usage, scaling, layer_mask, mapping_flags, hub_ports] =
                await readConfigFeature([UINT32,UINT32,INT32,UINT8,UINT8,UINT8]);
            cfg.mappings.push({
                source_usage: '0x' + source_usage.toString(16).padStart(8,'0'),
                target_usage: '0x' + target_usage.toString(16).padStart(8,'0'),
                scaling,
                layers: maskToLayerList(layer_mask),
                sticky: !!(mapping_flags & STICKY_FLAG),
                tap:    !!(mapping_flags & TAP_FLAG),
                hold:   !!(mapping_flags & HOLD_FLAG),
                source_port: hub_ports & 0x0F,
                target_port: (hub_ports >> 4) & 0x0F,
            });
        }

        // Macros
        cfg.macros = [];
        for (let mi = 0; mi < NMACROS; mi++) {
            let macro = [];
            let i = 0;
            let keepGoing = true;
            while (keepGoing) {
                await sendFeatureCommand(GET_MACRO, [[UINT32, mi],[UINT32, i]]);
                const fields = await readConfigFeature([UINT8,UINT32,UINT32,UINT32,UINT32,UINT32,UINT32]);
                const nitems = fields[0];
                const usages = fields.slice(1);
                if (nitems < MACRO_ITEMS_IN_PACKET) keepGoing = false;
                if (macro.length === 0 && nitems > 0) macro = [[]];
                for (const u of usages.slice(0, nitems)) {
                    if (u === 0) macro.push([]);
                    else macro.at(-1).push('0x' + u.toString(16).padStart(8,'0'));
                }
                i += MACRO_ITEMS_IN_PACKET;
            }
            cfg.macros.push(macro);
        }

        // Expressions
        cfg.expressions = [];
        for (let ei = 0; ei < NEXPRESSIONS; ei++) {
            let expression = [];
            let i = 0;
            while (true) {
                await sendFeatureCommand(GET_EXPRESSION, [[UINT32,ei],[UINT32,i]]);
                const fields = await readConfigFeature(Array(28).fill(UINT8));
                const nelems = fields[0];
                if (nelems === 0) break;
                let elems = fields.slice(1);
                for (let j = 0; j < nelems; j++) {
                    const elem = elems[0]; elems = elems.slice(1);
                    if ([ops.PUSH, ops.PUSH_USAGE].includes(elem)) {
                        const val = elems[3]<<24 | elems[2]<<16 | elems[1]<<8 | elems[0];
                        elems = elems.slice(4);
                        expression.push(elem === ops.PUSH ? val.toString() : '0x'+(val>>>0).toString(16).padStart(8,'0'));
                    } else {
                        expression.push(opcodes[elem].toLowerCase());
                    }
                }
                i += nelems;
            }
            cfg.expressions.push(expression.join(' '));
        }

        // Quirks
        cfg.quirks = [];
        for (let qi = 0; qi < quirkCount; qi++) {
            await sendFeatureCommand(GET_QUIRK, [[UINT32, qi]]);
            const [vid,pid,iface,reportId,usage,bitpos,sizeFlags] =
                await readConfigFeature([UINT16,UINT16,UINT8,UINT8,UINT32,UINT16,UINT8]);
            cfg.quirks.push({
                vendor_id: '0x'+vid.toString(16).padStart(4,'0'),
                product_id: '0x'+pid.toString(16).padStart(4,'0'),
                interface: iface, report_id: reportId,
                usage: '0x'+usage.toString(16).padStart(8,'0'),
                bitpos, size: sizeFlags & 0x3F,
                relative: !!(sizeFlags & 0x80),
                signed:   !!(sizeFlags & 0x40),
            });
        }

        return cfg;
    } finally {
        busy = false;
    }
}

// ─── Save Config To Device ────────────────────────────────────────────────────
export async function saveConfig(cfg) {
    if (!device) throw new Error('No device connected.');
    if (busy) throw new Error('Device is busy.');
    busy = true;
    try {
        await sendFeatureCommand(SUSPEND);

        const flags = (cfg.ignore_auth_dev_inputs  ? IGNORE_AUTH_DEV_INPUTS_FLAG     : 0) |
                      (cfg.gpio_output_mode         ? GPIO_OUTPUT_MODE_FLAG            : 0) |
                      (cfg.normalize_gamepad_inputs ? NORMALIZE_GAMEPAD_INPUTS_FLAG    : 0);
        await sendFeatureCommand(SET_CONFIG, [
            [UINT8,  flags],
            [UINT8,  layerListToMask(cfg.unmapped_passthrough_layers)],
            [UINT32, cfg.partial_scroll_timeout],
            [UINT8,  cfg.interval_override],
            [UINT32, cfg.tap_hold_threshold],
            [UINT8,  cfg.gpio_debounce_time_ms],
            [UINT8,  cfg.our_descriptor_number],
            [UINT8,  cfg.macro_entry_duration - 1],
        ]);

        await sendFeatureCommand(CLEAR_MAPPING);
        for (const m of cfg.mappings) {
            await sendFeatureCommand(ADD_MAPPING, [
                [UINT32, parseInt(m.target_usage, 16)],
                [UINT32, parseInt(m.source_usage, 16)],
                [INT32,  m.scaling],
                [UINT8,  layerListToMask(m.layers)],
                [UINT8,  (m.sticky ? STICKY_FLAG : 0) | (m.tap ? TAP_FLAG : 0) | (m.hold ? HOLD_FLAG : 0)],
                [UINT8,  ((m.target_port & 0x0F) << 4) | (m.source_port & 0x0F)],
            ]);
        }

        await sendFeatureCommand(CLEAR_MACROS);
        for (let mi = 0; mi < cfg.macros.length && mi < NMACROS; mi++) {
            const macro = cfg.macros[mi];
            const flat = macro.map(x => x.concat(['0x00'])).flat().slice(0, -1);
            for (let i = 0; i < flat.length; i += MACRO_ITEMS_IN_PACKET) {
                const chunk = flat.slice(i, i + MACRO_ITEMS_IN_PACKET);
                await sendFeatureCommand(APPEND_TO_MACRO,
                    [[UINT8, mi],[UINT8, chunk.length]].concat(chunk.map(x => [UINT32, parseInt(x,16)])));
            }
        }

        await sendFeatureCommand(CLEAR_EXPRESSIONS);
        for (let ei = 0; ei < cfg.expressions.length && ei < NEXPRESSIONS; ei++) {
            let elems = exprToElems(cfg.expressions[ei]);
            while (elems.length > 0) {
                let bytesLeft = 24, items = [], nelems = 0;
                while (elems.length > 0 && bytesLeft > 0) {
                    const e = elems[0];
                    if ([ops.PUSH, ops.PUSH_USAGE].includes(e[0])) {
                        if (bytesLeft >= 5) {
                            items.push([UINT8, e[0]], [UINT32, e[1]>>>0]);
                            bytesLeft -= 5; nelems++; elems = elems.slice(1);
                        } else break;
                    } else {
                        items.push([UINT8, e[0]]);
                        bytesLeft--; nelems++; elems = elems.slice(1);
                    }
                }
                await sendFeatureCommand(APPEND_TO_EXPRESSION,
                    [[UINT8, ei],[UINT8, nelems]].concat(items));
            }
        }

        await sendFeatureCommand(CLEAR_QUIRKS);
        for (const q of cfg.quirks) {
            const sf = (q.size & 0x3F) | (q.relative ? 0x80 : 0) | (q.signed ? 0x40 : 0);
            await sendFeatureCommand(ADD_QUIRK, [
                [UINT16, parseInt(q.vendor_id,16)], [UINT16, parseInt(q.product_id,16)],
                [UINT8, q.interface], [UINT8, q.report_id],
                [UINT32, parseInt(q.usage,16)], [UINT16, q.bitpos], [UINT8, sf],
            ]);
        }

        await sendFeatureCommand(PERSIST_CONFIG);
        const [returnCode] = await readConfigFeature([UINT8]);
        await sendFeatureCommand(RESUME);

        if (returnCode === PERSIST_CONFIG_CONFIG_TOO_BIG) {
            throw new Error('Configuration is too large to save. Remove some mappings or macros.');
        }
        if (returnCode !== PERSIST_CONFIG_SUCCESS) {
            throw new Error(`Unknown save response code: ${returnCode}`);
        }
        return true;
    } finally {
        busy = false;
    }
}

// ─── Get Device Usages ────────────────────────────────────────────────────────
async function doGetUsages(command, rleCount) {
    const set = new Set();
    for (let i = 0; i < rleCount; i += 3) {
        await sendFeatureCommand(command, [[UINT32, i]]);
        const fields = await readConfigFeature([UINT32,UINT32,UINT32,UINT32,UINT32,UINT32]);
        for (let j = 0; j < 3; j++) {
            const usage = fields[2*j], count = fields[2*j+1];
            if (usage !== 0) {
                for (let k = 0; k < count; k++) {
                    set.add('0x' + (usage + k).toString(16).padStart(8,'0'));
                }
            }
        }
    }
    return Array.from(set).sort();
}

async function getDeviceUsages() {
    await sendFeatureCommand(GET_CONFIG);
    const fields = [UINT8,UINT8,UINT8,UINT32,UINT16,UINT32,UINT32,UINT8,UINT32,UINT8,UINT8,UINT8,UINT16];
    const res = await readConfigFeature(fields);
    return {
        target: await doGetUsages(GET_OUR_USAGES,  res[5]),
        source: await doGetUsages(GET_THEIR_USAGES, res[6]),
    };
}

// ─── Expression Utilities ─────────────────────────────────────────────────────
const EXPR_RE = /((?:\/\*.*?\*\/)?)((?:(?!\/\*).)*)/gs;

function exprToElems(expr) {
    const tokens = [];
    for (const match of expr.matchAll(EXPR_RE)) {
        const part = match[2].trim();
        if (!part) continue;
        for (const tok of part.split(/\s+/)) {
            if (!tok) continue;
            if (tok.toLowerCase().startsWith('0x')) {
                tokens.push([ops.PUSH_USAGE, parseInt(tok, 16)]);
            } else if (/^-?[0-9]/.test(tok)) {
                tokens.push([ops.PUSH, Math.round(parseFloat(tok) * 1000)]);
            } else if (tok === '\n' || tok.toLowerCase() === 'eol') {
                tokens.push([ops.EOL]);
            } else {
                const op = ops[tok.toUpperCase()];
                if (op !== undefined) tokens.push([op]);
            }
        }
    }
    return tokens;
}

// ─── JSON Import / Export ─────────────────────────────────────────────────────
export function exportConfigJSON(cfg) {
    return JSON.stringify(cfg, null, 2);
}

export function importConfigJSON(json) {
    const parsed = JSON.parse(json);
    if (!parsed.version) throw new Error('Invalid config: missing version');
    // Ensure layer_colors exists
    if (!parsed.layer_colors) parsed.layer_colors = [...DEFAULT_LAYER_COLORS];
    return parsed;
}

// ─── HID disconnect listener ──────────────────────────────────────────────────
export function onHIDDisconnect(callback) {
    if ('hid' in navigator) {
        navigator.hid.addEventListener('disconnect', (event) => {
            if (device && event.device === device) {
                device = null;
                callback();
            }
        });
    }
}

export { NLAYERS, CONFIG_VERSION };
