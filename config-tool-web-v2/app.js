// TechRemap — Main Application Logic
// by Mennens.Tech

import {
    connectDevice, disconnectDevice, loadConfig, saveConfig,
    exportConfigJSON, importConfigJSON, enableMonitor, disableMonitor,
    isConnected, onHIDDisconnect, makeDefaultConfig, NLAYERS
} from './device.js';
import {
    CONTROLLER_VISUAL, NAMED_USAGES, SOURCE_GROUPS,
    getUsageName, getVisualIdForUsage,
    firmwareColorToCSS, cssColorToFirmware, DEFAULT_LAYER_COLORS
} from './usages.js';

// ─── App State ────────────────────────────────────────────────────────────────
const state = {
    config:         makeDefaultConfig(),
    connected:      false,
    dirty:          false,
    activeTab:      'remap',
    activeLayer:    0,
    // Assignment panel
    selectedVisual: null,   // which visual element is selected (e.g. 'btn-a')
    stickSubMode:   'x',    // 'x' | 'y' | 'btn'
    // Capture mode
    capturing:      false,
    captureUsage:   null,   // target usage we're assigning a source for
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setDirty(dirty = true) {
    state.dirty = dirty;
    const disabled = !dirty || !state.connected;
    document.getElementById('save-btn').disabled = disabled;
    document.getElementById('header-save-btn').disabled = disabled;
}

function notify(message, type = 'info', duration = 3000) {
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = message;
    document.getElementById('notifications').appendChild(el);
    setTimeout(() => el.remove(), duration);
}

// Returns all mappings for a given target usage on the active layer
function getMappingsFor(targetUsage, layer = state.activeLayer) {
    return state.config.mappings.filter(m =>
        m.target_usage === targetUsage && (m.layers.length === 0 || m.layers.includes(layer))
    );
}

// Returns the primary (first) mapping for a target usage
function getPrimaryMapping(targetUsage) {
    return getMappingsFor(targetUsage)[0] || null;
}

// Returns which target usage is "active" in the assignment panel
function getActivePanelUsage() {
    const vis = state.selectedVisual;
    if (!vis) return null;
    const info = CONTROLLER_VISUAL[vis];
    if (!info) return null;
    if (info.isStick) {
        if (state.stickSubMode === 'x')   return info.axisX;
        if (state.stickSubMode === 'y')   return info.axisY;
        if (state.stickSubMode === 'btn') return info.btnUsage;
    }
    return info.usages[0];
}

// ─── Layer colour helpers ──────────────────────────────────────────────────────
function getLayerCSSColor(index) {
    const fw = state.config.layer_colors?.[index] ?? DEFAULT_LAYER_COLORS[index];
    return firmwareColorToCSS(fw);
}

function updateLayerLeds() {
    document.querySelectorAll('.layer-led').forEach((dot, i) => {
        dot.style.background = getLayerCSSColor(i);
        dot.style.boxShadow  = `0 0 6px ${getLayerCSSColor(i)}`;
    });
    document.querySelectorAll('.led-preview').forEach((dot, i) => {
        const color = getLayerCSSColor(i);
        dot.style.background = color;
        dot.style.boxShadow  = `0 0 10px ${color}`;
        dot.style.setProperty('--preview-color', color);
    });
    document.querySelectorAll('input[type="color"].led-color-input').forEach((inp, i) => {
        inp.value = getLayerCSSColor(i);
    });
}

// ─── Controller Visual ────────────────────────────────────────────────────────

function refreshControllerVisual() {
    // Update which elements show as "mapped"
    document.querySelectorAll('.pad-clickable').forEach(el => {
        const vis  = el.dataset.input;
        const info = CONTROLLER_VISUAL[vis];
        if (!info) return;
        const isMapped = info.usages.some(u => getMappingsFor(u).length > 0);
        el.classList.toggle('mapped', isMapped);
        el.classList.toggle('selected', vis === state.selectedVisual);
    });
}

function handleControllerClick(visId) {
    const info = CONTROLLER_VISUAL[visId];
    if (!info) return;

    state.selectedVisual = visId;

    // Default stick sub-mode
    if (info.isStick) state.stickSubMode = 'x';

    refreshControllerVisual();
    renderAssignPanel();
}

// ─── Assignment Panel ─────────────────────────────────────────────────────────

function renderAssignPanel() {
    const visId = state.selectedVisual;
    const emptyEl   = document.getElementById('assign-empty');
    const contentEl = document.getElementById('assign-content');

    if (!visId) {
        emptyEl.classList.remove('hidden');
        contentEl.classList.add('hidden');
        return;
    }
    emptyEl.classList.add('hidden');
    contentEl.classList.remove('hidden');

    const info       = CONTROLLER_VISUAL[visId];
    const targetUsage = getActivePanelUsage();
    const mapping    = targetUsage ? getPrimaryMapping(targetUsage) : null;

    // Header
    document.getElementById('assign-title').textContent = info.label;
    document.getElementById('assign-usage-code').textContent = targetUsage || '';

    // Stick sub-tabs
    const stickTabs = document.getElementById('stick-tabs');
    if (info.isStick) {
        stickTabs.classList.remove('hidden');
        stickTabs.querySelectorAll('.stick-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.mode === state.stickSubMode);
        });
    } else {
        stickTabs.classList.add('hidden');
    }

    // Current mapping
    const currentMappingEl = document.getElementById('current-mapping');
    const mappingNameEl    = document.getElementById('mapping-source-name');
    const removeBtnEl      = document.getElementById('remove-mapping-btn');

    if (mapping) {
        currentMappingEl.classList.add('has-mapping');
        mappingNameEl.textContent = getUsageName(mapping.source_usage);
        removeBtnEl.classList.remove('hidden');
    } else {
        currentMappingEl.classList.remove('has-mapping');
        mappingNameEl.textContent = 'Not remapped (passthrough)';
        removeBtnEl.classList.add('hidden');
    }

    // Capture button
    const captureBtn = document.getElementById('capture-btn');
    if (state.capturing && state.captureUsage === targetUsage) {
        captureBtn.classList.add('capturing');
        captureBtn.innerHTML = '<span class="capture-indicator"></span> Press a button on your device…';
    } else {
        captureBtn.classList.remove('capturing');
        captureBtn.innerHTML = '<span class="capture-indicator"></span> Capture from device';
    }

    // Axis-specific controls
    const axisControls = document.getElementById('axis-controls');
    const isAxis = NAMED_USAGES[targetUsage]?.type === 'axis';
    axisControls.classList.toggle('hidden', !isAxis);

    if (isAxis && mapping) {
        const scaling  = mapping.scaling ?? 1000;
        const deadzone = mapping.deadzone ?? 0;  // stored as % * 10

        const sensitSlider = document.getElementById('sensitivity-slider');
        const sensitVal    = document.getElementById('sensitivity-val');
        sensitSlider.value = scaling;
        sensitVal.textContent = `${(scaling / 10).toFixed(0)}%`;

        const deadzoneSlider = document.getElementById('deadzone-slider');
        const deadzoneVal    = document.getElementById('deadzone-val');
        deadzoneSlider.value = deadzone;
        deadzoneVal.textContent = `${deadzone}%`;
    }

    // Layer checkboxes
    renderLayerCheckboxes(mapping);

    // Behavior toggles
    const stickyEl = document.getElementById('toggle-sticky');
    const tapEl    = document.getElementById('toggle-tap');
    const holdEl   = document.getElementById('toggle-hold');
    stickyEl.checked = mapping?.sticky ?? false;
    tapEl.checked    = mapping?.tap    ?? false;
    holdEl.checked   = mapping?.hold   ?? false;

    // Source picker
    renderSourcePicker(mapping?.source_usage);
}

