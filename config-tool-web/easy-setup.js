// Easy Setup UI for HID Remapper
// Provides visual controller mapping interface

import usages from './usages.js';

// Controller output types and their corresponding SVG files
const CONTROLLER_TYPES = {
    'xac': { name: 'Xbox/XAC', descriptorIdx: 5, svgId: 'svg-xac' },
    'switch': { name: 'Switch Pro', descriptorIdx: 2, svgId: 'svg-switch' },
    'mouse': { name: 'Mouse', descriptorIdx: 0, svgId: 'svg-mouse' },
    'keyboard': { name: 'Keyboard', descriptorIdx: 0, svgId: 'svg-keyboard' },
    'stadia': { name: 'Stadia', descriptorIdx: 4, svgId: 'svg-stadia' }
};

// Button mappings for each controller type - maps SVG element IDs to HID usage codes
const BUTTON_USAGES = {
    'xac': {
        'btn-a': '0x00090005',  // A button
        'btn-b': '0x00090006',  // B button
        'btn-x': '0x0009000b',  // X button
        'btn-y': '0x0009000c',  // Y button
        'btn-lb': '0x00090004', // Left Bumper
        'btn-rb': '0x0009000a', // Right Bumper
        'btn-lt': '0x00090007', // Left Trigger (View)
        'btn-rt': '0x00090008', // Right Trigger (Menu)
        'btn-back': '0x00090007', // View button
        'btn-start': '0x00090008', // Menu button
        'btn-ls': '0x00090003', // Left Stick Button
        'btn-rs': '0x00090009', // Right Stick Button
        'btn-home': '0x0009000d', // Home button (if exists)
        'dpad-up': '0xfff90003',
        'dpad-down': '0xfff90004',
        'dpad-left': '0xfff90001',
        'dpad-right': '0xfff90002',
        'stick-left': '0x00010030', // Click on stick itself maps to X axis
        'stick-left-x': '0x00010030',
        'stick-left-y': '0x00010031',
        'stick-left-both': 'STICK_LEFT_BOTH', // Special marker for both axes
        'stick-right': '0x00010032', // Click on stick itself maps to X axis
        'stick-right-x': '0x00010032',
        'stick-right-y': '0x00010035',
        'stick-right-both': 'STICK_RIGHT_BOTH' // Special marker for both axes
    },
    'switch': {
        'btn-a': '0x00090002',
        'btn-b': '0x00090001',
        'btn-x': '0x00090004',
        'btn-y': '0x00090003',
        'btn-l': '0x00090005',
        'btn-r': '0x00090006',
        'btn-zl': '0x00090007',
        'btn-zr': '0x00090008',
        'btn-minus': '0x00090009',
        'btn-plus': '0x0009000a',
        'btn-ls': '0x0009000b',
        'btn-rs': '0x0009000c',
        'btn-home': '0x0009000d',
        'btn-capture': '0x0009000e',
        'dpad': '0x00010039',
        'stick-left': '0x00010030',
        'stick-right': '0x00010032'
    },
    'mouse': {
        'btn-left': '0x00090001',
        'btn-right': '0x00090002',
        'btn-middle': '0x00090003',
        'btn-back': '0x00090004',
        'btn-forward': '0x00090005',
        'axis-x': '0x00010030',
        'axis-y': '0x00010031',
        'scroll-v': '0x00010038',
        'scroll-h': '0x000c0238'
    },
    'keyboard': {
        // Will be populated dynamically based on key clicks
    },
    'stadia': {
        'btn-a': '0x00090001',
        'btn-b': '0x00090002',
        'btn-x': '0x00090003',
        'btn-y': '0x00090004',
        'btn-l1': '0x00090005',
        'btn-r1': '0x00090006',
        'btn-l2': '0x00090007',
        'btn-r2': '0x00090008',
        'btn-select': '0x00090009',
        'btn-start': '0x0009000a',
        'btn-l3': '0x0009000b',
        'btn-r3': '0x0009000c',
        'btn-stadia': '0x0009000d',
        'btn-assistant': '0x0009000e',
        'btn-capture': '0x0009000f',
        'dpad': '0x00010039',
        'stick-left': '0x00010030',
        'stick-right': '0x00010032'
    }
};

// Expression templates for common use cases
const EXPRESSION_TEMPLATES = [
    {
        id: 'mouse-to-stick-absolute',
        name: 'Muis → Joystick (blijft staan)',
        description: 'Muisbewegingen worden omgezet naar joystick posities die blijven staan',
        expressions: [
            '/* X-axis accumulator */ 0x00010030 input_state 1 recall add -127 127 clamp dup 1 store',
            '/* Y-axis accumulator */ 0x00010031 input_state 2 recall add -127 127 clamp dup 2 store'
        ],
        mappings: [
            { source: 'Expression 1', target: '0x00010030', scaling: 1000 },
            { source: 'Expression 2', target: '0x00010031', scaling: 1000 }
        ]
    },
    {
        id: 'mouse-to-stick-relative',
        name: 'Muis → Joystick (zelf-centrerend)',
        description: 'Muisbewegingen bewegen de joystick, keert terug naar centrum',
        mappings: [
            { source: '0x00010030', target: '0x00010030', scaling: 500 },
            { source: '0x00010031', target: '0x00010031', scaling: 500 }
        ]
    },
    {
        id: 'swap-sticks',
        name: 'Wissel linker/rechter stick',
        description: 'Verwisselt de linker en rechter analog stick',
        mappings: [
            { source: '0x00010030', target: '0x00010032', scaling: 1000 },
            { source: '0x00010031', target: '0x00010035', scaling: 1000 },
            { source: '0x00010032', target: '0x00010030', scaling: 1000 },
            { source: '0x00010035', target: '0x00010031', scaling: 1000 }
        ]
    },
    {
        id: 'invert-y',
        name: 'Inverteer Y-as',
        description: 'Inverteer de verticale as van de stick',
        mappings: [
            { source: '0x00010031', target: '0x00010031', scaling: -1000 }
        ]
    },
    {
        id: 'dpad-to-mouse',
        name: 'D-pad → Muis beweging',
        description: 'Gebruik de D-pad om de muis te bewegen',
        expressions: [
            '/* D-pad to mouse X */ 0x00010039 input_state 7 gt not 0x00010039 input_state 45 mul sin mul 5 mul',
            '/* D-pad to mouse Y */ 0x00010039 input_state 7 gt not 0x00010039 input_state 45 mul cos -1 mul mul 5 mul'
        ],
        mappings: [
            { source: 'Expression 1', target: '0x00010030', scaling: 1000 },
            { source: 'Expression 2', target: '0x00010031', scaling: 1000 }
        ]
    },
    {
        id: 'turbo-mode',
        name: 'Turbo mode (snelle herhalingen)',
        description: 'Maakt een knop snel herhalend wanneer ingedrukt',
        expressions: [
            '/* Turbo button */ time 100 mod 50 gt 0x00090001 input_state_binary mul'
        ],
        mappings: [
            { source: 'Expression 1', target: '0x00090001', scaling: 1000 }
        ]
    }
];

// Map descriptor numbers to output types
// 0: Mouse and keyboard, 1: Absolute mouse and keyboard, 2: Switch, 3: PS4, 4: Stadia, 5: XAC/Flex
const DESCRIPTOR_TO_OUTPUT_TYPE = {
    0: 'mouse-keyboard',
    1: 'mouse-keyboard',
    2: 'controller',
    3: 'controller',
    4: 'controller',
    5: 'controller'
};

// State management
let easySetupState = {
    currentControllerType: 'xac',
    mappings: [],
    waitingForInput: false,
    waitingButton: null,
    countdownValue: 5,
    countdownInterval: null,
    sensitivity: 100,
    deadzone: 10,
    lastInputTime: 0,
    lastInputUsage: null,
    inputDebounceMs: 300, // Debounce time in milliseconds
    pendingStickMapping: null // For "both axes" stick mapping
};

