// Easy Setup functionality for HID Remapper
// Provides visual controller mapping interface

// Extract and adapt stick visualization from joypad.ai style SVG
// Based on the exact structure from the provided SVG
// isLeftStick: true for left stick (green), false for right stick (grey/white)
function create_joypad_style_stick(cx, cy, radius, hasMapping, clickHandler, isLeftStick = true) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(svgNS, 'g');
    
    // Color scheme: green for left stick, grey/white for right stick
    const isGreen = isLeftStick;
    const outerColor = isGreen ? '#00ff7f' : '#8e8e8e'; // springgreen for left, grey for right
    const innerColor = isGreen ? '#1a1a1a' : '#2a2a2a'; // dark for left, darker grey for right
    const crosshairColor = isGreen ? '#fff' : '#fff'; // white crosshair for both
    const centerSquareColor = isGreen ? '#2a2a2a' : '#fff'; // dark square for left, white for right
    
    // Outer circle (stick housing) - like circle160: r="156.10001" 
    // In our scale, this is the main radius
    const outerCircle = document.createElementNS(svgNS, 'circle');
    outerCircle.setAttribute('cx', cx);
    outerCircle.setAttribute('cy', cy);
    outerCircle.setAttribute('r', radius);
    outerCircle.setAttribute('fill', hasMapping ? '#28a745' : outerColor);
    outerCircle.setAttribute('fill-opacity', isGreen ? '0.3' : '0.4');
    outerCircle.setAttribute('stroke', hasMapping ? '#1e7e34' : (isGreen ? '#00cc66' : '#666'));
    outerCircle.setAttribute('stroke-width', '2');
    outerCircle.style.cursor = 'pointer';
    if (clickHandler) outerCircle.addEventListener('click', clickHandler);
    group.appendChild(outerCircle);
    
    // Inner circle - like circle162: r="145.28999" (about 93% of outer)
    const innerCircle = document.createElementNS(svgNS, 'circle');
    innerCircle.setAttribute('cx', cx);
    innerCircle.setAttribute('cy', cy);
    innerCircle.setAttribute('r', radius * 0.93);
    innerCircle.setAttribute('fill', hasMapping ? '#28a745' : innerColor);
    innerCircle.setAttribute('fill-opacity', hasMapping ? '0.4' : (isGreen ? '0.9' : '0.95'));
    innerCircle.setAttribute('stroke', hasMapping ? '#1e7e34' : (isGreen ? '#333' : '#555'));
    innerCircle.setAttribute('stroke-width', '1.5');
    innerCircle.style.cursor = 'pointer';
    if (clickHandler) innerCircle.addEventListener('click', clickHandler);
    group.appendChild(innerCircle);
    
    // D-pad crosshair paths - exact proportions from SVG
    // The paths form a crosshair pattern in the center
    const dpadSize = radius * 0.36; // Center square size
    const dpadArmLength = radius * 0.55; // Length of each arm
    const dpadArmWidth = radius * 0.19; // Width of each arm at the end
    
    // Up direction - path16166
    const upPath = document.createElementNS(svgNS, 'path');
    upPath.setAttribute('d', `M ${cx - dpadSize} ${cy - dpadSize} 
                             L ${cx + dpadSize} ${cy - dpadSize} 
                             L ${cx + dpadArmWidth} ${cy - dpadArmLength} 
                             L ${cx - dpadArmWidth} ${cy - dpadArmLength} Z`);
    upPath.setAttribute('fill', hasMapping ? '#1e7e34' : crosshairColor);
    upPath.setAttribute('fill-opacity', '1');
    upPath.setAttribute('stroke', hasMapping ? '#155724' : (isGreen ? '#ddd' : '#bbb'));
    upPath.setAttribute('stroke-width', '0.5');
    upPath.setAttribute('pointer-events', 'none');
    group.appendChild(upPath);
    
    // Down direction - path16166-4
    const downPath = document.createElementNS(svgNS, 'path');
    downPath.setAttribute('d', `M ${cx - dpadSize} ${cy + dpadSize} 
                               L ${cx + dpadSize} ${cy + dpadSize} 
                               L ${cx + dpadArmWidth} ${cy + dpadArmLength} 
                               L ${cx - dpadArmWidth} ${cy + dpadArmLength} Z`);
    downPath.setAttribute('fill', hasMapping ? '#1e7e34' : crosshairColor);
    downPath.setAttribute('fill-opacity', '1');
    downPath.setAttribute('stroke', hasMapping ? '#155724' : (isGreen ? '#ddd' : '#bbb'));
    downPath.setAttribute('stroke-width', '0.5');
    downPath.setAttribute('pointer-events', 'none');
    group.appendChild(downPath);
    
    // Left direction - path16166-5
    const leftPath = document.createElementNS(svgNS, 'path');
    leftPath.setAttribute('d', `M ${cx - dpadSize} ${cy - dpadSize} 
                               L ${cx - dpadArmLength} ${cy - dpadArmWidth} 
                               L ${cx - dpadArmLength} ${cy + dpadArmWidth} 
                               L ${cx - dpadSize} ${cy + dpadSize} Z`);
    leftPath.setAttribute('fill', hasMapping ? '#1e7e34' : crosshairColor);
    leftPath.setAttribute('fill-opacity', '1');
    leftPath.setAttribute('stroke', hasMapping ? '#155724' : (isGreen ? '#ddd' : '#bbb'));
    leftPath.setAttribute('stroke-width', '0.5');
    leftPath.setAttribute('pointer-events', 'none');
    group.appendChild(leftPath);
    
    // Right direction - path16166-5-5
    const rightPath = document.createElementNS(svgNS, 'path');
    rightPath.setAttribute('d', `M ${cx + dpadSize} ${cy - dpadSize} 
                                L ${cx + dpadArmLength} ${cy - dpadArmWidth} 
                                L ${cx + dpadArmLength} ${cy + dpadArmWidth} 
                                L ${cx + dpadSize} ${cy + dpadSize} Z`);
    rightPath.setAttribute('fill', hasMapping ? '#1e7e34' : crosshairColor);
    rightPath.setAttribute('fill-opacity', '1');
    rightPath.setAttribute('stroke', hasMapping ? '#155724' : (isGreen ? '#ddd' : '#bbb'));
    rightPath.setAttribute('stroke-width', '0.5');
    rightPath.setAttribute('pointer-events', 'none');
    group.appendChild(rightPath);
    
    // Center square (like in the image - darker square in the middle for left, white for right)
    const centerSquare = document.createElementNS(svgNS, 'rect');
    const squareSize = radius * 0.25;
    centerSquare.setAttribute('x', cx - squareSize);
    centerSquare.setAttribute('y', cy - squareSize);
    centerSquare.setAttribute('width', squareSize * 2);
    centerSquare.setAttribute('height', squareSize * 2);
    centerSquare.setAttribute('fill', hasMapping ? '#1e7e34' : centerSquareColor);
    centerSquare.setAttribute('fill-opacity', hasMapping ? '0.8' : (isGreen ? '0.8' : '0.9'));
    centerSquare.setAttribute('stroke', hasMapping ? '#155724' : (isGreen ? '#444' : '#ddd'));
    centerSquare.setAttribute('stroke-width', '1');
    centerSquare.setAttribute('pointer-events', 'none');
    group.appendChild(centerSquare);
    
    // Direction indicator dots - like circle164, circle166, circle168, circle170
    // r="8.04" in original, positioned at 75% of radius
    const dotRadius = radius * 0.045;
    const directions = [
        { x: cx, y: cy - radius * 0.73 }, // Up
        { x: cx, y: cy + radius * 0.73 }, // Down
        { x: cx - radius * 0.73, y: cy }, // Left
        { x: cx + radius * 0.73, y: cy }  // Right
    ];
    
    directions.forEach(pos => {
        const dot = document.createElementNS(svgNS, 'circle');
        dot.setAttribute('cx', pos.x);
        dot.setAttribute('cy', pos.y);
        dot.setAttribute('r', dotRadius * 1.8);
        dot.setAttribute('fill', 'none');
        dot.setAttribute('stroke', hasMapping ? '#1e7e34' : (isGreen ? '#888' : '#aaa'));
        dot.setAttribute('stroke-width', '2');
        dot.setAttribute('opacity', '0.7');
        dot.setAttribute('pointer-events', 'none');
        group.appendChild(dot);
    });
    
    return group;
}