function renderLayerCheckboxes(mapping) {
    const container = document.getElementById('layer-checkboxes');
    container.innerHTML = '';
    for (let i = 0; i < NLAYERS; i++) {
        const checked = mapping?.layers.includes(i) ?? (i === state.activeLayer);
        const lbl = document.createElement('label');
        lbl.className = `layer-check ${checked ? 'checked' : ''}`;
        lbl.innerHTML = `<input type="checkbox" value="${i}" ${checked ? 'checked' : ''}> L${i + 1}`;
        lbl.querySelector('input').addEventListener('change', () => {
            lbl.classList.toggle('checked', lbl.querySelector('input').checked);
            applyCurrentMapping();
        });
        container.appendChild(lbl);
    }
}

function renderSourcePicker(currentSource) {
    const search = document.getElementById('source-search').value.toLowerCase();
    const activeCat = document.querySelector('.picker-cat.active')?.dataset.cat || 'gamepad';
    const group  = SOURCE_GROUPS.find(g => g.id === activeCat);
    if (!group) return;

    const list = document.getElementById('usage-list');
    list.innerHTML = '';

    for (const code of group.codes) {
        const usage = NAMED_USAGES[code];
        if (!usage) continue;
        if (search && !usage.name.toLowerCase().includes(search)) continue;

        const item = document.createElement('div');
        item.className = `usage-item ${code === currentSource ? 'selected' : ''}`;
        item.innerHTML = `
            <span class="usage-item-name">${usage.name}</span>
            <span class="usage-item-type ${usage.type}">${usage.type}</span>
        `;
        item.addEventListener('click', () => assignSourceUsage(code));
        list.appendChild(item);
    }

    if (list.childElementCount === 0) {
        list.innerHTML = '<div class="usage-item" style="color:var(--text-3);cursor:default">No results</div>';
    }
}