// Initialize Easy Setup when DOM is ready
export function initEasySetup() {
    setupControllerTypeSelector();
    setupOutputTypeListener();
    setupMappingOverlay();
    setupSliderControls();
    setupTemplateSelector();
    setupAdvancedToggle();
    updateControllerDisplay();
    
    // Start live input visualization when Easy Setup tab is shown
    const easySetupTab = document.getElementById('nav-easy-setup-tab');
    if (easySetupTab) {
        easySetupTab.addEventListener('shown.bs.tab', () => {
            console.log('Easy Setup tab shown, starting live input visualization');
            startLiveInputVisualization();
        });
        
        easySetupTab.addEventListener('hidden.bs.tab', () => {
            console.log('Easy Setup tab hidden, stopping live input visualization');
            stopLiveInputVisualization();
        });
        
        // If already on Easy Setup tab, start visualization
        if (easySetupTab.classList.contains('active')) {
            startLiveInputVisualization();
        }
    }
}

// Listen to changes in the emulated device type dropdown (both dropdowns)
function setupOutputTypeListener() {
    const mainDropdown = document.getElementById('our_descriptor_number_dropdown');
    const easySetupDropdown = document.getElementById('easy-setup-device-type-dropdown');
    
    if (!mainDropdown || !easySetupDropdown) return;
    
    // Sync Easy Setup dropdown with main dropdown on load
    syncDropdowns();
    
    // Listen for changes in Easy Setup dropdown
    easySetupDropdown.addEventListener('change', () => {
        const value = easySetupDropdown.value;
        // Update main dropdown
        if (mainDropdown.value !== value) {
            mainDropdown.value = value;
            mainDropdown.dispatchEvent(new Event('change'));
        }
        updateControllerDisplay();
    });
    
    // Listen for changes in main dropdown
    mainDropdown.addEventListener('change', () => {
        const value = mainDropdown.value;
        // Update Easy Setup dropdown
        if (easySetupDropdown.value !== value) {
            easySetupDropdown.value = value;
        }
        updateControllerDisplay();
    });
    
    // Initial update
    updateControllerDisplay();
}

// Sync Easy Setup dropdown with main dropdown
function syncDropdowns() {
    const mainDropdown = document.getElementById('our_descriptor_number_dropdown');
    const easySetupDropdown = document.getElementById('easy-setup-device-type-dropdown');
    
    if (mainDropdown && easySetupDropdown) {
        // If main dropdown has no value set or is 0 (Mouse/keyboard), default to 5 (XAC/Flex)
        if (!mainDropdown.value || mainDropdown.value === '' || mainDropdown.value === '0') {
            mainDropdown.value = '5';
            // Also update config if it exists
            if (typeof config !== 'undefined') {
                config['our_descriptor_number'] = 5;
            }
        }
        easySetupDropdown.value = mainDropdown.value;
    } else if (easySetupDropdown) {
        // If main dropdown doesn't exist yet, set default to 5
        easySetupDropdown.value = '5';
    }
}

// Update controller display based on descriptor dropdown value
function updateControllerDisplay() {
    // Try Easy Setup dropdown first, fallback to main dropdown
    const easySetupDropdown = document.getElementById('easy-setup-device-type-dropdown');
    const mainDropdown = document.getElementById('our_descriptor_number_dropdown');
    const dropdown = easySetupDropdown || mainDropdown;
    
    if (!dropdown) return;
    
    const descriptorValue = parseInt(dropdown.value, 10);
    
    // Update controller type selector visibility and available options
    updateControllerTypeSelector();
    
    // Show display area
    const displayArea = document.querySelector('.controller-display');
    if (displayArea) {
        displayArea.classList.remove('hidden');
    }
    
    // Load appropriate controller visualization based on descriptor value
    // 0: Mouse and keyboard
    // 1: Absolute mouse and keyboard  
    // 2: Switch gamepad
    // 3: PS4 arcade stick
    // 4: Stadia controller
    // 5: XAC/Flex compatible (default - Xbox controller)
    
    if (descriptorValue === 0 || descriptorValue === 1) {
        // Mouse and keyboard
        console.log('Loading mouse/keyboard, descriptorValue:', descriptorValue);
        loadMouseKeyboard();
    } else if (descriptorValue === 2) {
        // Switch gamepad
        loadControllerSVG('switch');
    } else if (descriptorValue === 3) {
        // PS4 arcade stick
        loadControllerSVG('ps4');
    } else if (descriptorValue === 4) {
        // Stadia controller
        loadControllerSVG('stadia');
    } else {
        // Default: XAC/Flex compatible (Xbox controller)
        loadControllerSVG('xac');
    }
}

// Update controller type selector based on current descriptor dropdown value
function updateControllerTypeSelector() {
    const selector = document.querySelector('.controller-selector');
    if (!selector) return;
    
    // Try Easy Setup dropdown first, fallback to main dropdown
    const easySetupDropdown = document.getElementById('easy-setup-device-type-dropdown');
    const mainDropdown = document.getElementById('our_descriptor_number_dropdown');
    const dropdown = easySetupDropdown || mainDropdown;
    
    if (!dropdown) return;
    
    const descriptorValue = parseInt(dropdown.value, 10);
    
    // Clear existing content
    selector.innerHTML = '';
    
    // Only show controller selector for controller output types (not mouse/keyboard)
    if (descriptorValue === 0 || descriptorValue === 1) {
        // Hide selector for mouse/keyboard
        selector.style.display = 'none';
        return;
    }
    
    // Show selector for controllers
    selector.style.display = 'flex';
    
    // Optional: Add info text about selected controller type
    const infoText = document.createElement('div');
    infoText.className = 'controller-type-info';
    infoText.style.cssText = 'width: 100%; text-align: center; color: var(--es-text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;';
    
    if (descriptorValue === 2) {
        infoText.textContent = 'Switch Pro Controller';
    } else if (descriptorValue === 3) {
        infoText.textContent = 'PS4 Arcade Stick';
    } else if (descriptorValue === 4) {
        infoText.textContent = 'Stadia Controller';
    } else if (descriptorValue === 5) {
        infoText.textContent = 'XAC/Flex Compatible (Xbox Controller)';
    }
    
    if (infoText.textContent) {
        selector.appendChild(infoText);
    }
}

// Set up controller type selection buttons
function setupControllerTypeSelector() {
    updateControllerTypeSelector();
}