let easy_setup_mapping_target = null;
let easy_setup_timeout = null;
let easy_setup_start_time = null;
let easy_setup_listening = false;

// Make functions globally available
if (typeof window !== 'undefined') {
    window.easy_setup_listening = false;
    window.easy_setup_mapping_target = null;
}

// Controller button definitions based on output type
const controller_layouts = {
    0: { // Mouse and keyboard - show as mouse
        type: 'mouse',
        buttons: [
            { usage: '0x00090001', name: 'Links', x: 120, y: 180, radius: 20 },
            { usage: '0x00090002', name: 'Rechts', x: 200, y: 180, radius: 20 },
            { usage: '0x00090003', name: 'Midden', x: 160, y: 180, radius: 15 },
        ],
        axes: [
            { usage: '0x00010030', name: 'X-as', x: 160, y: 140, width: 80, height: 20 },
            { usage: '0x00010031', name: 'Y-as', x: 160, y: 220, width: 20, height: 80 },
            { usage: '0x00010038', name: 'Scroll', x: 160, y: 100, width: 40, height: 30 },
        ]
    },
    2: { // Switch Pro Controller
        type: 'switch',
        buttons: [
            { usage: '0x00090001', name: 'Y', x: 140, y: 80, radius: 18 },
            { usage: '0x00090002', name: 'B', x: 180, y: 100, radius: 18 },
            { usage: '0x00090003', name: 'A', x: 160, y: 120, radius: 18 },
            { usage: '0x00090004', name: 'X', x: 120, y: 100, radius: 18 },
            { usage: '0x00090005', name: 'L', x: 60, y: 60, radius: 15 },
            { usage: '0x00090006', name: 'R', x: 220, y: 60, radius: 15 },
            { usage: '0x00090007', name: 'ZL', x: 40, y: 100, radius: 12 },
            { usage: '0x00090008', name: 'ZR', x: 240, y: 100, radius: 12 },
            { usage: '0x00090009', name: 'Minus', x: 100, y: 140, radius: 12 },
            { usage: '0x0009000a', name: 'Plus', x: 180, y: 140, radius: 12 },
            { usage: '0x0009000b', name: 'LS', x: 80, y: 180, radius: 15 },
            { usage: '0x0009000c', name: 'RS', x: 200, y: 180, radius: 15 },
            { usage: '0x0009000d', name: 'Home', x: 160, y: 160, radius: 12 },
            { usage: '0xfff90001', name: '←', x: 80, y: 240, radius: 12 },
            { usage: '0xfff90002', name: '→', x: 120, y: 240, radius: 12 },
            { usage: '0xfff90003', name: '↑', x: 100, y: 220, radius: 12 },
            { usage: '0xfff90004', name: '↓', x: 100, y: 260, radius: 12 },
        ],
        sticks: [
            { usageX: '0x00010030', usageY: '0x00010031', name: 'Links', x: 80, y: 180, radius: 25 },
            { usageX: '0x00010032', usageY: '0x00010035', name: 'Rechts', x: 200, y: 180, radius: 25 },
        ]
    },
    4: { // Stadia Controller
        type: 'stadia',
        buttons: [
            { usage: '0x00090001', name: 'A', x: 160, y: 120, radius: 18 },
            { usage: '0x00090002', name: 'B', x: 180, y: 100, radius: 18 },
            { usage: '0x00090004', name: 'X', x: 140, y: 100, radius: 18 },
            { usage: '0x00090005', name: 'Y', x: 160, y: 80, radius: 18 },
            { usage: '0x00090007', name: 'L1', x: 60, y: 60, radius: 15 },
            { usage: '0x00090008', name: 'R1', x: 220, y: 60, radius: 15 },
            { usage: '0x0009000e', name: 'L3', x: 80, y: 180, radius: 15 },
            { usage: '0x0009000f', name: 'R3', x: 200, y: 180, radius: 15 },
            { usage: '0x0009000b', name: 'Opt', x: 100, y: 140, radius: 12 },
            { usage: '0x0009000c', name: 'Menu', x: 180, y: 140, radius: 12 },
            { usage: '0x0009000d', name: 'Stadia', x: 160, y: 160, radius: 12 },
            { usage: '0xfff90001', name: '←', x: 80, y: 240, radius: 12 },
            { usage: '0xfff90002', name: '→', x: 120, y: 240, radius: 12 },
            { usage: '0xfff90003', name: '↑', x: 100, y: 220, radius: 12 },
            { usage: '0xfff90004', name: '↓', x: 100, y: 260, radius: 12 },
        ],
        sticks: [
            { usageX: '0x00010030', usageY: '0x00010031', name: 'Links', x: 80, y: 180, radius: 25 },
            { usageX: '0x00010032', usageY: '0x00010035', name: 'Rechts', x: 200, y: 180, radius: 25 },
        ]
    },
    5: { // XAC/Flex (Xbox) Controller
        type: 'xbox',
        buttons: [
            { usage: '0x00090005', name: 'A', x: 380, y: 230, radius: 22 },
            { usage: '0x00090006', name: 'B', x: 405, y: 205, radius: 22 },
            { usage: '0x0009000b', name: 'X', x: 355, y: 205, radius: 22 },
            { usage: '0x0009000c', name: 'Y', x: 380, y: 180, radius: 22 },
            { usage: '0x00090004', name: 'LB', x: 100, y: 80, radius: 20 },
            { usage: '0x0009000a', name: 'RB', x: 400, y: 80, radius: 20 },
            { usage: '0x00090001', name: 'X1', x: 130, y: 180, radius: 16 },
            { usage: '0x00090002', name: 'X2', x: 370, y: 180, radius: 16 },
            { usage: '0x00090003', name: 'LS', x: 180, y: 250, radius: 18 },
            { usage: '0x00090009', name: 'RS', x: 320, y: 250, radius: 18 },
            { usage: '0x00090007', name: 'View', x: 230, y: 210, radius: 16 },
            { usage: '0x00090008', name: 'Menu', x: 270, y: 210, radius: 16 },
            { usage: '0xfff90001', name: '←', x: 140, y: 310, radius: 16 },
            { usage: '0xfff90002', name: '→', x: 180, y: 310, radius: 16 },
            { usage: '0xfff90003', name: '↑', x: 160, y: 290, radius: 16 },
            { usage: '0xfff90004', name: '↓', x: 160, y: 330, radius: 16 },
        ],
        sticks: [
            { usageX: '0x00010030', usageY: '0x00010031', name: 'Links', x: 180, y: 250, radius: 35 },
            { usageX: '0x00010032', usageY: '0x00010035', name: 'Rechts', x: 320, y: 250, radius: 35 },
        ]
    }
};