// ─── Mapping Operations ───────────────────────────────────────────────────────

function assignSourceUsage(sourceCode) {
    const targetUsage = getActivePanelUsage();
    if (!targetUsage) return;

    const layers = getSelectedLayers();
    const existingIdx = state.config.mappings.findIndex(
        m => m.target_usage === targetUsage && m.layers.some(l => layers.includes(l))
    );

    const newMapping = {
        source_usage: sourceCode,
        target_usage: targetUsage,
        scaling:      1000,
        layers,
        sticky: false,
        tap:    false,
        hold:   false,
        source_port: 0,
        target_port: 0,
    };

    if (existingIdx >= 0) {
        state.config.mappings[existingIdx] = {
            ...state.config.mappings[existingIdx],
            source_usage: sourceCode,
            layers,
        };
    } else {
        state.config.mappings.push(newMapping);
    }

    setDirty();
    refreshControllerVisual();
    renderAssignPanel();
}

function applyCurrentMapping() {
    const targetUsage = getActivePanelUsage();
    if (!targetUsage) return;

    const layers   = getSelectedLayers();
    const sticky   = document.getElementById('toggle-sticky').checked;
    const tap      = document.getElementById('toggle-tap').checked;
    const hold     = document.getElementById('toggle-hold').checked;
    const scaling  = parseInt(document.getElementById('sensitivity-slider').value, 10);
    const deadzone = parseInt(document.getElementById('deadzone-slider').value, 10);

    const existingIdx = state.config.mappings.findIndex(m => m.target_usage === targetUsage);
    if (existingIdx < 0) return;

    state.config.mappings[existingIdx] = {
        ...state.config.mappings[existingIdx],
        layers, sticky, tap, hold, scaling, deadzone,
    };
    setDirty();
}

function removeMapping() {
    const targetUsage = getActivePanelUsage();
    if (!targetUsage) return;
    state.config.mappings = state.config.mappings.filter(m => m.target_usage !== targetUsage);
    setDirty();
    refreshControllerVisual();
    renderAssignPanel();
}

function getSelectedLayers() {
    return Array.from(document.querySelectorAll('#layer-checkboxes input:checked'))
        .map(el => parseInt(el.value, 10));
}

// ─── Capture Mode ─────────────────────────────────────────────────────────────

async function startCapture() {
    if (!state.connected) { notify('Connect a device first', 'error'); return; }
    const targetUsage = getActivePanelUsage();
    if (!targetUsage) return;

    state.capturing   = true;
    state.captureUsage = targetUsage;
    renderAssignPanel();

    const startTime = Date.now();

    try {
        await enableMonitor((report) => {
            if (!state.capturing) return;
            const { usage, value } = report;
            // Skip noise
            if (Math.abs(value) < 5000) return;
            // Skip the first 200ms (debounce accidental trigger)
            if (Date.now() - startTime < 200) return;

            stopCapture();
            assignSourceUsage(usage);
            notify(`Mapped from: ${getUsageName(usage)}`, 'success');
        });
    } catch (e) {
        notify(`Capture error: ${e.message}`, 'error');
        stopCapture();
    }
}