// Handle controller type selection
function selectControllerType(type) {
    easySetupState.currentControllerType = type;
    
    // Update button states
    document.querySelectorAll('.controller-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    // Load the appropriate SVG
    loadControllerSVG(type);
    
    // Update descriptor dropdown in main settings if it exists
    const descriptorDropdown = document.getElementById('our_descriptor_number_dropdown');
    if (descriptorDropdown) {
        descriptorDropdown.value = CONTROLLER_TYPES[type].descriptorIdx;
        descriptorDropdown.dispatchEvent(new Event('change'));
    }
}

// Load mouse and keyboard visualization
function loadMouseKeyboard() {
    const container = document.querySelector('.controller-svg-container');
    if (!container) return;
    
    // Hide ALL controllers first - be very explicit
    const allControllers = container.querySelectorAll('.controller');
    console.log('Hiding controllers:', allControllers.length);
    allControllers.forEach(controller => {
        controller.classList.add('hidden');
        controller.style.setProperty('display', 'none', 'important');
        console.log('Hiding controller:', controller.id, controller.className);
    });
    
    // Also hide by ID explicitly
    const xboxController = document.getElementById('controller-xac');
    if (xboxController) {
        xboxController.classList.add('hidden');
        xboxController.style.setProperty('display', 'none', 'important');
        console.log('Explicitly hiding Xbox controller');
    }
    
    // Show mouse/keyboard SVG
    let mouseKeyboardContainer = container.querySelector('#controller-mouse-keyboard');
    if (!mouseKeyboardContainer) {
        // Create mouse/keyboard container if it doesn't exist
        mouseKeyboardContainer = document.createElement('div');
        mouseKeyboardContainer.id = 'controller-mouse-keyboard';
        mouseKeyboardContainer.className = 'controller mouse-keyboard';
        mouseKeyboardContainer.innerHTML = `
            <object data="controllers/mouse.svg" type="image/svg+xml" class="mouse-svg" style="max-width: 300px;"></object>
            <object data="controllers/keyboard.svg" type="image/svg+xml" class="keyboard-svg" style="max-width: 500px;"></object>
        `;
        container.appendChild(mouseKeyboardContainer);
    }
    
    // Show mouse/keyboard - remove hidden class and set display
    mouseKeyboardContainer.classList.remove('hidden');
    mouseKeyboardContainer.style.setProperty('display', 'flex', 'important');
    console.log('Showing mouse/keyboard');
    
    // Update mappings display
    updateMappingsPanel();
}

// Load controller HTML into the display area
function loadControllerSVG(type) {
    const container = document.querySelector('.controller-svg-container');
    if (!container) return;
    
    // Hide all controllers first - be very explicit
    container.querySelectorAll('.controller').forEach(controller => {
        controller.classList.add('hidden');
        controller.style.setProperty('display', 'none', 'important');
    });
    
    // Also explicitly hide mouse/keyboard if it exists
    const mouseKeyboard = document.getElementById('controller-mouse-keyboard');
    if (mouseKeyboard) {
        mouseKeyboard.classList.add('hidden');
        mouseKeyboard.style.setProperty('display', 'none', 'important');
    }
    
    // Map controller types to their IDs
    const controllerMap = {
        'xac': 'controller-xac',
        'switch': 'controller-switch',
        'stadia': 'controller-stadia',
        'ps4': 'controller-ps4'
    };
    
    const controllerId = controllerMap[type] || 'controller-xac';
    
    // Check if controller exists, if not create it
    let activeController = container.querySelector(`#${controllerId}`);
    
    if (!activeController) {
        // Create controller based on type
        if (type === 'switch') {
            activeController = createSwitchController();
        } else if (type === 'stadia') {
            activeController = createStadiaController();
        } else if (type === 'ps4') {
            activeController = createPS4Controller();
        } else {
            // Default to Xbox (already exists in HTML)
            activeController = container.querySelector('#controller-xac');
        }
        
        if (activeController && activeController.parentNode !== container) {
            container.appendChild(activeController);
        }
    }
    
    if (activeController) {
        // Show the selected controller - remove hidden class and set display with important
        activeController.classList.remove('hidden');
        activeController.style.setProperty('display', 'block', 'important');
        console.log('Showing controller:', type, activeController.id);
        setupButtonClickHandlers(activeController, type);
    } else {
        console.warn('Controller not found for type:', type);
    }
    
    // Update mappings display
    updateMappingsPanel();
}

// Create Switch Pro controller structure
function createSwitchController() {
    const controller = document.createElement('div');
    controller.id = 'controller-switch';
    controller.className = 'controller switch';
    controller.innerHTML = `
        <object data="controllers/switch-pro.svg" type="image/svg+xml" class="controller-svg"></object>
    `;
    return controller;
}

// Create Stadia controller structure
function createStadiaController() {
    const controller = document.createElement('div');
    controller.id = 'controller-stadia';
    controller.className = 'controller stadia';
    controller.innerHTML = `
        <object data="controllers/stadia.svg" type="image/svg+xml" class="controller-svg"></object>
    `;
    return controller;
}

// Create PS4 arcade stick structure
function createPS4Controller() {
    const controller = document.createElement('div');
    controller.id = 'controller-ps4';
    controller.className = 'controller ps4';
    // For now, use a placeholder or create HTML structure similar to Xbox
    // PS4 arcade stick might need a custom HTML structure like Xbox
    controller.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--es-text);">
            <p>PS4 Arcade Stick visualization</p>
            <p style="font-size: 0.9rem; color: var(--es-text-muted);">(Visualisatie komt binnenkort)</p>
        </div>
    `;
    return controller;
}

// Set up click handlers for controller buttons in the HTML structure
function setupButtonClickHandlers(controller, type) {
    const buttonUsages = BUTTON_USAGES[type];
    if (!buttonUsages) return;
    
    // Find all interactive button regions (now using data-btn-id on HTML elements)
    controller.querySelectorAll('[data-btn-id]').forEach(element => {
        const btnId = element.dataset.btnId;
        if (buttonUsages[btnId]) {
            // Remove any existing click handlers to avoid duplicates
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            
            // Check if this is a stick element
            if (btnId === 'stick-left' || btnId === 'stick-right') {
                // Open stick mapping panel instead of direct mapping
                newElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openStickMappingPanel(btnId === 'stick-left' ? 'left' : 'right', newElement);
                });
            } else {
                // Add click handler to the new element
                newElement.addEventListener('click', () => startButtonMapping(btnId, buttonUsages[btnId], newElement));
            }
        }
    });
}

// Start the button mapping process
function startButtonMapping(btnId, targetUsage, element) {
    console.log('startButtonMapping called:', btnId, targetUsage, element);
    console.log('Current mappings:', easySetupState.mappings);
    
    // Handle special "both axes" mapping for sticks
    if (targetUsage === 'STICK_LEFT_BOTH' || targetUsage === 'STICK_RIGHT_BOTH') {
        startStickBothAxesMapping(btnId, targetUsage, element);
        return;
    }
    
    // Check if this button already has a mapping
    const existingMapping = easySetupState.mappings.find(m => m.target_usage === targetUsage);
    console.log('Existing mapping found:', existingMapping);
    
    if (existingMapping) {
        // Show existing mapping in overlay
        console.log('Showing existing mapping for:', btnId);
        showExistingMapping(btnId, targetUsage, element, existingMapping);
        return;
    }
    
    if (easySetupState.waitingForInput) return;
    
    easySetupState.waitingForInput = true;
    easySetupState.waitingButton = { btnId, targetUsage, element };
    easySetupState.countdownValue = 5; // Longer timeout for better UX
    easySetupState.lastInputTime = 0;
    easySetupState.lastInputUsage = null;
    
    // Add waiting state to button
    element.classList.add('waiting');
    
    // Show overlay with appropriate message
    const overlay = document.querySelector('.mapping-overlay');
    const targetName = getUsageName(targetUsage) || formatButtonName(btnId);
    overlay.querySelector('.target-button-name').textContent = targetName;
    overlay.querySelector('.countdown-circle').textContent = '5';
    
    // Different message for axes vs buttons
    if (isAxisMapping(btnId)) {
        overlay.querySelector('.mapping-status').textContent = 'Beweeg de joystick of druk een knop in...';
    } else {
        overlay.querySelector('.mapping-status').textContent = 'Druk nu een knop in op je hardware...';
    }
    overlay.classList.add('active');
    
    // Start countdown
    easySetupState.countdownInterval = setInterval(() => {
        easySetupState.countdownValue--;
        overlay.querySelector('.countdown-circle').textContent = easySetupState.countdownValue;
        
        if (easySetupState.countdownValue <= 0) {
            cancelMapping();
        }
    }, 1000);
    
    // Start listening for hardware input
    startInputListening();
}

// Start mapping both axes of a stick
function startStickBothAxesMapping(btnId, targetUsage, element) {
    const isLeft = targetUsage === 'STICK_LEFT_BOTH';
    const xUsage = isLeft ? '0x00010030' : '0x00010032';
    const yUsage = isLeft ? '0x00010031' : '0x00010035';
    const stickName = isLeft ? 'Linker stick' : 'Rechter stick';
    
    // First map X axis, then Y axis
    easySetupState.pendingStickMapping = {
        isLeft,
        phase: 'x',
        xUsage,
        yUsage,
        element,
        xMapped: false,
        yMapped: false
    };
    
    if (easySetupState.waitingForInput) return;
    
    easySetupState.waitingForInput = true;
    easySetupState.waitingButton = { 
        btnId: isLeft ? 'stick-left-x' : 'stick-right-x', 
        targetUsage: xUsage, 
        element 
    };
    easySetupState.countdownValue = 10; // Longer for stick mapping
    easySetupState.lastInputTime = 0;
    easySetupState.lastInputUsage = null;
    
    element.classList.add('waiting');
    
    const overlay = document.querySelector('.mapping-overlay');
    overlay.querySelector('.target-button-name').textContent = `${stickName} - Horizontaal (X)`;
    overlay.querySelector('.countdown-circle').textContent = '10';
    overlay.querySelector('.mapping-status').textContent = 'Beweeg de joystick LINKS-RECHTS...';
    overlay.classList.add('active');
    
    easySetupState.countdownInterval = setInterval(() => {
        easySetupState.countdownValue--;
        overlay.querySelector('.countdown-circle').textContent = easySetupState.countdownValue;
        
        if (easySetupState.countdownValue <= 0) {
            cancelMapping();
            easySetupState.pendingStickMapping = null;
        }
    }, 1000);
    
    startInputListening();
}

// Cancel current stick mapping
function cancelStickMapping() {
    if (easySetupState.pendingStickMapping) {
        easySetupState.pendingStickMapping.element.classList.remove('waiting');
        easySetupState.pendingStickMapping = null;
    }
}

// Check if this is an axis mapping
function isAxisMapping(btnId) {
    return btnId && (btnId.includes('stick') || btnId.includes('axis'));
}

// Format button name for display
function formatButtonName(btnId) {
    const nameMap = {
        'btn-a': 'A knop',
        'btn-b': 'B knop',
        'btn-x': 'X knop',
        'btn-y': 'Y knop',
        'btn-lb': 'Left Bumper',
        'btn-rb': 'Right Bumper',
        'btn-lt': 'Left Trigger',
        'btn-rt': 'Right Trigger',
        'btn-back': 'Back/View',
        'btn-start': 'Start/Menu',
        'btn-ls': 'Left Stick Click',
        'btn-rs': 'Right Stick Click',
        'btn-home': 'Home',
        'dpad-up': 'D-pad Omhoog',
        'dpad-down': 'D-pad Omlaag',
        'dpad-left': 'D-pad Links',
        'dpad-right': 'D-pad Rechts',
        'stick-left-x': 'Linker stick X',
        'stick-left-y': 'Linker stick Y',
        'stick-right-x': 'Rechter stick X',
        'stick-right-y': 'Rechter stick Y'
    };
    return nameMap[btnId] || btnId;
}

// Show existing mapping in overlay
function showExistingMapping(btnId, targetUsage, element, mapping) {
    console.log('showExistingMapping called:', btnId, targetUsage, element, mapping);
    
    const overlay = document.querySelector('.mapping-overlay');
    if (!overlay) {
        console.error('Overlay not found!');
        return;
    }
    
    const targetName = getUsageName(targetUsage) || formatButtonName(btnId);
    const sourceName = getUsageName(mapping.source_usage) || mapping.source_usage;
    
    console.log('Target name:', targetName, 'Source name:', sourceName);
    
    overlay.querySelector('.target-button-name').textContent = targetName;
    overlay.querySelector('.countdown-circle').textContent = '✓';
    overlay.querySelector('.countdown-circle').style.background = 'var(--es-success)';
    overlay.querySelector('.countdown-circle').style.color = 'white';
    overlay.querySelector('.mapping-status').innerHTML = `
        <strong style="color: var(--es-success);">Huidige mapping:</strong><br>
        <span style="font-size: 1.1rem;">${sourceName}</span> → <span style="font-size: 1.1rem;">${targetName}</span>
    `;
    overlay.classList.add('active');
    overlay.classList.add('existing-mapping');
    
    console.log('Overlay activated, adding highlight to element:', element);
    console.log('Element classList before:', element.classList.toString());
    
    // Flash the button on the controller to show which one is selected
    element.classList.remove('mapped-highlight'); // Reset if already has it
    void element.offsetWidth; // Force reflow to restart animation
    element.classList.add('mapped-highlight');
    
    console.log('Element classList after:', element.classList.toString());
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        overlay.classList.remove('active');
        overlay.classList.remove('existing-mapping');
        element.classList.remove('mapped-highlight');
        overlay.querySelector('.countdown-circle').style.background = '';
        overlay.querySelector('.countdown-circle').style.color = '';
    }, 3000);
}

// Cancel current mapping operation
function cancelMapping() {
    if (easySetupState.countdownInterval) {
        clearInterval(easySetupState.countdownInterval);
        easySetupState.countdownInterval = null;
    }
    
    if (easySetupState.waitingButton) {
        easySetupState.waitingButton.element.classList.remove('waiting');
    }
    
    easySetupState.waitingForInput = false;
    easySetupState.waitingButton = null;
    easySetupState.lastInputTime = 0;
    easySetupState.lastInputUsage = null;
    
    // Hide overlay and reset status
    const overlay = document.querySelector('.mapping-overlay');
    overlay.classList.remove('active');
    overlay.classList.remove('existing-mapping');
    overlay.querySelector('.mapping-status').textContent = 'Druk nu een knop in op je hardware';
    overlay.querySelector('.mapping-status').style.color = 'var(--es-text-muted)';
    
    // Stop input listening
    stopInputListening();
}

// Complete a mapping when hardware input is detected
function completeMapping(sourceUsage, sourcePort = 0) {
    console.log('completeMapping called:', sourceUsage, sourcePort);
    if (!easySetupState.waitingButton) {
        console.log('No waiting button, returning');
        return;
    }
    
    // Handle stick "both axes" mapping
    if (easySetupState.pendingStickMapping) {
        completeBothAxesMapping(sourceUsage, sourcePort);
        return;
    }
    
    console.log('Waiting button:', easySetupState.waitingButton);
    
    // Check if this target already has a mapping and remove it
    const existingIndex = easySetupState.mappings.findIndex(m => m.target_usage === easySetupState.waitingButton.targetUsage);
    if (existingIndex !== -1) {
        console.log('Removing existing mapping at index:', existingIndex);
        easySetupState.mappings.splice(existingIndex, 1);
    }
    
    // Apply deadzone for axis mappings
    const isAxis = isAxisMapping(easySetupState.waitingButton.btnId);
    
    const mapping = {
        source_usage: sourceUsage,
        source_port: sourcePort,
        target_usage: easySetupState.waitingButton.targetUsage,
        layer: 0,
        sticky: false,
        scaling: easySetupState.sensitivity * 10, // Convert percentage to scaling factor
        deadzone: isAxis ? easySetupState.deadzone : 0 // Apply deadzone only to axes
    };
    
    // Add to our local mappings list
    easySetupState.mappings.push(mapping);
    console.log('Mapping added! Current mappings:', easySetupState.mappings);
    
    // Mark button as mapped
    easySetupState.waitingButton.element.classList.remove('waiting');
    easySetupState.waitingButton.element.classList.add('mapped');
    
    // Also mark axis button if it exists
    const axisBtn = document.querySelector(`.axis-btn[data-btn-id="${easySetupState.waitingButton.btnId}"]`);
    if (axisBtn) {
        axisBtn.classList.add('mapped');
    }
    
    // Show success message in overlay briefly
    const overlay = document.querySelector('.mapping-overlay');
    const sourceName = getUsageName(sourceUsage) || sourceUsage;
    const targetName = getUsageName(easySetupState.waitingButton.targetUsage) || easySetupState.waitingButton.btnId;
    overlay.querySelector('.countdown-circle').textContent = '✓';
    overlay.querySelector('.mapping-status').textContent = `Gemapped: ${sourceName} → ${targetName}`;
    overlay.querySelector('.mapping-status').style.color = 'var(--es-success)';
    
    // Clean up after showing success
    setTimeout(() => {
        cancelMapping();
    }, 1500);
    
    // Update mappings panel
    updateMappingsPanel();
    
    // Sync with main config
    syncMappingsToConfig();
}

// Listen for hardware input during mapping AND for live visualization
let monitorCallback = null;
let liveInputCallback = null;

function startInputListening() {
    // Hook into the monitor system
    monitorCallback = (usage, value, port) => {
        console.log('Easy Setup received input:', usage, value, port, 'waiting:', easySetupState.waitingForInput);
        if (easySetupState.waitingForInput) {
            // For buttons, value 1 means pressed, 0 means released
            // For axes, any non-zero value means movement
            // Accept any non-zero value as input, but debounce to avoid fluctuations
            if (value !== 0) {
                const now = Date.now();
                const timeSinceLastInput = now - easySetupState.lastInputTime;
                
                // Debounce: only accept input if it's different from last input or enough time has passed
                if (usage !== easySetupState.lastInputUsage || timeSinceLastInput > easySetupState.inputDebounceMs) {
                    easySetupState.lastInputTime = now;
                    easySetupState.lastInputUsage = usage;
                    
                    // Update overlay to show detected input
                    const overlay = document.querySelector('.mapping-overlay');
                    const sourceName = getUsageName(usage) || usage;
                    overlay.querySelector('.mapping-status').textContent = `Gedetecteerd: ${sourceName}`;
                    
                    // Small delay before completing to show the detected input
                    setTimeout(() => {
                        console.log('Completing mapping with:', usage, value, port);
                        completeMapping(usage, port);
                    }, 200);
                }
            }
        }
    };
    
    // Always register the callback
    window.easySetupMonitorCallback = monitorCallback;
    console.log('Easy Setup monitor callback registered, waiting for input...');
    
    // Enable monitor by triggering the Monitor tab show event
    // This will call monitor_tab_shown which enables the monitor
    const monitorTab = document.getElementById('nav-monitor-tab');
    if (monitorTab) {
        // Dispatch the shown.bs.tab event to enable monitor
        const showEvent = new Event('shown.bs.tab', { bubbles: true });
        monitorTab.dispatchEvent(showEvent);
        console.log('Monitor enabled via tab event dispatch');
    }
}

function stopInputListening() {
    window.easySetupMonitorCallback = null;
    monitorCallback = null;
    
    // Don't disable monitor here - it might be used by the Monitor tab
    // The monitor will be disabled when the user closes the device or navigates away
}

// Start live input visualization - shows mapped buttons lighting up when hardware input is received
function startLiveInputVisualization() {
    console.log('Starting live input visualization...');
    
    liveInputCallback = (usage, value, port) => {
        // Don't interfere with mapping mode
        if (easySetupState.waitingForInput) return;
        
        // Find if this source_usage is mapped to any target
        const mapping = easySetupState.mappings.find(m => m.source_usage === usage);
        if (!mapping) return;
        
        // Find the button element for this target
        const buttonUsages = BUTTON_USAGES[easySetupState.currentControllerType] || {};
        const btnId = Object.keys(buttonUsages).find(key => buttonUsages[key] === mapping.target_usage);
        if (!btnId) return;
        
        const controller = document.querySelector('.controller:not(.hidden)');
        if (!controller) return;
        
        const buttonElement = controller.querySelector(`[data-btn-id="${btnId}"]`);
        if (!buttonElement) return;
        
        // Show pressed state when value > 0, remove when released
        if (value !== 0) {
            console.log('Live input: pressing', btnId);
            buttonElement.classList.add('live-pressed');
        } else {
            console.log('Live input: releasing', btnId);
            buttonElement.classList.remove('live-pressed');
        }
    };
    
    window.easySetupLiveCallback = liveInputCallback;
    
    // Also enable monitor
    const monitorTab = document.getElementById('nav-monitor-tab');
    if (monitorTab) {
        const showEvent = new Event('shown.bs.tab', { bubbles: true });
        monitorTab.dispatchEvent(showEvent);
    }
}

function stopLiveInputVisualization() {
    window.easySetupLiveCallback = null;
    liveInputCallback = null;
    
    // Remove all live-pressed classes
    document.querySelectorAll('.live-pressed').forEach(el => el.classList.remove('live-pressed'));
}

// Update the mappings summary panel
function updateMappingsPanel() {
    const panel = document.querySelector('.mappings-list');
    if (!panel) return;
    
    panel.innerHTML = '';
    
    if (easySetupState.mappings.length === 0) {
        panel.innerHTML = '<div class="text-muted text-center py-3">Nog geen mappings geconfigureerd</div>';
        return;
    }
    
    easySetupState.mappings.forEach((mapping, index) => {
        const item = document.createElement('div');
        item.className = 'mapping-item';
        
        const sourceName = getUsageName(mapping.source_usage) || mapping.source_usage;
        let targetName = getUsageName(mapping.target_usage) || mapping.target_usage;
        
        // Add direction indicator for button-to-axis mappings
        let directionIndicator = '';
        if (mapping.isButtonToAxis && mapping.direction) {
            const dirIcons = {
                'x-positive': '→',
                'x-negative': '←',
                'y-positive': '↓',
                'y-negative': '↑'
            };
            directionIndicator = dirIcons[mapping.direction] || '';
            if (mapping.strength && mapping.strength !== 100) {
                directionIndicator += ` ${mapping.strength}%`;
            }
        }
        
        // Find the button element for this mapping to highlight it
        const btnId = Object.keys(BUTTON_USAGES[easySetupState.currentControllerType] || {}).find(
            key => BUTTON_USAGES[easySetupState.currentControllerType][key] === mapping.target_usage
        );
        
        item.innerHTML = `
            <div class="mapping-info">
                <span class="mapping-label">Input:</span>
                <span class="source-name">${sourceName}</span>
            </div>
            <span class="mapping-arrow">→</span>
            <div class="mapping-info">
                <span class="mapping-label">Output:</span>
                <span class="target-name">${targetName} ${directionIndicator}</span>
            </div>
            <button class="delete-mapping" data-index="${index}" title="Verwijder mapping">×</button>
        `;
        
        // Add special styling for button-to-axis mappings
        if (mapping.isButtonToAxis) {
            item.classList.add('button-to-axis');
        }
        
        // Add click handler to show mapping on controller
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-mapping')) {
                // Find and highlight the button on the controller
                if (btnId) {
                    const controller = document.querySelector('.controller:not(.hidden)');
                    if (controller) {
                        const buttonElement = controller.querySelector(`[data-btn-id="${btnId}"]`);
                        if (buttonElement) {
                            showExistingMapping(btnId, mapping.target_usage, buttonElement, mapping);
                        }
                    }
                }
            }
        });
        
        item.querySelector('.delete-mapping').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteMapping(index);
        });
        
        panel.appendChild(item);
    });
}

// Delete a mapping
function deleteMapping(index) {
    easySetupState.mappings.splice(index, 1);
    updateMappingsPanel();
    syncMappingsToConfig();
}

// Sync mappings to the main config
function syncMappingsToConfig() {
    // Trigger custom event to sync with main code.js
    const event = new CustomEvent('easySetupMappingsChanged', {
        detail: { mappings: easySetupState.mappings }
    });
    document.dispatchEvent(event);
}

// Get human-readable name for a usage code
function getUsageName(usageCode) {
    // Get the current descriptor number to look up the correct usage names
    const easySetupDropdown = document.getElementById('easy-setup-device-type-dropdown');
    const mainDropdown = document.getElementById('our_descriptor_number_dropdown');
    const dropdown = easySetupDropdown || mainDropdown;
    const descriptorIdx = dropdown ? parseInt(dropdown.value, 10) : 5; // Default to 5 (XAC)
    
    // Check in the correct descriptor's usages
    if (usages[descriptorIdx] && usages[descriptorIdx][usageCode]) {
        return usages[descriptorIdx][usageCode].name;
    }
    
    // Fallback: Check in source usages
    for (const category of ['source_0', 'source_1', 'source']) {
        if (usages[category] && usages[category][usageCode]) {
            return usages[category][usageCode].name;
        }
    }
    // Fallback: Check in target usages
    for (const category of ['target_0', 'target_1', 'target']) {
        if (usages[category] && usages[category][usageCode]) {
            return usages[category][usageCode].name;
        }
    }
    return null;
}

// Set up the mapping overlay
function setupMappingOverlay() {
    const overlay = document.querySelector('.mapping-overlay');
    if (!overlay) return;
    
    overlay.querySelector('.cancel-btn').addEventListener('click', cancelMapping);
}

// Set up sensitivity and deadzone sliders
function setupSliderControls() {
    const sensitivitySlider = document.getElementById('easy-sensitivity');
    const deadzoneSlider = document.getElementById('easy-deadzone');
    
    if (sensitivitySlider) {
        sensitivitySlider.addEventListener('input', (e) => {
            easySetupState.sensitivity = parseInt(e.target.value);
            document.getElementById('sensitivity-value').textContent = `${easySetupState.sensitivity}%`;
        });
    }
    
    if (deadzoneSlider) {
        deadzoneSlider.addEventListener('input', (e) => {
            easySetupState.deadzone = parseInt(e.target.value);
            document.getElementById('deadzone-value').textContent = `${easySetupState.deadzone}%`;
        });
    }
}

// Set up template expression selector
function setupTemplateSelector() {
    const select = document.getElementById('template-select');
    if (!select) return;
    
    EXPRESSION_TEMPLATES.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        select.appendChild(option);
    });
    
    const applyBtn = document.querySelector('.template-apply-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', applySelectedTemplate);
    }
}

// Apply the selected template
function applySelectedTemplate() {
    const select = document.getElementById('template-select');
    const templateId = select.value;
    
    const template = EXPRESSION_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    
    // Trigger event to apply template to main config
    const event = new CustomEvent('easySetupApplyTemplate', {
        detail: template
    });
    document.dispatchEvent(event);
    
    // Show confirmation
    showToast(`Template "${template.name}" toegepast!`);
}

// Set up advanced mode toggle
function setupAdvancedToggle() {
    const toggleBtn = document.querySelector('.advanced-toggle-btn');
    if (!toggleBtn) return;
    
    toggleBtn.addEventListener('click', () => {
        // Switch to the advanced mappings tab
        const mappingsTab = document.getElementById('nav-mappings-tab');
        if (mappingsTab) {
            mappingsTab.click();
        }
    });
}

// Show toast notification
function showToast(message) {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = 'easy-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--es-success, #00d9a5);
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        z-index: 9999;
        animation: fadeInOut 2s forwards;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// Clear all mappings
export function clearAllMappings() {
    easySetupState.mappings = [];
    
    // Reset button states (now using data-btn-id instead of btn-region class)
    document.querySelectorAll('[data-btn-id].mapped').forEach(el => {
        el.classList.remove('mapped');
    });
    
    updateMappingsPanel();
    syncMappingsToConfig();
}

// Export current mappings for the main config
export function getEasySetupMappings() {
    return easySetupState.mappings;
}

// Get controller type descriptor index
export function getControllerDescriptorIdx() {
    return CONTROLLER_TYPES[easySetupState.currentControllerType].descriptorIdx;
}

// ============================================
// STICK MAPPING PANEL
// ============================================

let stickPanelState = {
    isOpen: false,
    currentStick: null, // 'left' or 'right'
    stickElement: null,
    inputType: 'axis', // 'axis' or 'button'
    xMapping: null,
    yMapping: null,
    // Button-to-axis mappings
    buttonMappings: {
        'x-positive': null, // { usage, port }
        'x-negative': null,
        'y-positive': null,
        'y-negative': null
    },
    xStrength: 100, // Percentage of full axis movement for buttons
    yStrength: 100,
    deadzone: 15,
    sensitivity: 100,
    invertX: false,
    invertY: false,
    waitingForAxis: null, // 'x', 'y', or null
    waitingForButton: null, // 'x-positive', 'x-negative', 'y-positive', 'y-negative', or null
    waitingButtonElement: null,
    waitingDirectionDiv: null,
    livePreviewActive: false
};

// Open the stick mapping panel
function openStickMappingPanel(stick, element) {
    console.log('Opening stick mapping panel for:', stick);
    
    const panel = document.getElementById('stick-mapping-panel');
    if (!panel) return;
    
    stickPanelState.isOpen = true;
    stickPanelState.currentStick = stick;
    stickPanelState.stickElement = element;
    
    // Update panel title
    const title = panel.querySelector('.stick-panel-title');
    title.textContent = stick === 'left' ? 'Linker Stick' : 'Rechter Stick';
    
    // Load existing mappings for this stick
    loadExistingStickMappings(stick);
    
    // Update UI state
    updateStickPanelUI();
    
    // Set up panel event listeners
    setupStickPanelListeners();
    
    // Start live preview
    startStickLivePreview();
    
    // Show panel
    panel.classList.add('active');
}

// Close the stick mapping panel
function closeStickMappingPanel() {
    const panel = document.getElementById('stick-mapping-panel');
    if (!panel) return;
    
    stickPanelState.isOpen = false;
    stickPanelState.waitingForAxis = null;
    stickPanelState.waitingForButton = null;
    
    // Stop live preview
    stopStickLivePreview();
    
    // Remove waiting states
    panel.querySelectorAll('.map-axis-btn.waiting').forEach(btn => btn.classList.remove('waiting'));
    
    // Hide panel
    panel.classList.remove('active');
    
    // Save stick mappings
    saveStickMappings();
}

// Load existing mappings for the current stick
function loadExistingStickMappings(stick) {
    const xUsage = stick === 'left' ? '0x00010030' : '0x00010032';
    const yUsage = stick === 'left' ? '0x00010031' : '0x00010035';
    
    // Find existing X mapping
    stickPanelState.xMapping = easySetupState.mappings.find(m => m.target_usage === xUsage) || null;
    
    // Find existing Y mapping
    stickPanelState.yMapping = easySetupState.mappings.find(m => m.target_usage === yUsage) || null;
    
    // Load deadzone/sensitivity from existing mappings or use defaults
    if (stickPanelState.xMapping) {
        stickPanelState.deadzone = stickPanelState.xMapping.deadzone || 15;
        stickPanelState.sensitivity = (stickPanelState.xMapping.scaling || 1000) / 10;
    }
}

// Update the panel UI based on current state
function updateStickPanelUI() {
    const panel = document.getElementById('stick-mapping-panel');
    if (!panel) return;
    
    // Update X axis section
    const xSection = panel.querySelector('.axis-mapping-section[data-axis="x"]');
    const xStatus = xSection.querySelector('.axis-status');
    const xInfo = xSection.querySelector('.axis-source-info');
    
    if (stickPanelState.xMapping) {
        xSection.classList.add('mapped');
        xStatus.textContent = '✓ Gemapped';
        xStatus.classList.add('mapped');
        const sourceName = getUsageName(stickPanelState.xMapping.source_usage) || stickPanelState.xMapping.source_usage;
        xInfo.textContent = `Bron: ${sourceName}`;
    } else {
        xSection.classList.remove('mapped');
        xStatus.textContent = 'Niet gemapped';
        xStatus.classList.remove('mapped');
        xInfo.textContent = '';
    }
    
    // Update Y axis section
    const ySection = panel.querySelector('.axis-mapping-section[data-axis="y"]');
    const yStatus = ySection.querySelector('.axis-status');
    const yInfo = ySection.querySelector('.axis-source-info');
    
    if (stickPanelState.yMapping) {
        ySection.classList.add('mapped');
        yStatus.textContent = '✓ Gemapped';
        yStatus.classList.add('mapped');
        const sourceName = getUsageName(stickPanelState.yMapping.source_usage) || stickPanelState.yMapping.source_usage;
        yInfo.textContent = `Bron: ${sourceName}`;
    } else {
        ySection.classList.remove('mapped');
        yStatus.textContent = 'Niet gemapped';
        yStatus.classList.remove('mapped');
        yInfo.textContent = '';
    }
    
    // Update sliders
    const deadzoneSlider = panel.querySelector('.stick-deadzone-slider');
    const sensitivitySlider = panel.querySelector('.stick-sensitivity-slider');
    
    if (deadzoneSlider) {
        deadzoneSlider.value = stickPanelState.deadzone;
        deadzoneSlider.nextElementSibling.textContent = `${stickPanelState.deadzone}%`;
    }
    
    if (sensitivitySlider) {
        sensitivitySlider.value = stickPanelState.sensitivity;
        sensitivitySlider.nextElementSibling.textContent = `${stickPanelState.sensitivity}%`;
    }
    
    // Update deadzone ring visual
    updateDeadzoneRingVisual();
}

// Update the visual deadzone ring
function updateDeadzoneRingVisual() {
    const ring = document.querySelector('.stick-deadzone-ring');
    if (ring) {
        const size = stickPanelState.deadzone * 2; // Scale to percentage of container
        ring.style.width = `${size}%`;
        ring.style.height = `${size}%`;
    }
}

// Set up panel event listeners
function setupStickPanelListeners() {
    const panel = document.getElementById('stick-mapping-panel');
    if (!panel) return;
    
    // Close button
    const closeBtn = panel.querySelector('.stick-panel-close');
    closeBtn.onclick = closeStickMappingPanel;
    
    // Done button
    const doneBtn = panel.querySelector('.stick-panel-done');
    doneBtn.onclick = closeStickMappingPanel;
    
    // Map axis buttons
    panel.querySelectorAll('.map-axis-btn').forEach(btn => {
        btn.onclick = () => startAxisMapping(btn.dataset.axis);
    });
    
    // Input type toggle
    panel.querySelectorAll('.input-type-btn').forEach(btn => {
        btn.onclick = () => toggleInputType(btn.dataset.type);
    });
    
    // Button-to-axis mapping buttons (new structure)
    panel.querySelectorAll('.map-btn-axis').forEach(btn => {
        const directionDiv = btn.closest('.button-direction');
        const direction = directionDiv.dataset.direction;
        btn.onclick = () => startButtonToAxisMapping(direction, btn, directionDiv);
    });
    
    // Strength sliders for button mode
    panel.querySelectorAll('.strength-slider').forEach(slider => {
        slider.oninput = (e) => {
            const value = parseInt(e.target.value);
            const axis = e.target.dataset.axis;
            e.target.nextElementSibling.textContent = `${value}%`;
            
            // Store strength in state
            if (axis === 'x') {
                stickPanelState.xStrength = value;
            } else {
                stickPanelState.yStrength = value;
            }
        };
    });
    
    // Deadzone slider
    const deadzoneSlider = panel.querySelector('.stick-deadzone-slider');
    if (deadzoneSlider) {
        deadzoneSlider.oninput = (e) => {
            stickPanelState.deadzone = parseInt(e.target.value);
            e.target.nextElementSibling.textContent = `${stickPanelState.deadzone}%`;
            updateDeadzoneRingVisual();
        };
    }
    
    // Sensitivity slider
    const sensitivitySlider = panel.querySelector('.stick-sensitivity-slider');
    if (sensitivitySlider) {
        sensitivitySlider.oninput = (e) => {
            stickPanelState.sensitivity = parseInt(e.target.value);
            e.target.nextElementSibling.textContent = `${stickPanelState.sensitivity}%`;
        };
    }
    
    // Invert checkboxes
    const invertX = panel.querySelector('.invert-x');
    const invertY = panel.querySelector('.invert-y');
    
    if (invertX) invertX.onchange = (e) => { stickPanelState.invertX = e.target.checked; };
    if (invertY) invertY.onchange = (e) => { stickPanelState.invertY = e.target.checked; };
}

// Toggle input type (axis or button)
function toggleInputType(type) {
    const panel = document.getElementById('stick-mapping-panel');
    
    // Update button states
    panel.querySelectorAll('.input-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    stickPanelState.inputType = type;
    
    // Show/hide relevant sections
    const buttonMode = panel.querySelector('.button-mapping-mode');
    const axisSections = panel.querySelector('.stick-axis-mappings');
    
    if (type === 'button') {
        buttonMode.style.display = 'flex';
        axisSections.style.display = 'none';
    } else {
        buttonMode.style.display = 'none';
        axisSections.style.display = 'flex';
    }
}

// Start mapping an axis
// Axis detection state
let axisDetectionState = {
    movementTracker: {}, // { usage: { maxAbsValue, port, lastValue } }
    detectionTimeout: null,
    detectionWindowMs: 500, // Time window to collect movement data
    minMovementThresholdPercent: 0.15, // 15% of observed max value
    absoluteMinThreshold: 20, // Absolute minimum (for 0-255 joysticks: 20 is ~8%)
    dominanceRatio: 2.0, // Dominant axis must be 2x larger than others (lowered from 2.5)
    observedMaxValue: 0 // Track the largest value we've seen to adapt threshold
};

function startAxisMapping(axis) {
    console.log('Starting axis mapping for:', axis);
    
    const panel = document.getElementById('stick-mapping-panel');
    const btn = panel.querySelector(`.map-axis-btn[data-axis="${axis}"]`);
    
    // Set waiting state
    stickPanelState.waitingForAxis = axis;
    btn.classList.add('waiting');
    btn.textContent = axis === 'x' ? 'Beweeg ←→...' : 'Beweeg ↑↓...';
    
    // Reset movement tracker and adaptive threshold
    axisDetectionState.movementTracker = {};
    axisDetectionState.observedMaxValue = 0;
    if (axisDetectionState.detectionTimeout) {
        clearTimeout(axisDetectionState.detectionTimeout);
    }
    
    // Register callback for input
    window.stickMappingCallback = (usage, value, port) => {
        if (!stickPanelState.waitingForAxis) return;
        
        const absValue = Math.abs(value);
        
        // Track movement for each usage
        if (!axisDetectionState.movementTracker[usage]) {
            axisDetectionState.movementTracker[usage] = { maxAbsValue: 0, port: port, lastValue: 0 };
        }
        
        // Update max absolute value seen for this usage
        if (absValue > axisDetectionState.movementTracker[usage].maxAbsValue) {
            axisDetectionState.movementTracker[usage].maxAbsValue = absValue;
            axisDetectionState.movementTracker[usage].port = port;
        }
        axisDetectionState.movementTracker[usage].lastValue = value;
        
        // Check if we have a clear dominant axis
        checkForDominantAxis(btn);
    };
    
    // Enable monitor
    const monitorTab = document.getElementById('nav-monitor-tab');
    if (monitorTab) {
        const showEvent = new Event('shown.bs.tab', { bubbles: true });
        monitorTab.dispatchEvent(showEvent);
    }
}

// Check if we have a clear dominant axis
function checkForDominantAxis(btn) {
    const tracker = axisDetectionState.movementTracker;
    const usages = Object.keys(tracker);
    
    if (usages.length === 0) return;
    
    // Find the usage with the highest max value
    let dominantUsage = null;
    let dominantValue = 0;
    let secondHighestValue = 0;
    let dominantPort = 0;
    
    usages.forEach(usage => {
        const data = tracker[usage];
        if (data.maxAbsValue > dominantValue) {
            secondHighestValue = dominantValue;
            dominantValue = data.maxAbsValue;
            dominantUsage = usage;
            dominantPort = data.port;
        } else if (data.maxAbsValue > secondHighestValue) {
            secondHighestValue = data.maxAbsValue;
        }
    });
    
    console.log('Axis detection - Dominant:', dominantUsage, dominantValue, 'Second:', secondHighestValue);
    
    // Update observed max value for adaptive threshold
    if (dominantValue > axisDetectionState.observedMaxValue) {
        axisDetectionState.observedMaxValue = dominantValue;
    }
    
    // Calculate adaptive threshold based on observed max value
    // Use percentage of max value, but at least the absolute minimum
    const adaptiveThreshold = Math.max(
        axisDetectionState.observedMaxValue * axisDetectionState.minMovementThresholdPercent,
        axisDetectionState.absoluteMinThreshold
    );
    
    console.log('Adaptive threshold:', adaptiveThreshold, 'Observed max:', axisDetectionState.observedMaxValue);
    
    // Check if dominant axis meets our criteria:
    // 1. Above adaptive minimum threshold
    // 2. At least dominanceRatio times larger than second highest (or second is 0)
    const meetsThreshold = dominantValue >= adaptiveThreshold;
    const isDominant = secondHighestValue === 0 || 
                       (dominantValue / secondHighestValue) >= axisDetectionState.dominanceRatio;
    
    if (meetsThreshold && isDominant && dominantUsage) {
        console.log('Dominant axis found:', dominantUsage, 'value:', dominantValue);
        
        // Accept this axis
        completeAxisMapping(dominantUsage, dominantPort, btn);
    }
}

// Complete the axis mapping
function completeAxisMapping(usage, port, btn) {
    const axisMapped = stickPanelState.waitingForAxis;
    const stick = stickPanelState.currentStick;
    const targetUsage = axisMapped === 'x' 
        ? (stick === 'left' ? '0x00010030' : '0x00010032')
        : (stick === 'left' ? '0x00010031' : '0x00010035');
    
    // Create mapping
    const mapping = {
        source_usage: usage,
        source_port: port,
        target_usage: targetUsage,
        layer: 0,
        sticky: false,
        scaling: stickPanelState.sensitivity * 10,
        deadzone: stickPanelState.deadzone
    };
    
    // Remove existing mapping for this target
    const existingIdx = easySetupState.mappings.findIndex(m => m.target_usage === targetUsage);
    if (existingIdx !== -1) {
        easySetupState.mappings.splice(existingIdx, 1);
    }
    
    // Add new mapping
    easySetupState.mappings.push(mapping);
    
    // Update state
    if (axisMapped === 'x') {
        stickPanelState.xMapping = mapping;
    } else {
        stickPanelState.yMapping = mapping;
    }
    
    // Reset button
    btn.classList.remove('waiting');
    btn.textContent = 'Map Input';
    stickPanelState.waitingForAxis = null;
    
    // Clear tracking
    axisDetectionState.movementTracker = {};
    window.stickMappingCallback = null;
    
    // Update UI
    updateStickPanelUI();
    updateMappingsPanel();
    
    // Mark stick as mapped on controller
    if (stickPanelState.stickElement) {
        stickPanelState.stickElement.classList.add('mapped');
    }
}

// Start button-to-axis mapping
function startButtonToAxisMapping(direction, btn, directionDiv) {
    console.log('Starting button-to-axis mapping for:', direction);
    
    stickPanelState.waitingForButton = direction;
    stickPanelState.waitingButtonElement = btn;
    stickPanelState.waitingDirectionDiv = directionDiv;
    
    btn.textContent = '...';
    btn.classList.add('waiting');
    
    // Register callback
    window.stickMappingCallback = (usage, value, port) => {
        // Only accept button presses (value > 0, and it should be a button, not an axis)
        // Buttons typically have value of 1 when pressed
        // Axes have large values like thousands
        if (stickPanelState.waitingForButton && value !== 0) {
            const dir = stickPanelState.waitingForButton;
            const currentBtn = stickPanelState.waitingButtonElement;
            const currentDiv = stickPanelState.waitingDirectionDiv;
            
            // Store button mapping
            stickPanelState.buttonMappings[dir] = { usage, port };
            
            // Create the actual mapping
            createButtonToAxisMapping(dir, usage, port);
            
            // Update UI
            currentBtn.textContent = 'Map';
            currentBtn.classList.remove('waiting');
            currentDiv.classList.add('mapped');
            
            const statusSpan = currentDiv.querySelector('.btn-status');
            const shortName = getUsageName(usage) || usage;
            // Truncate long names
            statusSpan.textContent = shortName.length > 8 ? shortName.substring(0, 8) + '...' : shortName;
            statusSpan.classList.add('mapped');
            statusSpan.title = shortName;
            
            stickPanelState.waitingForButton = null;
            stickPanelState.waitingButtonElement = null;
            stickPanelState.waitingDirectionDiv = null;
            window.stickMappingCallback = null;
            
            // Mark stick as mapped
            if (stickPanelState.stickElement) {
                stickPanelState.stickElement.classList.add('mapped');
            }
            
            updateMappingsPanel();
        }
    };
    
    // Enable monitor
    const monitorTab = document.getElementById('nav-monitor-tab');
    if (monitorTab) {
        const showEvent = new Event('shown.bs.tab', { bubbles: true });
        monitorTab.dispatchEvent(showEvent);
    }
}

// Create the actual button-to-axis mapping
function createButtonToAxisMapping(direction, sourceUsage, sourcePort) {
    const stick = stickPanelState.currentStick;
    const axis = direction.startsWith('x') ? 'x' : 'y';
    const isPositive = direction.includes('positive');
    
    // Get target usage for this axis
    const targetUsage = axis === 'x'
        ? (stick === 'left' ? '0x00010030' : '0x00010032')
        : (stick === 'left' ? '0x00010031' : '0x00010035');
    
    // Get strength percentage
    const strength = axis === 'x' ? stickPanelState.xStrength : stickPanelState.yStrength;
    
    // Calculate scaling value
    // For button-to-axis: we want pressing the button to output a specific axis value
    // Positive direction = positive value, Negative direction = negative value
    // The scaling determines how much of the full range to use
    // Full range is typically 32767, so at 100% we want to output 32767 (or -32767)
    const maxValue = 32767;
    const outputValue = Math.round(maxValue * (strength / 100));
    
    // Create mapping
    // For button-to-axis, we use a special scaling approach:
    // - Source is a button (value 0 or 1)
    // - We want to multiply by the output value
    const scaling = isPositive ? outputValue : -outputValue;
    
    const mapping = {
        source_usage: sourceUsage,
        source_port: sourcePort,
        target_usage: targetUsage,
        layer: 0,
        sticky: false,
        scaling: scaling,
        deadzone: 0, // No deadzone for buttons
        isButtonToAxis: true, // Mark this as button-to-axis mapping
        direction: direction,
        strength: strength
    };
    
    // Remove existing mapping for this exact direction
    const existingIdx = easySetupState.mappings.findIndex(m => 
        m.target_usage === targetUsage && 
        m.isButtonToAxis && 
        m.direction === direction
    );
    if (existingIdx !== -1) {
        easySetupState.mappings.splice(existingIdx, 1);
    }
    
    // Add new mapping
    easySetupState.mappings.push(mapping);
    
    console.log('Created button-to-axis mapping:', mapping);
    
    // Sync to main config
    syncMappingsToConfig();
}

// Start live preview for the stick
function startStickLivePreview() {
    stickPanelState.livePreviewActive = true;
    
    window.stickPreviewCallback = (usage, value, port) => {
        if (!stickPanelState.livePreviewActive) return;
        
        const dot = document.querySelector('.stick-preview-dot');
        const xValue = document.querySelector('.x-value');
        const yValue = document.querySelector('.y-value');
        if (!dot) return;
        
        // Check if this usage matches our mapped axes
        const stick = stickPanelState.currentStick;
        const xTargetUsage = stick === 'left' ? '0x00010030' : '0x00010032';
        const yTargetUsage = stick === 'left' ? '0x00010031' : '0x00010035';
        
        // Also check source usages from mappings
        const xSource = stickPanelState.xMapping?.source_usage;
        const ySource = stickPanelState.yMapping?.source_usage;
        
        // Normalize value to -1 to 1 range (assuming 32-bit signed or similar)
        let normalizedValue = value;
        if (Math.abs(value) > 1) {
            normalizedValue = value / 32767; // Common joystick range
        }
        
        // Clamp to -1 to 1
        normalizedValue = Math.max(-1, Math.min(1, normalizedValue));
        
        // Update position based on which axis this is
        if (usage === xSource || usage === xTargetUsage) {
            const x = 50 + (normalizedValue * 40); // 40% movement range
            dot.style.left = `${x}%`;
            xValue.textContent = `X: ${Math.round(normalizedValue * 100)}`;
        } else if (usage === ySource || usage === yTargetUsage) {
            const y = 50 + (normalizedValue * 40); // Inverted for visual
            dot.style.top = `${y}%`;
            yValue.textContent = `Y: ${Math.round(normalizedValue * 100)}`;
        }
    };
    
    // Enable monitor
    const monitorTab = document.getElementById('nav-monitor-tab');
    if (monitorTab) {
        const showEvent = new Event('shown.bs.tab', { bubbles: true });
        monitorTab.dispatchEvent(showEvent);
    }
}

// Stop live preview
function stopStickLivePreview() {
    stickPanelState.livePreviewActive = false;
    window.stickPreviewCallback = null;
    
    // Reset dot position
    const dot = document.querySelector('.stick-preview-dot');
    if (dot) {
        dot.style.left = '50%';
        dot.style.top = '50%';
    }
}

// Save stick mappings when closing panel
function saveStickMappings() {
    // Update deadzone and sensitivity on existing mappings
    if (stickPanelState.xMapping) {
        stickPanelState.xMapping.deadzone = stickPanelState.deadzone;
        stickPanelState.xMapping.scaling = stickPanelState.sensitivity * 10;
    }
    if (stickPanelState.yMapping) {
        stickPanelState.yMapping.deadzone = stickPanelState.deadzone;
        stickPanelState.yMapping.scaling = stickPanelState.sensitivity * 10;
    }
    
    // Sync to main config
    syncMappingsToConfig();
    updateMappingsPanel();
}

export { EXPRESSION_TEMPLATES, CONTROLLER_TYPES };