// Keyboard layout for keyboard output
const keyboard_layout = {
    type: 'keyboard',
    // Simplified keyboard - showing main keys
    buttons: [
        { usage: '0x00070004', name: 'A', x: 60, y: 100, width: 30, height: 30 },
        { usage: '0x00070005', name: 'B', x: 90, y: 100, width: 30, height: 30 },
        { usage: '0x00070006', name: 'C', x: 120, y: 100, width: 30, height: 30 },
        { usage: '0x00070007', name: 'D', x: 150, y: 100, width: 30, height: 30 },
        { usage: '0x00070008', name: 'E', x: 180, y: 100, width: 30, height: 30 },
        { usage: '0x00070009', name: 'F', x: 210, y: 100, width: 30, height: 30 },
        { usage: '0x0007002c', name: 'Space', x: 100, y: 140, width: 80, height: 30 },
        { usage: '0x00070028', name: 'Enter', x: 220, y: 140, width: 50, height: 30 },
    ]
};

function get_current_mapping_for_target(target_usage) {
    const cfg = typeof config !== 'undefined' ? config : (typeof window !== 'undefined' ? window.config : null);
    if (!cfg || !cfg['mappings']) return null;
    return cfg['mappings'].find(m => m['target_usage'] === target_usage);
}

function set_mapping_for_target(target_usage, source_usage) {
    // Access global config object
    const cfg = typeof config !== 'undefined' ? config : (typeof window !== 'undefined' ? window.config : null);
    if (!cfg) return;
    
    // Remove existing mapping for this target
    cfg['mappings'] = cfg['mappings'].filter(m => m['target_usage'] !== target_usage);
    
    // Add new mapping
    if (source_usage && source_usage !== '0x00000000') {
        const DEFAULT_SCALING_VAL = typeof DEFAULT_SCALING !== 'undefined' ? DEFAULT_SCALING : 1000;
        cfg['mappings'].push({
            'source_usage': source_usage,
            'target_usage': target_usage,
            'layers': [0],
            'sticky': false,
            'tap': false,
            'hold': false,
            'scaling': DEFAULT_SCALING_VAL,
            'source_port': 0,
            'target_port': 0,
        });
    }
}

