// TechRemap - HID Usage Definitions
// All HID usage codes with human-readable names, categories, and controller layout info

// ─── Visual Controller Layout ────────────────────────────────────────────────
// Maps visual element IDs (in the SVG) to usage codes and display metadata
export const CONTROLLER_VISUAL = {
    'btn-lt':      { label: 'Left Trigger (LT)',     icon: 'LT',  group: 'trigger', usages: ['0x00090007', '0x00010033'], isAnalog: true },
    'btn-rt':      { label: 'Right Trigger (RT)',    icon: 'RT',  group: 'trigger', usages: ['0x00090008', '0x00010034'], isAnalog: true },
    'btn-lb':      { label: 'Left Bumper (LB)',      icon: 'LB',  group: 'shoulder', usages: ['0x00090005'] },
    'btn-rb':      { label: 'Right Bumper (RB)',     icon: 'RB',  group: 'shoulder', usages: ['0x00090006'] },
    'dpad-up':     { label: 'D-Pad Up',              icon: '↑',   group: 'dpad',    usages: ['0xfff90003'] },
    'dpad-down':   { label: 'D-Pad Down',            icon: '↓',   group: 'dpad',    usages: ['0xfff90004'] },
    'dpad-left':   { label: 'D-Pad Left',            icon: '←',   group: 'dpad',    usages: ['0xfff90001'] },
    'dpad-right':  { label: 'D-Pad Right',           icon: '→',   group: 'dpad',    usages: ['0xfff90002'] },
    'btn-y':       { label: 'Y Button',              icon: 'Y',   group: 'face',    usages: ['0x00090004'], color: 'yellow', xboxLabel: 'Y', psLabel: '△' },
    'btn-a':       { label: 'A Button',              icon: 'A',   group: 'face',    usages: ['0x00090002'], color: 'green',  xboxLabel: 'A', psLabel: '✕' },
    'btn-x':       { label: 'X Button',              icon: 'X',   group: 'face',    usages: ['0x00090001'], color: 'blue',   xboxLabel: 'X', psLabel: '□' },
    'btn-b':       { label: 'B Button',              icon: 'B',   group: 'face',    usages: ['0x00090003'], color: 'red',    xboxLabel: 'B', psLabel: '○' },
    'btn-back':    { label: 'Back / View',           icon: '⊲',   group: 'center',  usages: ['0x00090009'] },
    'btn-home':    { label: 'Home / Guide',          icon: '⊙',   group: 'center',  usages: ['0x0009000d'] },
    'btn-start':   { label: 'Start / Menu',          icon: '⊳',   group: 'center',  usages: ['0x0009000a'] },
    'stick-left':  { label: 'Left Stick',            icon: 'L',   group: 'stick',   usages: ['0x00010030', '0x00010031', '0x0009000b'], isStick: true, axisX: '0x00010030', axisY: '0x00010031', btnUsage: '0x0009000b' },
    'stick-right': { label: 'Right Stick',           icon: 'R',   group: 'stick',   usages: ['0x00010032', '0x00010035', '0x0009000c'], isStick: true, axisX: '0x00010032', axisY: '0x00010035', btnUsage: '0x0009000c' },
};