async function stopCapture() {
    state.capturing   = false;
    state.captureUsage = null;
    try { await disableMonitor(); } catch (_) {}
    renderAssignPanel();
}

// ─── Tab Switching ────────────────────────────────────────────────────────────

function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === tabId)
    );
    document.querySelectorAll('.tab-panel').forEach(p =>
        p.classList.toggle('active', p.id === `panel-${tabId}`)
    );
    if (tabId === 'overview') renderOverviewTab();
}

// ─── Layers Tab ───────────────────────────────────────────────────────────────

function renderLayersTab() {
    // LED color cards
    const grid = document.getElementById('led-grid');
    grid.innerHTML = '';
    const names = ['Default (Layer 0)', 'Layer 1', 'Layer 2', 'Layer 3'];
    for (let i = 0; i < 4; i++) {
        const color = getLayerCSSColor(i);
        const card  = document.createElement('div');
        card.className = 'led-card';
        card.innerHTML = `
            <div class="led-card-header">
                <div class="led-preview glow" style="background:${color}; --preview-color:${color}; box-shadow:0 0 10px ${color}"></div>
                <div>
                    <div class="led-layer-name">${names[i]}</div>
                    <div class="led-layer-sub">WS2812 LED</div>
                </div>
            </div>
            <input type="color" class="color-input led-color-input" value="${color}" data-layer="${i}">
        `;
        card.querySelector('.led-color-input').addEventListener('input', (e) => {
            const fw = cssColorToFirmware(e.target.value);
            if (!state.config.layer_colors) state.config.layer_colors = [...DEFAULT_LAYER_COLORS];
            state.config.layer_colors[i] = fw;
            const preview = card.querySelector('.led-preview');
            preview.style.background = e.target.value;
            preview.style.boxShadow  = `0 0 10px ${e.target.value}`;
            // Update layer bar LEDs
            const layerDot = document.querySelectorAll('.layer-led')[i];
            if (layerDot) {
                layerDot.style.background = e.target.value;
                layerDot.style.boxShadow  = `0 0 6px ${e.target.value}`;
            }
            setDirty();
        });
        grid.appendChild(card);
    }

    // Passthrough checkboxes
    const ptGrid = document.getElementById('passthrough-grid');
    ptGrid.innerHTML = '';
    for (let i = 0; i < NLAYERS; i++) {
        const active = state.config.unmapped_passthrough_layers.includes(i);
        const lbl = document.createElement('label');
        lbl.className = `passthrough-toggle ${active ? 'active' : ''}`;
        lbl.innerHTML = `<input type="checkbox" ${active ? 'checked' : ''}> Layer ${i + 1}`;
        lbl.querySelector('input').addEventListener('change', (e) => {
            lbl.classList.toggle('active', e.target.checked);
            if (e.target.checked) {
                if (!state.config.unmapped_passthrough_layers.includes(i))
                    state.config.unmapped_passthrough_layers.push(i);
            } else {
                state.config.unmapped_passthrough_layers =
                    state.config.unmapped_passthrough_layers.filter(l => l !== i);
            }
            setDirty();
        });
        ptGrid.appendChild(lbl);
    }
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function renderSettingsTab() {
    document.getElementById('polling-rate').value = String(state.config.interval_override);
    document.getElementById('emulation-mode').value = String(state.config.our_descriptor_number);
    document.getElementById('normalize-gamepad').checked = state.config.normalize_gamepad_inputs;
    document.getElementById('tap-hold-ms').value = String(Math.round(state.config.tap_hold_threshold / 1000));
    document.getElementById('scroll-timeout-ms').value = String(Math.round(state.config.partial_scroll_timeout / 1000));
}

// ─── Advanced Tab ─────────────────────────────────────────────────────────────

function renderAdvancedTab() {
    const exprContainer = document.getElementById('expressions-container');
    exprContainer.innerHTML = '';
    state.config.expressions.forEach((expr, i) => {
        const sec = document.createElement('div');
        sec.className = 'adv-subsection';
        const preview = expr.trim() ? expr.substring(0, 40) + (expr.length > 40 ? '…' : '') : 'Empty';
        sec.innerHTML = `
            <div class="adv-subsection-header">
                <span>Expression ${i + 1}</span>
                <span style="color:var(--text-3);font-size:11px;flex:1;text-align:left;margin-left:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${preview}</span>
                <span class="adv-chevron">›</span>
            </div>
            <div class="adv-subsection-body">
                <textarea class="expr-input" rows="3" placeholder="Enter expression in RPN notation…">${expr}</textarea>
                <p style="font-size:11px;color:var(--text-3);margin-top:6px">RPN expression — see <a href="https://github.com/jfedor2/hid-remapper/blob/master/EXPRESSIONS.md" target="_blank" style="color:var(--accent)">EXPRESSIONS.md</a> for syntax.</p>
            </div>
        `;
        sec.querySelector('.adv-subsection-header').addEventListener('click', () => {
            sec.classList.toggle('open');
        });
        sec.querySelector('.expr-input').addEventListener('input', (e) => {
            state.config.expressions[i] = e.target.value;
            setDirty();
        });
        exprContainer.appendChild(sec);
    });
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function renderOverviewTab() {
    const container = document.getElementById('overview-content');
    if (!container) return;

    const mappings = state.config.mappings;
    if (!mappings || mappings.length === 0) {
        container.innerHTML = '<p class="ov-empty">No mappings configured. Load a config or add mappings on the Remap tab.</p>';
        return;
    }

    const sorted = [...mappings].sort((a, b) => {
        if (a.layers.length === 0 && b.layers.length > 0) return -1;
        if (a.layers.length > 0 && b.layers.length === 0) return 1;
        return (a.layers[0] ?? 0) - (b.layers[0] ?? 0);
    });

    let html = `<table class="ov-table">
        <thead><tr>
            <th>Source (input)</th>
            <th>Target (output)</th>
            <th>Layer(s)</th>
            <th>Scaling</th>
        </tr></thead>
        <tbody>`;

    for (const m of sorted) {
        const srcName  = getUsageName(m.source_usage);
        const tgtName  = getUsageName(m.target_usage);
        const isPassthrough = m.source_usage === m.target_usage;
        const layerText = m.layers.length === 0
            ? '<span class="ov-badge ov-badge-all">All layers</span>'
            : m.layers.map(l => `<span class="ov-badge">L${l + 1}</span>`).join('');
        const scaling   = `${(m.scaling / 10).toFixed(0)}%`;
        const rowClass  = isPassthrough ? ' class="ov-passthrough"' : '';
        html += `<tr${rowClass}>
            <td>
                <div class="ov-name">${srcName}</div>
                <div class="ov-code">${m.source_usage}</div>
            </td>
            <td>
                <div class="ov-name">${tgtName}</div>
                <div class="ov-code">${m.target_usage}</div>
            </td>
            <td class="ov-layers">${layerText}</td>
            <td class="ov-scaling">${scaling}</td>
        </tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ─── Connect / Load / Save ────────────────────────────────────────────────────

async function onConnect() {
    const btn = document.getElementById('connect-btn');
    btn.disabled = true;

    updateStatusDot('connecting', 'Connecting…');

    try {
        const info = await connectDevice();
        state.connected = true;
        document.getElementById('connect-screen').classList.add('hidden');
        document.getElementById('device-name').textContent = info.name || 'HID Remapper';
        updateStatusDot('connected', info.name || 'Connected');
        document.getElementById('load-btn').disabled  = false;
        document.getElementById('save-btn').disabled  = true;
        document.getElementById('header-load-btn').disabled = false;
        document.getElementById('header-save-btn').disabled = true;
        notify('Device connected. Load your config to start.', 'success');
    } catch (e) {
        updateStatusDot('disconnected', 'Disconnected');
        notify(e.message, 'error', 5000);
    } finally {
        btn.disabled = false;
    }
}

async function onLoadConfig() {
    try {
        disableDeviceBtns();
        notify('Loading config from device…', 'info', 2000);
        state.config = await loadConfig();
        setDirty(false);

        refreshControllerVisual();
        updateLayerLeds();
        renderLayersTab();
        renderSettingsTab();
        renderAdvancedTab();
        renderOverviewTab();
        notify('Config loaded successfully!', 'success');
    } catch (e) {
        notify(`Load failed: ${e.message}`, 'error', 5000);
    } finally {
        enableDeviceBtns();
    }
}

async function onSaveConfig() {
    try {
        disableDeviceBtns();
        notify('Saving config to device…', 'info', 2000);
        await saveConfig(state.config);
        setDirty(false);
        // Show checkmark
        const check = document.getElementById('save-check');
        check.classList.add('visible');
        setTimeout(() => check.classList.remove('visible'), 3000);
        notify('Config saved!', 'success');
    } catch (e) {
        notify(`Save failed: ${e.message}`, 'error', 5000);
    } finally {
        enableDeviceBtns();
    }
}

function disableDeviceBtns() {
    document.getElementById('load-btn').disabled = true;
    document.getElementById('save-btn').disabled = true;
    document.getElementById('header-load-btn').disabled = true;
    document.getElementById('header-save-btn').disabled = true;
}

function enableDeviceBtns() {
    const connected = isConnected();
    document.getElementById('load-btn').disabled  = !connected;
    document.getElementById('save-btn').disabled  = !state.dirty || !connected;
    document.getElementById('header-load-btn').disabled = !connected;
    document.getElementById('header-save-btn').disabled = !state.dirty || !connected;
}

function updateStatusDot(status, label) {
    const dot = document.getElementById('status-dot');
    const lbl = document.getElementById('status-label');
    dot.className = `status-dot ${status}`;
    lbl.textContent = label;
}

function onHIDDisconnected() {
    state.connected = false;
    updateStatusDot('disconnected', 'Disconnected');
    document.getElementById('load-btn').disabled = true;
    document.getElementById('save-btn').disabled = true;
    document.getElementById('header-load-btn').disabled = true;
    document.getElementById('header-save-btn').disabled = true;
    document.getElementById('connect-screen').classList.remove('hidden');
    notify('Device disconnected.', 'info');
}

// ─── Import / Export ──────────────────────────────────────────────────────────

function onExportJSON() {
    const json = exportConfigJSON(state.config);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'techremap-config.json';
    a.click();
    URL.revokeObjectURL(url);
}

function onImportJSON() {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = '.json';
    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            state.config = importConfigJSON(text);
            setDirty();
            refreshControllerVisual();
            updateLayerLeds();
            renderLayersTab();
            renderSettingsTab();
            renderAdvancedTab();
            renderOverviewTab();
            notify('Config imported!', 'success');
        } catch (err) {
            notify(`Import failed: ${err.message}`, 'error', 5000);
        }
    });
    input.click();
}

// ─── Settings event handlers ──────────────────────────────────────────────────

function bindSettingsEvents() {
    document.getElementById('polling-rate').addEventListener('change', e => {
        state.config.interval_override = parseInt(e.target.value, 10);
        setDirty();
    });
    document.getElementById('emulation-mode').addEventListener('change', e => {
        state.config.our_descriptor_number = parseInt(e.target.value, 10);
        setDirty();
    });
    document.getElementById('normalize-gamepad').addEventListener('change', e => {
        state.config.normalize_gamepad_inputs = e.target.checked;
        setDirty();
    });
    document.getElementById('tap-hold-ms').addEventListener('change', e => {
        state.config.tap_hold_threshold = parseInt(e.target.value, 10) * 1000;
        setDirty();
    });
    document.getElementById('scroll-timeout-ms').addEventListener('change', e => {
        state.config.partial_scroll_timeout = parseInt(e.target.value, 10) * 1000;
        setDirty();
    });
}

// ─── Layer bar ────────────────────────────────────────────────────────────────

function renderLayerBar() {
    const bar = document.getElementById('layer-bar');
    bar.innerHTML = '<span class="layer-bar-label" style="font-size:12px;color:var(--text-2);font-weight:500">Layer:</span>';
    for (let i = 0; i < NLAYERS; i++) {
        const btn = document.createElement('button');
        btn.className = `layer-btn ${i === state.activeLayer ? 'active' : ''}`;
        const color = getLayerCSSColor(i);
        btn.innerHTML = `<span class="layer-led" style="background:${color};box-shadow:0 0 6px ${color}"></span>L${i + 1}`;
        btn.addEventListener('click', () => {
            state.activeLayer = i;
            document.querySelectorAll('.layer-btn').forEach((b, j) =>
                b.classList.toggle('active', j === i)
            );
            refreshControllerVisual();
            if (state.selectedVisual) renderAssignPanel();
        });
        bar.appendChild(btn);
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function init() {
    // Check WebHID support
    if (!('hid' in navigator)) {
        document.getElementById('no-webhid-warning').style.display = 'block';
        return;
    }

    // Tab switching
    document.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', () => switchTab(t.dataset.tab));
    });

    // Header buttons
    document.getElementById('connect-btn').addEventListener('click', onConnect);
    document.getElementById('connect-screen-btn').addEventListener('click', onConnect);
    document.getElementById('load-btn').addEventListener('click', onLoadConfig);
    document.getElementById('save-btn').addEventListener('click', onSaveConfig);
    document.getElementById('header-load-btn').addEventListener('click', onLoadConfig);
    document.getElementById('header-save-btn').addEventListener('click', onSaveConfig);
    document.getElementById('export-btn').addEventListener('click', onExportJSON);
    document.getElementById('import-btn').addEventListener('click', onImportJSON);

    // Controller SVG clicks — delegate from the SVG element
    document.getElementById('controller-svg').addEventListener('click', (e) => {
        const el = e.target.closest('.pad-clickable');
        if (el) {
            // Stop capture if active
            if (state.capturing) stopCapture();
            handleControllerClick(el.dataset.input);
        }
    });

    // Stick sub-tabs
    document.querySelectorAll('.stick-tab').forEach(t => {
        t.addEventListener('click', () => {
            state.stickSubMode = t.dataset.mode;
            document.querySelectorAll('.stick-tab').forEach(s =>
                s.classList.toggle('active', s.dataset.mode === t.dataset.mode)
            );
            renderAssignPanel();
        });
    });

    // Capture button
    document.getElementById('capture-btn').addEventListener('click', () => {
        if (state.capturing) stopCapture();
        else startCapture();
    });

    // Remove mapping button
    document.getElementById('remove-mapping-btn').addEventListener('click', removeMapping);

    // Source search
    document.getElementById('source-search').addEventListener('input', () => {
        const mapping = getPrimaryMapping(getActivePanelUsage());
        renderSourcePicker(mapping?.source_usage);
    });

    // Picker category tabs
    document.querySelectorAll('.picker-cat').forEach(t => {
        t.addEventListener('click', () => {
            document.querySelectorAll('.picker-cat').forEach(c =>
                c.classList.toggle('active', c === t)
            );
            document.getElementById('source-search').value = '';
            const mapping = getPrimaryMapping(getActivePanelUsage());
            renderSourcePicker(mapping?.source_usage);
        });
    });

    // Sensitivity slider
    const sensitSlider = document.getElementById('sensitivity-slider');
    const sensitVal    = document.getElementById('sensitivity-val');
    sensitSlider.addEventListener('input', () => {
        sensitVal.textContent = `${(sensitSlider.value / 10).toFixed(0)}%`;
    });
    sensitSlider.addEventListener('change', applyCurrentMapping);

    // Deadzone slider
    const deadzoneSlider = document.getElementById('deadzone-slider');
    const deadzoneVal    = document.getElementById('deadzone-val');
    deadzoneSlider.addEventListener('input', () => {
        deadzoneVal.textContent = `${deadzoneSlider.value}%`;
    });
    deadzoneSlider.addEventListener('change', applyCurrentMapping);

    // Behavior toggles
    ['toggle-sticky','toggle-tap','toggle-hold'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyCurrentMapping);
    });

    // Settings
    bindSettingsEvents();

    // HID disconnect listener
    onHIDDisconnect(onHIDDisconnected);

    // Initial renders
    renderLayerBar();
    updateLayerLeds();
    renderLayersTab();
    renderSettingsTab();
    renderAdvancedTab();
    renderOverviewTab();
    refreshControllerVisual();

    // Initial state
    setDirty(false);
    document.getElementById('load-btn').disabled = true;
    document.getElementById('save-btn').disabled = true;
    document.getElementById('header-load-btn').disabled = true;
    document.getElementById('header-save-btn').disabled = true;
}