function render_controller() {
    const container = document.getElementById('easy-setup-controller-container');
    if (!container) return;
    
    const cfg = typeof config !== 'undefined' ? config : (typeof window !== 'undefined' ? window.config : null);
    if (!cfg) return;
    
    const output_type = cfg['our_descriptor_number'] || 0;
    let layout = controller_layouts[output_type];
    
    if (output_type === 0) {
        // For mouse/keyboard, decide based on what makes sense
        // For now, show mouse layout
        layout = controller_layouts[0];
    }
    
    if (!layout && output_type !== 0) {
        container.innerHTML = '<p class="text-muted">Visuele controller niet beschikbaar voor dit output type. Gebruik Advanced Setup.</p>';
        return;
    }
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '500');
    svg.setAttribute('height', layout.type === 'mouse' ? '350' : '360');
    svg.setAttribute('viewBox', '0 0 500 360');
    svg.style.border = 'none';
    svg.style.borderRadius = '25px';
    svg.style.backgroundColor = 'transparent';
    
    // Draw controller body with realistic Xbox controller shape (joypad.ai style)
    if (layout.type === 'xbox') {
        // Controller shadow
        const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        shadow.setAttribute('cx', '250');
        shadow.setAttribute('cy', '340');
        shadow.setAttribute('rx', '220');
        shadow.setAttribute('ry', '20');
        shadow.setAttribute('fill', 'rgba(0,0,0,0.5)');
        shadow.setAttribute('fill-opacity', '0.5');
        svg.appendChild(shadow);
        
        // Left grip - darker, more realistic
        const leftGrip = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        leftGrip.setAttribute('d', 'M 50 85 Q 25 130 25 180 Q 25 235 55 275 Q 75 295 100 295 L 125 295 Q 135 295 135 285 L 135 95 Q 135 85 125 85 Z');
        leftGrip.setAttribute('fill', '#3a3a3a'); // Darker grey like in image
        leftGrip.setAttribute('stroke', '#2a2a2a');
        leftGrip.setAttribute('stroke-width', '2.5');
        svg.appendChild(leftGrip);
        
        // Right grip - darker, more realistic
        const rightGrip = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        rightGrip.setAttribute('d', 'M 450 85 Q 475 130 475 180 Q 475 235 445 275 Q 425 295 400 295 L 375 295 Q 365 295 365 285 L 365 95 Q 365 85 375 85 Z');
        rightGrip.setAttribute('fill', '#3a3a3a'); // Darker grey like in image
        rightGrip.setAttribute('stroke', '#2a2a2a');
        rightGrip.setAttribute('stroke-width', '2.5');
        svg.appendChild(rightGrip);
        
        // Main body - darker grey, more realistic shape
        const mainBody = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        mainBody.setAttribute('x', '135');
        mainBody.setAttribute('y', '85');
        mainBody.setAttribute('width', '230');
        mainBody.setAttribute('height', '210');
        mainBody.setAttribute('rx', '40');
        mainBody.setAttribute('fill', '#4a4a4a'); // Dark grey like in the image
        mainBody.setAttribute('stroke', '#2a2a2a');
        mainBody.setAttribute('stroke-width', '2.5');
        svg.appendChild(mainBody);
        
        // Inner shadow for depth
        const innerShadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        innerShadow.setAttribute('x', '145');
        innerShadow.setAttribute('y', '95');
        innerShadow.setAttribute('width', '210');
        innerShadow.setAttribute('height', '190');
        innerShadow.setAttribute('rx', '30');
        innerShadow.setAttribute('fill', 'rgba(0,0,0,0.2)');
        svg.appendChild(innerShadow);
        
        // Center accent area (Xbox logo area) - subtle green tint
        const centerAccent = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        centerAccent.setAttribute('cx', '250');
        centerAccent.setAttribute('cy', '180');
        centerAccent.setAttribute('rx', '65');
        centerAccent.setAttribute('ry', '30');
        centerAccent.setAttribute('fill', '#107c10');
        centerAccent.setAttribute('fill-opacity', '0.25');
        svg.appendChild(centerAccent);
    } else {
        // Generic controller background for other types
        const controller_bg = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        controller_bg.setAttribute('cx', '250');
        controller_bg.setAttribute('cy', layout.type === 'mouse' ? '175' : '180');
        controller_bg.setAttribute('rx', '220');
        controller_bg.setAttribute('ry', layout.type === 'mouse' ? '140' : '160');
        controller_bg.setAttribute('fill', layout.type === 'switch' ? '#e60012' : 
                                   layout.type === 'stadia' ? '#4285f4' : '#8e8e8e');
        controller_bg.setAttribute('fill-opacity', '0.2');
        controller_bg.setAttribute('stroke', '#333');
        controller_bg.setAttribute('stroke-width', '3');
        svg.appendChild(controller_bg);
    }
    
    // Draw buttons with realistic 3D styling (joypad.ai style)
    if (layout.buttons) {
        layout.buttons.forEach(btn => {
            const mapping = get_current_mapping_for_target(btn.usage);
            
            // Button shadow - larger, more realistic
            const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            shadow.setAttribute('cx', btn.x + 3);
            shadow.setAttribute('cy', btn.y + 3);
            shadow.setAttribute('r', btn.radius);
            shadow.setAttribute('fill', 'rgba(0,0,0,0.5)');
            shadow.setAttribute('pointer-events', 'none');
            svg.appendChild(shadow);
            
            // Button base (darker outer circle for 3D effect)
            const baseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            baseCircle.setAttribute('cx', btn.x);
            baseCircle.setAttribute('cy', btn.y);
            baseCircle.setAttribute('r', btn.radius);
            
            // Color coding for Xbox buttons - more vibrant colors
            let fillColor, strokeColor, baseColor;
            if (layout.type === 'xbox') {
                if (btn.name === 'A') {
                    fillColor = mapping ? '#28a745' : '#00ff7f'; // Bright green
                    strokeColor = mapping ? '#1e7e34' : '#00cc66';
                    baseColor = mapping ? '#1e7e34' : '#00cc66';
                } else if (btn.name === 'B') {
                    fillColor = mapping ? '#28a745' : '#e81123'; // Red
                    strokeColor = mapping ? '#1e7e34' : '#c8102e';
                    baseColor = mapping ? '#1e7e34' : '#c8102e';
                } else if (btn.name === 'X') {
                    fillColor = mapping ? '#28a745' : '#0089ce'; // Blue
                    strokeColor = mapping ? '#1e7e34' : '#0078d4';
                    baseColor = mapping ? '#1e7e34' : '#0078d4';
                } else if (btn.name === 'Y') {
                    fillColor = mapping ? '#28a745' : '#ffb900'; // Yellow/Orange
                    strokeColor = mapping ? '#1e7e34' : '#ffaa00';
                    baseColor = mapping ? '#1e7e34' : '#ffaa00';
                } else {
                    fillColor = mapping ? '#28a745' : '#5a5a5a'; // Dark grey for other buttons
                    strokeColor = mapping ? '#1e7e34' : '#3a3a3a';
                    baseColor = mapping ? '#1e7e34' : '#3a3a3a';
                }
            } else {
                fillColor = mapping ? '#28a745' : '#5a5a5a';
                strokeColor = mapping ? '#1e7e34' : '#3a3a3a';
                baseColor = mapping ? '#1e7e34' : '#3a3a3a';
            }
            
            // Base circle (darker for depth)
            baseCircle.setAttribute('fill', baseColor);
            baseCircle.setAttribute('opacity', '0.6');
            baseCircle.setAttribute('pointer-events', 'none');
            svg.appendChild(baseCircle);
            
            // Main button circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', btn.x);
            circle.setAttribute('cy', btn.y - 1); // Slight offset for 3D effect
            circle.setAttribute('r', btn.radius);
            circle.setAttribute('fill', fillColor);
            circle.setAttribute('stroke', strokeColor);
            circle.setAttribute('stroke-width', '2.5');
            circle.setAttribute('class', 'easy-setup-button');
            circle.setAttribute('data-usage', btn.usage);
            circle.style.cursor = 'pointer';
            circle.style.filter = mapping ? 'none' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
            
            // Add hover effect
            const originalFill = fillColor;
            const originalY = btn.y - 1;
            circle.addEventListener('mouseenter', function() {
                if (!mapping) {
                    this.setAttribute('cy', originalY - 1);
                    this.style.filter = 'drop-shadow(0 3px 6px rgba(0,0,0,0.4)) brightness(1.1)';
                }
            });
            circle.addEventListener('mouseleave', function() {
                if (!mapping) {
                    this.setAttribute('cy', originalY);
                    this.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
                }
            });
            circle.addEventListener('click', () => easy_setup_start_mapping(btn.usage, btn.name));
            svg.appendChild(circle);
            
            // Button highlight (top highlight for 3D effect)
            if (!mapping && layout.type === 'xbox' && ['A','B','X','Y'].includes(btn.name)) {
                const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                highlight.setAttribute('cx', btn.x);
                highlight.setAttribute('cy', btn.y - btn.radius * 0.4 - 1);
                highlight.setAttribute('rx', btn.radius * 0.6);
                highlight.setAttribute('ry', btn.radius * 0.3);
                highlight.setAttribute('fill', 'rgba(255,255,255,0.3)');
                highlight.setAttribute('pointer-events', 'none');
                svg.appendChild(highlight);
            }
            
            // Button text with shadow for better readability
            const textShadow = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textShadow.setAttribute('x', btn.x);
            textShadow.setAttribute('y', btn.y + (btn.name.length > 2 ? 4 : 6) + 1);
            textShadow.setAttribute('text-anchor', 'middle');
            textShadow.setAttribute('font-size', btn.name.length > 2 ? '11' : '14');
            textShadow.setAttribute('font-weight', 'bold');
            textShadow.setAttribute('fill', 'rgba(0,0,0,0.5)');
            textShadow.setAttribute('pointer-events', 'none');
            textShadow.setAttribute('font-family', 'Arial, sans-serif');
            textShadow.textContent = btn.name;
            svg.appendChild(textShadow);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', btn.x);
            text.setAttribute('y', btn.y + (btn.name.length > 2 ? 4 : 6));
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', btn.name.length > 2 ? '11' : '14');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('fill', '#fff');
            text.setAttribute('pointer-events', 'none');
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.textContent = btn.name;
            svg.appendChild(text);
        });
    }
    
    // Draw sticks with joypad.ai style visualization
    if (layout.sticks) {
        layout.sticks.forEach((stick, index) => {
            const mappingX = get_current_mapping_for_target(stick.usageX);
            const mappingY = get_current_mapping_for_target(stick.usageY);
            const hasMapping = mappingX || mappingY;
            
            const clickHandler = () => easy_setup_start_mapping(stick.usageX, stick.name + ' X-as');
            
            // Determine if this is the left stick (first stick) or right stick
            const isLeftStick = index === 0 || stick.name.toLowerCase().includes('links') || stick.name.toLowerCase().includes('left');
            
            // Use the improved joypad.ai style stick visualization
            const stickGroup = create_joypad_style_stick(stick.x, stick.y, stick.radius, hasMapping, clickHandler, isLeftStick);
            svg.appendChild(stickGroup);
            
            // Label text above stick - green like in the image
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', stick.x);
            text.setAttribute('y', stick.y - stick.radius - 12);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '12');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('fill', hasMapping ? '#28a745' : '#00ff7f'); // Green like in image
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.style.textShadow = '1px 1px 3px rgba(0,0,0,0.9)';
            text.textContent = stick.name;
            svg.appendChild(text);
        });
    }
    
    container.innerHTML = '';
    container.appendChild(svg);
}