// ─── All Named Usages ─────────────────────────────────────────────────────────
// Comprehensive map: usage code → display info
export const NAMED_USAGES = {
    // Gamepad face buttons
    '0x00090001': { name: 'West (X / □)',           category: 'gamepad', type: 'button' },
    '0x00090002': { name: 'South (A / ✕)',          category: 'gamepad', type: 'button' },
    '0x00090003': { name: 'East (B / ○)',           category: 'gamepad', type: 'button' },
    '0x00090004': { name: 'North (Y / △)',          category: 'gamepad', type: 'button' },
    '0x00090005': { name: 'Left Bumper (LB / L1)',  category: 'gamepad', type: 'button' },
    '0x00090006': { name: 'Right Bumper (RB / R1)', category: 'gamepad', type: 'button' },
    '0x00090007': { name: 'Left Trigger (LT / L2)', category: 'gamepad', type: 'button' },
    '0x00090008': { name: 'Right Trigger (RT / R2)',category: 'gamepad', type: 'button' },
    '0x00090009': { name: 'Select / Back / View',   category: 'gamepad', type: 'button' },
    '0x0009000a': { name: 'Start / Menu',           category: 'gamepad', type: 'button' },
    '0x0009000b': { name: 'Left Stick Click (L3)',  category: 'gamepad', type: 'button' },
    '0x0009000c': { name: 'Right Stick Click (R3)', category: 'gamepad', type: 'button' },
    '0x0009000d': { name: 'Home / Guide',           category: 'gamepad', type: 'button' },
    '0x0009000e': { name: 'Button 14',              category: 'gamepad', type: 'button' },
    '0x0009000f': { name: 'Button 15',              category: 'gamepad', type: 'button' },
    '0x00090010': { name: 'Button 16',              category: 'gamepad', type: 'button' },
    // D-pad
    '0xfff90001': { name: 'D-Pad Left',             category: 'gamepad', type: 'button' },
    '0xfff90002': { name: 'D-Pad Right',            category: 'gamepad', type: 'button' },
    '0xfff90003': { name: 'D-Pad Up',               category: 'gamepad', type: 'button' },
    '0xfff90004': { name: 'D-Pad Down',             category: 'gamepad', type: 'button' },
    // Gamepad axes
    '0x00010030': { name: 'Left Stick X',           category: 'gamepad', type: 'axis' },
    '0x00010031': { name: 'Left Stick Y',           category: 'gamepad', type: 'axis' },
    '0x00010032': { name: 'Right Stick X',          category: 'gamepad', type: 'axis' },
    '0x00010035': { name: 'Right Stick Y',          category: 'gamepad', type: 'axis' },
    '0x00010033': { name: 'Left Trigger Axis (L2)', category: 'gamepad', type: 'axis' },
    '0x00010034': { name: 'Right Trigger Axis (R2)',category: 'gamepad', type: 'axis' },
    // Mouse
    '0x00090001_mouse': { name: 'Left Mouse Button',  category: 'mouse', type: 'button', realCode: '0x00090001' },
    '0x00090002_mouse': { name: 'Right Mouse Button', category: 'mouse', type: 'button', realCode: '0x00090002' },
    '0x00090003_mouse': { name: 'Middle Mouse Button',category: 'mouse', type: 'button', realCode: '0x00090003' },
    '0x00090004_mouse': { name: 'Mouse Back Button',  category: 'mouse', type: 'button', realCode: '0x00090004' },
    '0x00090005_mouse': { name: 'Mouse Forward Button',category: 'mouse', type: 'button', realCode: '0x00090005' },
    '0x00010030_mouse': { name: 'Cursor X',           category: 'mouse', type: 'axis',   realCode: '0x00010030' },
    '0x00010031_mouse': { name: 'Cursor Y',           category: 'mouse', type: 'axis',   realCode: '0x00010031' },
    '0x00010038': { name: 'Scroll Wheel (V)',         category: 'mouse', type: 'axis' },
    '0x000c0238': { name: 'Scroll Wheel (H)',         category: 'mouse', type: 'axis' },
    '0x000200c5': { name: 'Brake',                   category: 'mouse', type: 'axis' },
    '0x000200c4': { name: 'Accelerator',             category: 'mouse', type: 'axis' },
    // Keyboard modifiers
    '0x000700e0': { name: 'Left Control',            category: 'keyboard', type: 'button' },
    '0x000700e1': { name: 'Left Shift',              category: 'keyboard', type: 'button' },
    '0x000700e2': { name: 'Left Alt',                category: 'keyboard', type: 'button' },
    '0x000700e3': { name: 'Left GUI (Win/⌘)',        category: 'keyboard', type: 'button' },
    '0x000700e4': { name: 'Right Control',           category: 'keyboard', type: 'button' },
    '0x000700e5': { name: 'Right Shift',             category: 'keyboard', type: 'button' },
    '0x000700e6': { name: 'Right Alt',               category: 'keyboard', type: 'button' },
    '0x000700e7': { name: 'Right GUI',               category: 'keyboard', type: 'button' },
    // Keyboard letters
    '0x00070004': { name: 'A', category: 'keyboard', type: 'button' },
    '0x00070005': { name: 'B', category: 'keyboard', type: 'button' },
    '0x00070006': { name: 'C', category: 'keyboard', type: 'button' },
    '0x00070007': { name: 'D', category: 'keyboard', type: 'button' },
    '0x00070008': { name: 'E', category: 'keyboard', type: 'button' },
    '0x00070009': { name: 'F', category: 'keyboard', type: 'button' },
    '0x0007000a': { name: 'G', category: 'keyboard', type: 'button' },
    '0x0007000b': { name: 'H', category: 'keyboard', type: 'button' },
    '0x0007000c': { name: 'I', category: 'keyboard', type: 'button' },
    '0x0007000d': { name: 'J', category: 'keyboard', type: 'button' },
    '0x0007000e': { name: 'K', category: 'keyboard', type: 'button' },
    '0x0007000f': { name: 'L', category: 'keyboard', type: 'button' },
    '0x00070010': { name: 'M', category: 'keyboard', type: 'button' },
    '0x00070011': { name: 'N', category: 'keyboard', type: 'button' },
    '0x00070012': { name: 'O', category: 'keyboard', type: 'button' },
    '0x00070013': { name: 'P', category: 'keyboard', type: 'button' },
    '0x00070014': { name: 'Q', category: 'keyboard', type: 'button' },
    '0x00070015': { name: 'R', category: 'keyboard', type: 'button' },
    '0x00070016': { name: 'S', category: 'keyboard', type: 'button' },
    '0x00070017': { name: 'T', category: 'keyboard', type: 'button' },
    '0x00070018': { name: 'U', category: 'keyboard', type: 'button' },
    '0x00070019': { name: 'V', category: 'keyboard', type: 'button' },
    '0x0007001a': { name: 'W', category: 'keyboard', type: 'button' },
    '0x0007001b': { name: 'X', category: 'keyboard', type: 'button' },
    '0x0007001c': { name: 'Y', category: 'keyboard', type: 'button' },
    '0x0007001d': { name: 'Z', category: 'keyboard', type: 'button' },
    // Keyboard numbers
    '0x0007001e': { name: '1 / !', category: 'keyboard', type: 'button' },
    '0x0007001f': { name: '2 / @', category: 'keyboard', type: 'button' },
    '0x00070020': { name: '3 / #', category: 'keyboard', type: 'button' },
    '0x00070021': { name: '4 / $', category: 'keyboard', type: 'button' },
    '0x00070022': { name: '5 / %', category: 'keyboard', type: 'button' },
    '0x00070023': { name: '6 / ^', category: 'keyboard', type: 'button' },
    '0x00070024': { name: '7 / &', category: 'keyboard', type: 'button' },
    '0x00070025': { name: '8 / *', category: 'keyboard', type: 'button' },
    '0x00070026': { name: '9 / (', category: 'keyboard', type: 'button' },
    '0x00070027': { name: '0 / )', category: 'keyboard', type: 'button' },
    // Special keys
    '0x00070028': { name: 'Enter',      category: 'keyboard', type: 'button' },
    '0x00070029': { name: 'Escape',     category: 'keyboard', type: 'button' },
    '0x0007002a': { name: 'Backspace',  category: 'keyboard', type: 'button' },
    '0x0007002b': { name: 'Tab',        category: 'keyboard', type: 'button' },
    '0x0007002c': { name: 'Space',      category: 'keyboard', type: 'button' },
    '0x0007002d': { name: '- / _',      category: 'keyboard', type: 'button' },
    '0x0007002e': { name: '= / +',      category: 'keyboard', type: 'button' },
    '0x0007002f': { name: '[ / {',      category: 'keyboard', type: 'button' },
    '0x00070030': { name: '] / }',      category: 'keyboard', type: 'button' },
    '0x00070031': { name: '\\ / |',     category: 'keyboard', type: 'button' },
    '0x00070033': { name: '; / :',      category: 'keyboard', type: 'button' },
    '0x00070034': { name: "' / \"",     category: 'keyboard', type: 'button' },
    '0x00070035': { name: '` / ~',      category: 'keyboard', type: 'button' },
    '0x00070036': { name: ', / <',      category: 'keyboard', type: 'button' },
    '0x00070037': { name: '. / >',      category: 'keyboard', type: 'button' },
    '0x00070038': { name: '/ / ?',      category: 'keyboard', type: 'button' },
    '0x00070039': { name: 'Caps Lock',  category: 'keyboard', type: 'button' },
    // Function keys
    '0x0007003a': { name: 'F1',  category: 'keyboard', type: 'button' },
    '0x0007003b': { name: 'F2',  category: 'keyboard', type: 'button' },
    '0x0007003c': { name: 'F3',  category: 'keyboard', type: 'button' },
    '0x0007003d': { name: 'F4',  category: 'keyboard', type: 'button' },
    '0x0007003e': { name: 'F5',  category: 'keyboard', type: 'button' },
    '0x0007003f': { name: 'F6',  category: 'keyboard', type: 'button' },
    '0x00070040': { name: 'F7',  category: 'keyboard', type: 'button' },
    '0x00070041': { name: 'F8',  category: 'keyboard', type: 'button' },
    '0x00070042': { name: 'F9',  category: 'keyboard', type: 'button' },
    '0x00070043': { name: 'F10', category: 'keyboard', type: 'button' },
    '0x00070044': { name: 'F11', category: 'keyboard', type: 'button' },
    '0x00070045': { name: 'F12', category: 'keyboard', type: 'button' },
    // Navigation
    '0x00070049': { name: 'Insert',     category: 'keyboard', type: 'button' },
    '0x0007004a': { name: 'Home',       category: 'keyboard', type: 'button' },
    '0x0007004b': { name: 'Page Up',    category: 'keyboard', type: 'button' },
    '0x0007004c': { name: 'Delete',     category: 'keyboard', type: 'button' },
    '0x0007004d': { name: 'End',        category: 'keyboard', type: 'button' },
    '0x0007004e': { name: 'Page Down',  category: 'keyboard', type: 'button' },
    '0x0007004f': { name: 'Arrow Right',category: 'keyboard', type: 'button' },
    '0x00070050': { name: 'Arrow Left', category: 'keyboard', type: 'button' },
    '0x00070051': { name: 'Arrow Down', category: 'keyboard', type: 'button' },
    '0x00070052': { name: 'Arrow Up',   category: 'keyboard', type: 'button' },
    '0x00070046': { name: 'Print Screen',category: 'keyboard', type: 'button' },
    '0x00070047': { name: 'Scroll Lock',category: 'keyboard', type: 'button' },
    '0x00070048': { name: 'Pause',      category: 'keyboard', type: 'button' },
    // Numpad
    '0x00070053': { name: 'Num Lock',   category: 'keyboard', type: 'button' },
    '0x00070054': { name: 'Numpad /',   category: 'keyboard', type: 'button' },
    '0x00070055': { name: 'Numpad *',   category: 'keyboard', type: 'button' },
    '0x00070056': { name: 'Numpad -',   category: 'keyboard', type: 'button' },
    '0x00070057': { name: 'Numpad +',   category: 'keyboard', type: 'button' },
    '0x00070058': { name: 'Numpad Enter',category: 'keyboard', type: 'button' },
    '0x00070059': { name: 'Numpad 1',   category: 'keyboard', type: 'button' },
    '0x0007005a': { name: 'Numpad 2',   category: 'keyboard', type: 'button' },
    '0x0007005b': { name: 'Numpad 3',   category: 'keyboard', type: 'button' },
    '0x0007005c': { name: 'Numpad 4',   category: 'keyboard', type: 'button' },
    '0x0007005d': { name: 'Numpad 5',   category: 'keyboard', type: 'button' },
    '0x0007005e': { name: 'Numpad 6',   category: 'keyboard', type: 'button' },
    '0x0007005f': { name: 'Numpad 7',   category: 'keyboard', type: 'button' },
    '0x00070060': { name: 'Numpad 8',   category: 'keyboard', type: 'button' },
    '0x00070061': { name: 'Numpad 9',   category: 'keyboard', type: 'button' },
    '0x00070062': { name: 'Numpad 0',   category: 'keyboard', type: 'button' },
    '0x00070063': { name: 'Numpad .',   category: 'keyboard', type: 'button' },
    // Media keys
    '0x000c00b5': { name: 'Next Track',     category: 'media', type: 'button' },
    '0x000c00b6': { name: 'Prev Track',     category: 'media', type: 'button' },
    '0x000c00b7': { name: 'Stop',           category: 'media', type: 'button' },
    '0x000c00cd': { name: 'Play / Pause',   category: 'media', type: 'button' },
    '0x000c00e2': { name: 'Mute',           category: 'media', type: 'button' },
    '0x000c00e9': { name: 'Volume Up',      category: 'media', type: 'button' },
    '0x000c00ea': { name: 'Volume Down',    category: 'media', type: 'button' },
    // Layer control (special)
    '0xfff10000': { name: 'Layer 1 (toggle)',   category: 'layer', type: 'button' },
    '0xfff10001': { name: 'Layer 2 (toggle)',   category: 'layer', type: 'button' },
    '0xfff10002': { name: 'Layer 3 (toggle)',   category: 'layer', type: 'button' },
    '0xfff10003': { name: 'Layer 4 (toggle)',   category: 'layer', type: 'button' },
    '0xfff10004': { name: 'Layer 5 (toggle)',   category: 'layer', type: 'button' },
    '0xfff10005': { name: 'Layer 6 (toggle)',   category: 'layer', type: 'button' },
    '0xfff10006': { name: 'Layer 7 (toggle)',   category: 'layer', type: 'button' },
    '0xfff10007': { name: 'Layer 8 (toggle)',   category: 'layer', type: 'button' },
    // HID Remapper vendor-defined source codes (page 0xfff3)
    '0xfff30001': { name: 'Device Custom Axis 1', category: 'special', type: 'axis' },
    '0xfff30002': { name: 'Device Custom Axis 2', category: 'special', type: 'axis' },
    '0xfff30003': { name: 'Device Custom Axis 3', category: 'special', type: 'axis' },
    '0xfff30004': { name: 'Device Custom Axis 4', category: 'special', type: 'axis' },
    // Sport Controls (page 0x04)
    '0x00040009': { name: 'Joystick (Sport Controls)', category: 'gamepad', type: 'axis' },
    // Game Controls (page 0x05)
    '0x00050009': { name: 'Select (Game Controls)',    category: 'gamepad', type: 'button' },
    // Nothing
    '0x00000000': { name: 'Nothing (block)',     category: 'special', type: 'button' },
};

