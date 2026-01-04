/**
 * Simple Mode - Hoofdmodule
 * Integreert alle componenten voor de gebruiksvriendelijke interface
 */

import { ControllerView } from './controller-view.js';
import { InputListener } from './input-listener.js';
import { BehaviorTemplates } from './behavior-templates.js';

// Importeer bestaande code (als beschikbaar)
// We gebruiken de globale config en device objecten uit code.js

class SimpleMode {
    constructor() {
        this.device = null;
        this.config = null;
        this.controllerView = null;
        this.inputListener = null;
        this.behaviorTemplates = new BehaviorTemplates();
        this.currentMappingTarget = null;
        this.currentBehaviorType = 'direct';
        this.currentBehaviorParams = {};

        this.init();
    }

    /**
     * Initialiseer de applicatie
     */
    init() {
        // Wacht tot DOM geladen is
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    /**
     * Setup event listeners en UI
     */
    setup() {
        // Haal globale config en device op (uit code.js)
        this.config = typeof window !== 'undefined' && window.config ? window.config : this.createDefaultConfig();
        this.device = typeof window !== 'undefined' && window.device ? window.device : null;

        // Initialiseer ControllerView
        this.controllerView = new ControllerView('controller-view-container', 5);
        this.controllerView.onButtonClick = (usage, name, id) => this.handleButtonClick(usage, name, id);

        // Event listeners
        document.getElementById('connect-device-btn').addEventListener('click', () => this.connectDevice());
        document.getElementById('save-device-btn').addEventListener('click', () => this.saveToDevice());
        document.getElementById('toggle-advanced-btn').addEventListener('click', () => this.toggleAdvancedMode());
        document.getElementById('device-type-selector').addEventListener('change', (e) => this.onDeviceTypeChange(e.target.value));
        document.getElementById('behavior-type-selector').addEventListener('change', (e) => this.onBehaviorTypeChange(e.target.value));

        // Update UI
        this.updateConnectionStatus();
        this.updateMappingsList();
        this.updateControllerView();

        // Laad configuratie als device al verbonden is
        if (this.device) {
            this.updateConnectionStatus();
        }
    }

    /**
     * Maak default config aan
     */
    createDefaultConfig() {
        return {
            version: 18,
            unmapped_passthrough_layers: [0],
            partial_scroll_timeout: 1000000,
            tap_hold_threshold: 200000,
            gpio_debounce_time_ms: 5,
            interval_override: 0,
            our_descriptor_number: 5, // Xbox Adaptive Controller
            ignore_auth_dev_inputs: false,
            macro_entry_duration: 1,
            gpio_output_mode: 0,
            input_labels: 1, // Gamepad
            normalize_gamepad_inputs: true,
            mappings: [],
            macros: [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []],
            expressions: ['', '', '', '', '', '', '', ''],
            quirks: []
        };
    }

    /**
     * Verbind met HID device
     */
    async connectDevice() {
        try {
            // Gebruik bestaande open_device functie als beschikbaar
            if (typeof window !== 'undefined' && window.open_device) {
                await window.open_device();
                this.device = window.device;
            } else {
                // Fallback: direct WebHID API
                const filters = [
                    { vendorId: 0xCAFE, productId: 0xBAF2 }, // HID Remapper
                    { vendorId: 0x1209 } // Generic fallback
                ];

                const devices = await navigator.hid.requestDevice({ filters });
                if (devices.length === 0) {
                    throw new Error('Geen device geselecteerd');
                }

                this.device = devices[0];
                await this.device.open();
            }

            // Laad configuratie van device
            if (typeof window !== 'undefined' && window.load_from_device) {
                await window.load_from_device();
                this.config = window.config;
            }

            this.updateConnectionStatus();
            this.updateControllerView();
            this.updateMappingsList();

            // Enable save button
            document.getElementById('save-device-btn').disabled = false;

        } catch (error) {
            console.error('Error connecting device:', error);
            alert(`Kon geen verbinding maken: ${error.message}`);
        }
    }

    /**
     * Sla configuratie op naar device
     */
    async saveToDevice() {
        if (!this.device) {
            alert('Geen device verbonden');
            return;
        }

        try {
            // Gebruik bestaande save_to_device functie
            if (typeof window !== 'undefined' && window.save_to_device) {
                await window.save_to_device();
                alert('Configuratie opgeslagen!');
            } else {
                alert('Save functionaliteit niet beschikbaar. Gebruik Geavanceerde Modus.');
            }
        } catch (error) {
            console.error('Error saving to device:', error);
            alert(`Fout bij opslaan: ${error.message}`);
        }
    }

    /**
     * Toggle naar Advanced Mode
     */
    toggleAdvancedMode() {
        // Redirect naar hoofdindex.html
        if (window.location.pathname.includes('simple-ui')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = 'index.html';
        }
    }

    /**
     * Handle device type change
     */
    onDeviceTypeChange(deviceType) {
        const typeNum = parseInt(deviceType, 10);
        this.config.our_descriptor_number = typeNum;
        this.controllerView.setDeviceType(typeNum);
        this.updateMappingsList();
    }

    /**
     * Handle behavior type change
     */
    onBehaviorTypeChange(behaviorType) {
        this.currentBehaviorType = behaviorType;
        this.updateBehaviorParams();
    }

    /**
     * Update behavior parameters UI
     */
    updateBehaviorParams() {
        const paramsContainer = document.getElementById('behavior-params');
        paramsContainer.innerHTML = '';
        paramsContainer.classList.remove('hidden');

        switch (this.currentBehaviorType) {
            case 'turbo':
                paramsContainer.innerHTML = `
                    <div class="behavior-param">
                        <label>Pulsen per seconde:</label>
                        <input type="number" id="turbo-rate" value="10" min="1" max="100">
                    </div>
                `;
                document.getElementById('turbo-rate').addEventListener('input', (e) => {
                    this.currentBehaviorParams.rate = parseInt(e.target.value, 10);
                });
                break;

            case 'hold':
                paramsContainer.innerHTML = `
                    <div class="behavior-param">
                        <label>Vasthoud tijd (ms):</label>
                        <input type="number" id="hold-time" value="500" min="100" max="5000" step="100">
                    </div>
                `;
                document.getElementById('hold-time').addEventListener('input', (e) => {
                    this.currentBehaviorParams.holdTime = parseInt(e.target.value, 10);
                });
                break;

            default:
                paramsContainer.classList.add('hidden');
                break;
        }
    }

    /**
     * Handle button click in controller
     */
    handleButtonClick(usage, name, id) {
        if (!this.device) {
            alert('Verbind eerst een device');
            return;
        }

        this.currentMappingTarget = { usage, name, id };
        this.controllerView.setActiveButton(usage);

        // Start luisteren
        this.startListening();
    }

    /**
     * Start luisteren naar input
     */
    startListening() {
        if (!this.device) {
            return;
        }

        // Stop vorige listener als actief
        if (this.inputListener) {
            this.inputListener.stop();
        }

        // Maak nieuwe listener
        this.inputListener = new InputListener(this.device, (input, status) => {
            this.handleInputDetected(input, status);
        });

        // Start luisteren
        this.inputListener.start(5000);

        // Update UI
        const statusDiv = document.getElementById('listening-status');
        const messageSpan = document.getElementById('listening-message');
        const progressBar = document.getElementById('listening-progress');

        statusDiv.classList.remove('hidden');
        messageSpan.textContent = `Druk op een knop voor: ${this.currentMappingTarget.name}`;

        // Update progress bar
        const updateProgress = () => {
            if (!this.inputListener || !this.inputListener.isListening) {
                return;
            }

            const progress = this.inputListener.getProgress();
            progressBar.style.width = `${100 - progress}%`;

            requestAnimationFrame(updateProgress);
        };

        updateProgress();
    }

    /**
     * Handle gedetecteerde input
     */
    handleInputDetected(input, status) {
        const statusDiv = document.getElementById('listening-status');
        statusDiv.classList.add('hidden');

        this.controllerView.clearActiveButton();

        if (status === 'timeout') {
            alert('Geen input gedetecteerd binnen 5 seconden');
            return;
        }

        if (!input || !this.currentMappingTarget) {
            return;
        }

        // Maak mapping aan
        this.createMapping(input.usage, this.currentMappingTarget.usage, this.currentBehaviorType);

        // Update UI
        this.updateMappingsList();
        this.updateControllerView();

        // Show success message
        const message = `Mapping aangemaakt: ${this.currentMappingTarget.name} ← ${input.usage}`;
        this.showNotification(message, 'success');
    }

    /**
     * Maak een nieuwe mapping aan
     */
    createMapping(sourceUsage, targetUsage, behaviorType) {
        // Genereer expressie op basis van behavior type
        const behavior = this.behaviorTemplates.generateExpression(
            behaviorType,
            sourceUsage,
            this.currentBehaviorParams
        );

        // Verwijder bestaande mapping voor deze target
        this.config.mappings = this.config.mappings.filter(
            m => m.target_usage !== targetUsage
        );

        // Maak nieuwe mapping
        const mapping = {
            source_usage: sourceUsage,
            target_usage: targetUsage,
            layers: [0],
            sticky: false,
            tap: false,
            hold: false,
            scaling: 1000,
            source_port: 0,
            target_port: 0
        };

        // Als er een expressie is, voeg die toe aan expressions array
        if (behavior.expression && behavior.expression !== `PUSH_USAGE ${parseInt(sourceUsage, 16)}`) {
            // Zoek eerste lege expression slot
            let exprIndex = this.config.expressions.findIndex(e => !e || e === '');
            if (exprIndex === -1) {
                exprIndex = 0; // Overwrite eerste als alle vol zijn
            }

            // Store expressie
            this.config.expressions[exprIndex] = behavior.expression;

            // Link expressie aan mapping via target usage
            // (Dit vereist mogelijk firmware aanpassingen, voor nu gebruiken we direct mapping)
        }

        // Voeg mapping toe
        this.config.mappings.push(mapping);

        // Update globale config (voor compatibiliteit)
        if (typeof window !== 'undefined') {
            window.config = this.config;
        }
    }

    /**
     * Update connection status UI
     */
    updateConnectionStatus() {
        const statusBadge = document.getElementById('connection-status');
        if (this.device && this.device.opened) {
            statusBadge.textContent = 'Verbonden';
            statusBadge.classList.add('connected');
        } else {
            statusBadge.textContent = 'Niet verbonden';
            statusBadge.classList.remove('connected');
        }
    }

    /**
     * Update mappings list UI
     */
    updateMappingsList() {
        const listContainer = document.getElementById('mappings-list');
        
        if (!this.config || !this.config.mappings || this.config.mappings.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">Nog geen mappings aangemaakt. Klik op een knop in de controller om te beginnen.</div>';
            return;
        }

        // Filter mappings voor huidige device type
        const deviceType = this.config.our_descriptor_number || 5;
        const layout = this.controllerView.layouts[deviceType];
        const targetUsages = new Set();
        
        if (layout) {
            if (layout.buttons) {
                layout.buttons.forEach(btn => targetUsages.add(btn.usage));
            }
            if (layout.sticks) {
                layout.sticks.forEach(stick => {
                    targetUsages.add(stick.usageX);
                    targetUsages.add(stick.usageY);
                });
            }
        }

        const relevantMappings = this.config.mappings.filter(m => targetUsages.has(m.target_usage));

        if (relevantMappings.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">Geen mappings voor dit controller type.</div>';
            return;
        }

        listContainer.innerHTML = relevantMappings.map((mapping, index) => {
            const targetName = this.getUsageName(mapping.target_usage);
            const sourceName = this.getUsageName(mapping.source_usage);
            
            return `
                <div class="mapping-item">
                    <div class="mapping-info">
                        <div class="mapping-source">${targetName}</div>
                        <div class="mapping-target">← ${sourceName}</div>
                    </div>
                    <div class="mapping-actions">
                        <button class="btn-icon" onclick="simpleMode.removeMapping(${index})" title="Verwijder">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update controller view
     */
    updateControllerView() {
        if (!this.controllerView || !this.config) {
            return;
        }

        const deviceType = this.config.our_descriptor_number || 5;
        this.controllerView.setDeviceType(deviceType);
        this.controllerView.updateMappings(this.config.mappings || []);
    }

    /**
     * Get readable usage name
     */
    getUsageName(usage) {
        // Gebruik bestaande readable_usage_name functie als beschikbaar
        if (typeof window !== 'undefined' && window.readable_usage_name) {
            return window.readable_usage_name(usage);
        }

        // Fallback: return usage code
        return usage;
    }

    /**
     * Remove mapping
     */
    removeMapping(index) {
        if (!this.config || !this.config.mappings) {
            return;
        }

        // Filter mappings voor huidige device type
        const deviceType = this.config.our_descriptor_number || 5;
        const layout = this.controllerView.layouts[deviceType];
        const targetUsages = new Set();
        
        if (layout) {
            if (layout.buttons) {
                layout.buttons.forEach(btn => targetUsages.add(btn.usage));
            }
            if (layout.sticks) {
                layout.sticks.forEach(stick => {
                    targetUsages.add(stick.usageX);
                    targetUsages.add(stick.usageY);
                });
            }
        }

        const relevantMappings = this.config.mappings.filter(m => targetUsages.has(m.target_usage));
        const mappingToRemove = relevantMappings[index];

        if (mappingToRemove) {
            this.config.mappings = this.config.mappings.filter(
                m => !(m.target_usage === mappingToRemove.target_usage && m.source_usage === mappingToRemove.source_usage)
            );

            // Update globale config
            if (typeof window !== 'undefined') {
                window.config = this.config;
            }

            this.updateMappingsList();
            this.updateControllerView();
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Simple notification (kan uitgebreid worden met toast library)
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? 'var(--accent-success)' : 'var(--accent-primary)'};
            color: var(--bg-primary);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 600;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialiseer Simple Mode
let simpleMode;
if (typeof window !== 'undefined') {
    window.simpleMode = simpleMode = new SimpleMode();
    // Maak removeMapping beschikbaar voor inline event handlers
    window.removeMapping = (index) => simpleMode.removeMapping(index);
}

export default SimpleMode;