function easy_setup_start_mapping(target_usage, target_name) {
    if (easy_setup_listening) {
        easy_setup_cancel_mapping();
    }
    
    easy_setup_mapping_target = target_usage;
    easy_setup_listening = true;
    easy_setup_start_time = Date.now();
    
    const status_div = document.getElementById('easy-setup-status');
    const progress_bar = document.getElementById('easy-setup-progress');
    const target_name_span = document.getElementById('easy-setup-target-button-name');
    
    target_name_span.textContent = target_name;
    status_div.classList.remove('d-none');
    
    // Enable monitor to capture inputs
    const dev = typeof device !== 'undefined' ? device : (typeof window !== 'undefined' ? window.device : null);
    const mon_enabled = typeof monitor_enabled !== 'undefined' ? monitor_enabled : 
                       (typeof window !== 'undefined' ? window.monitor_enabled : false);
    if (dev && !mon_enabled && typeof set_monitor_enabled === 'function') {
        set_monitor_enabled(true);
    }
    
    // Timeout after 5 seconds
    const duration = 5000;
    const start = Date.now();
    
    function update_progress() {
        if (!easy_setup_listening) return;
        
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, duration - elapsed);
        const percent = (remaining / duration) * 100;
        
        progress_bar.style.width = percent + '%';
        
        if (remaining > 0) {
            requestAnimationFrame(update_progress);
        } else {
            easy_setup_cancel_mapping();
        }
    }
    
    update_progress();
    
    easy_setup_timeout = setTimeout(() => {
        easy_setup_cancel_mapping();
    }, duration);
    
    // Set global flags so input_report_received can detect easy setup mode
    if (typeof window !== 'undefined') {
        window.easy_setup_listening = true;
        window.easy_setup_mapping_target = target_usage;
        easy_setup_listening = true;
        easy_setup_mapping_target = target_usage;
    }
}