// Groups of source usages for the picker UI
export const SOURCE_GROUPS = [
    {
        id: 'gamepad',
        label: 'Gamepad',
        icon: '🎮',
        codes: [
            '0x00090002','0x00090003','0x00090001','0x00090004',
            '0x00090005','0x00090006','0x00090007','0x00090008',
            '0x00090009','0x0009000a','0x0009000b','0x0009000c','0x0009000d',
            '0xfff90003','0xfff90004','0xfff90001','0xfff90002',
            '0x00010030','0x00010031','0x00010032','0x00010035',
            '0x00010033','0x00010034',
        ]
    },
    {
        id: 'keyboard',
        label: 'Keyboard',
        icon: '⌨️',
        codes: [
            '0x000700e0','0x000700e1','0x000700e2','0x000700e3',
            '0x000700e4','0x000700e5','0x000700e6','0x000700e7',
            '0x00070004','0x00070005','0x00070006','0x00070007','0x00070008',
            '0x00070009','0x0007000a','0x0007000b','0x0007000c','0x0007000d',
            '0x0007000e','0x0007000f','0x00070010','0x00070011','0x00070012',
            '0x00070013','0x00070014','0x00070015','0x00070016','0x00070017',
            '0x00070018','0x00070019','0x0007001a','0x0007001b','0x0007001c','0x0007001d',
            '0x0007001e','0x0007001f','0x00070020','0x00070021','0x00070022',
            '0x00070023','0x00070024','0x00070025','0x00070026','0x00070027',
            '0x00070028','0x00070029','0x0007002a','0x0007002b','0x0007002c',
            '0x0007002d','0x0007002e','0x0007002f','0x00070030','0x00070033',
            '0x00070034','0x00070035','0x00070036','0x00070037','0x00070038',
            '0x00070039','0x0007003a','0x0007003b','0x0007003c','0x0007003d',
            '0x0007003e','0x0007003f','0x00070040','0x00070041','0x00070042',
            '0x00070043','0x00070044','0x00070045',
            '0x00070049','0x0007004a','0x0007004b','0x0007004c','0x0007004d',
            '0x0007004e','0x0007004f','0x00070050','0x00070051','0x00070052',
        ]
    },
    {
        id: 'mouse',
        label: 'Mouse',
        icon: '🖱️',
        codes: [
            '0x00090001','0x00090002','0x00090003',
            '0x00010030','0x00010031','0x00010038','0x000c0238',
        ]
    },
    {
        id: 'media',
        label: 'Media',
        icon: '🎵',
        codes: [
            '0x000c00b5','0x000c00b6','0x000c00b7','0x000c00cd',
            '0x000c00e2','0x000c00e9','0x000c00ea',
        ]
    },
    {
        id: 'layer',
        label: 'Layer Control',
        icon: '⬡',
        codes: [
            '0xfff10000','0xfff10001','0xfff10002','0xfff10003',
            '0xfff10004','0xfff10005','0xfff10006','0xfff10007',
        ]
    },
    {
        id: 'special',
        label: 'Special',
        icon: '⚙️',
        codes: ['0x00000000', '0xfff30001', '0xfff30002', '0xfff30003', '0xfff30004'],
    },
];

// Default layer LED colors (0x00RRGGBB) — matches firmware globals.cc defaults
export const DEFAULT_LAYER_COLORS = [
    0x00000040,  // Layer 0: Blue
    0x00004000,  // Layer 1: Green
    0x00400000,  // Layer 2: Red
    0x00404000,  // Layer 3: Yellow/Gold
];

// Convert 0x00RRGGBB firmware color to CSS hex string
export function firmwareColorToCSS(color) {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    // Scale up from 0x40 max (64) to 255 for display
    const scale = c => Math.min(255, Math.round(c * 4));
    return `#${scale(r).toString(16).padStart(2,'0')}${scale(g).toString(16).padStart(2,'0')}${scale(b).toString(16).padStart(2,'0')}`;
}

// Convert CSS hex string to 0x00RRGGBB firmware color (scaled down to ~0x40 range)
export function cssColorToFirmware(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const scale = c => Math.round(c / 4);
    return (scale(r) << 16) | (scale(g) << 8) | scale(b);
}

// Get usage name, falling back to the hex code
export function getUsageName(code) {
    const u = NAMED_USAGES[code];
    return u ? u.name : code;
}

// Find which visual controller element represents a given usage code
export function getVisualIdForUsage(code) {
    for (const [id, info] of Object.entries(CONTROLLER_VISUAL)) {
        if (info.usages.includes(code)) return id;
    }
    return null;
}