function easy_setup_handle_input(event) {
    if (!easy_setup_listening || !easy_setup_mapping_target) {
        return;
    }
    
    // Use the existing input_report_received function's logic
    if (event.reportId == REPORT_ID_MONITOR) {
        // Parse monitor data to find button presses
        for (let i = 0; i < 7; i++) {
            const usage = "0x" + event.data.getUint32(i * 9, true).toString(16).padStart(8, "0");
            const value = event.data.getInt32(i * 9 + 4, true);
            
            // Check if this is a button press (value > 0 for buttons)
            // Or axis movement for analog inputs
            if (usage !== '0x00000000' && value != 0) {
                // Found input! Complete the mapping
                easy_setup_complete_mapping(usage);
                return;
            }
        }
    }
}

function easy_setup_complete_mapping(source_usage) {
    const target = easy_setup_mapping_target || (typeof window !== 'undefined' ? window.easy_setup_mapping_target : null);
    if (!target) return;
    
    set_mapping_for_target(target, source_usage);
    if (typeof render_controller === 'function') {
        render_controller();
    }
    easy_setup_cancel_mapping();
    
    // Show success message briefly
    const status_div = document.getElementById('easy-setup-status');
    if (status_div) {
        status_div.className = 'alert alert-success mt-3';
        const target_name = typeof readable_target_usage_name === 'function' ? 
            readable_target_usage_name(target) : target;
        const source_name = typeof readable_usage_name === 'function' ? 
            readable_usage_name(source_usage) : source_usage;
        status_div.innerHTML = '<strong>Mapping opgeslagen!</strong> ' + 
            target_name + ' is nu gemapped naar ' + source_name;
        
        setTimeout(() => {
            status_div.classList.add('d-none');
            status_div.className = 'alert alert-info mt-3 d-none';
        }, 2000);
    }
    
    // Also update advanced mappings view
    if (typeof set_mappings_ui_state === 'function') {
        set_mappings_ui_state();
    }
}

function easy_setup_cancel_mapping() {
    easy_setup_listening = false;
    easy_setup_mapping_target = null;
    
    if (easy_setup_timeout) {
        clearTimeout(easy_setup_timeout);
        easy_setup_timeout = null;
    }
    
    const status_div = document.getElementById('easy-setup-status');
    if (status_div) {
        status_div.classList.add('d-none');
    }
    
    if (typeof window !== 'undefined') {
        window.easy_setup_listening = false;
        window.easy_setup_mapping_target = null;
    }
}

function easy_setup_clear_all() {
    if (confirm('Weet je zeker dat je alle mappings wilt wissen?')) {
        const cfg = typeof config !== 'undefined' ? config : (typeof window !== 'undefined' ? window.config : null);
        if (!cfg) return;
        
        // Clear only mappings that match current output type
        const output_type = cfg['our_descriptor_number'] || 0;
        const layout = controller_layouts[output_type];
        if (layout) {
            const target_usages = [];
            if (layout.buttons) {
                layout.buttons.forEach(btn => target_usages.push(btn.usage));
            }
            if (layout.sticks) {
                layout.sticks.forEach(stick => {
                    target_usages.push(stick.usageX);
                    target_usages.push(stick.usageY);
                });
            }
            
            cfg['mappings'] = cfg['mappings'].filter(m => !target_usages.includes(m['target_usage']));
        }
        if (typeof render_controller === 'function') {
            render_controller();
        }
        if (typeof set_mappings_ui_state === 'function') {
            set_mappings_ui_state();
        }
    }
}

function easy_setup_swap_sticks() {
    const cfg = typeof config !== 'undefined' ? config : (typeof window !== 'undefined' ? window.config : null);
    if (!cfg) return;
    
    const output_type = cfg['our_descriptor_number'] || 0;
    const layout = controller_layouts[output_type];
    if (!layout || !layout.sticks || layout.sticks.length < 2) {
        alert('Stick swapping is niet beschikbaar voor dit controller type.');
        return;
    }
    
    const left = layout.sticks[0];
    const right = layout.sticks[1];
    
    // Swap X axes
    const left_x_mapping = get_current_mapping_for_target(left.usageX);
    const right_x_mapping = get_current_mapping_for_target(right.usageX);
    
    if (left_x_mapping) set_mapping_for_target(right.usageX, left_x_mapping['source_usage']);
    if (right_x_mapping) set_mapping_for_target(left.usageX, right_x_mapping['source_usage']);
    
    // Swap Y axes
    const left_y_mapping = get_current_mapping_for_target(left.usageY);
    const right_y_mapping = get_current_mapping_for_target(right.usageY);
    
    if (left_y_mapping) set_mapping_for_target(right.usageY, left_y_mapping['source_usage']);
    if (right_y_mapping) set_mapping_for_target(left.usageY, right_y_mapping['source_usage']);
    
    if (typeof render_controller === 'function') {
        render_controller();
    }
    if (typeof set_mappings_ui_state === 'function') {
        set_mappings_ui_state();
    }
}

function easy_setup_mirror_buttons() {
    const cfg = typeof config !== 'undefined' ? config : (typeof window !== 'undefined' ? window.config : null);
    if (!cfg) return;
    
    // Mirror left/right buttons (for gamepads)
    const output_type = cfg['our_descriptor_number'] || 0;
    if (output_type === 5) { // Xbox
        // Swap A/B, X/Y, LB/RB, etc.
        const swaps = [
            ['0x00090005', '0x00090006'], // A <-> B
            ['0x0009000b', '0x0009000c'], // X <-> Y
            ['0x00090004', '0x0009000a'], // LB <-> RB
        ];
        
        swaps.forEach(([usage1, usage2]) => {
            const mapping1 = get_current_mapping_for_target(usage1);
            const mapping2 = get_current_mapping_for_target(usage2);
            
            if (mapping1) set_mapping_for_target(usage2, mapping1['source_usage']);
            if (mapping2) set_mapping_for_target(usage1, mapping2['source_usage']);
        });
        
        render_controller();
        set_mappings_ui_state();
    } else {
        alert('Button mirroring is alleen beschikbaar voor Xbox controllers.');
    }
}

function easy_setup_reset_defaults() {
    if (confirm('Reset alle mappings naar standaard (geen mappings)?')) {
        easy_setup_clear_all();
    }
}

// Make key functions globally available
if (typeof window !== 'undefined') {
    window.easy_setup_complete_mapping = easy_setup_complete_mapping;
    window.render_controller = render_controller;
}

// Initialize easy setup when tab is shown
function easy_setup_init() {
    const clearBtn = document.getElementById('easy-setup-clear-all');
    const swapBtn = document.getElementById('easy-setup-swap-sticks');
    const mirrorBtn = document.getElementById('easy-setup-mirror-buttons');
    const resetBtn = document.getElementById('easy-setup-reset-defaults');
    
    if (clearBtn) clearBtn.addEventListener('click', easy_setup_clear_all);
    if (swapBtn) swapBtn.addEventListener('click', easy_setup_swap_sticks);
    if (mirrorBtn) mirrorBtn.addEventListener('click', easy_setup_mirror_buttons);
    if (resetBtn) resetBtn.addEventListener('click', easy_setup_reset_defaults);
    
    // Render controller when easy setup tab is shown
    const easy_setup_tab = document.getElementById('nav-easy-setup-tab');
    if (easy_setup_tab) {
        easy_setup_tab.addEventListener('shown.bs.tab', () => {
            if (typeof render_controller === 'function') {
                render_controller();
            }
        });
    }
}

