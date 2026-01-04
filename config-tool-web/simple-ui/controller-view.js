/**
 * ControllerView Component
 * Rendert en beheert interactieve controller SVG's
 */
export class ControllerView {
    constructor(containerId, deviceType = 5) {
        this.container = document.getElementById(containerId);
        this.deviceType = deviceType;
        this.currentLayout = null;
        this.mappings = new Map(); // target_usage -> mapping object
        this.activeButton = null;
        this.onButtonClick = null;
        
        // Controller layouts (gebaseerd op easy-setup.js)
        this.layouts = {
            0: { // Mouse/Keyboard
                type: 'mouse',
                buttons: [
                    { id: 'btn_left', usage: '0x00090001', name: 'Links', x: 120, y: 180, radius: 20 },
                    { id: 'btn_right', usage: '0x00090002', name: 'Rechts', x: 200, y: 180, radius: 20 },
                    { id: 'btn_middle', usage: '0x00090003', name: 'Midden', x: 160, y: 180, radius: 15 },
                ],
                axes: [
                    { id: 'axis_x', usage: '0x00010030', name: 'X-as', x: 160, y: 140, width: 80, height: 20 },
                    { id: 'axis_y', usage: '0x00010031', name: 'Y-as', x: 160, y: 220, width: 20, height: 80 },
                ]
            },
            2: { // Switch Pro Controller
                type: 'switch',
                buttons: [
                    { id: 'btn_y', usage: '0x00090001', name: 'Y', x: 140, y: 80, radius: 18 },
                    { id: 'btn_b', usage: '0x00090002', name: 'B', x: 180, y: 100, radius: 18 },
                    { id: 'btn_a', usage: '0x00090003', name: 'A', x: 160, y: 120, radius: 18 },
                    { id: 'btn_x', usage: '0x00090004', name: 'X', x: 120, y: 100, radius: 18 },
                    { id: 'btn_l', usage: '0x00090005', name: 'L', x: 60, y: 60, radius: 15 },
                    { id: 'btn_r', usage: '0x00090006', name: 'R', x: 220, y: 60, radius: 15 },
                    { id: 'btn_zl', usage: '0x00090007', name: 'ZL', x: 40, y: 100, radius: 12 },
                    { id: 'btn_zr', usage: '0x00090008', name: 'ZR', x: 240, y: 100, radius: 12 },
                    { id: 'btn_minus', usage: '0x00090009', name: 'Minus', x: 100, y: 140, radius: 12 },
                    { id: 'btn_plus', usage: '0x0009000a', name: 'Plus', x: 180, y: 140, radius: 12 },
                    { id: 'btn_ls', usage: '0x0009000b', name: 'LS', x: 80, y: 180, radius: 15 },
                    { id: 'btn_rs', usage: '0x0009000c', name: 'RS', x: 200, y: 180, radius: 15 },
                    { id: 'btn_home', usage: '0x0009000d', name: 'Home', x: 160, y: 160, radius: 12 },
                    { id: 'pad_left', usage: '0xfff90001', name: '←', x: 80, y: 240, radius: 12 },
                    { id: 'pad_right', usage: '0xfff90002', name: '→', x: 120, y: 240, radius: 12 },
                    { id: 'pad_up', usage: '0xfff90003', name: '↑', x: 100, y: 220, radius: 12 },
                    { id: 'pad_down', usage: '0xfff90004', name: '↓', x: 100, y: 260, radius: 12 },
                ],
                sticks: [
                    { id: 'stick_left', usageX: '0x00010030', usageY: '0x00010031', name: 'Links', x: 80, y: 180, radius: 25 },
                    { id: 'stick_right', usageX: '0x00010032', usageY: '0x00010035', name: 'Rechts', x: 200, y: 180, radius: 25 },
                ]
            },
            3: { // PS4 Arcade Stick
                type: 'ps4',
                buttons: [
                    { id: 'btn_square', usage: '0x00090001', name: '□', x: 120, y: 100, radius: 18 },
                    { id: 'btn_cross', usage: '0x00090002', name: '✕', x: 160, y: 120, radius: 18 },
                    { id: 'btn_circle', usage: '0x00090003', name: '○', x: 200, y: 100, radius: 18 },
                    { id: 'btn_triangle', usage: '0x00090004', name: '△', x: 160, y: 80, radius: 18 },
                    { id: 'btn_l1', usage: '0x00090005', name: 'L1', x: 60, y: 60, radius: 15 },
                    { id: 'btn_r1', usage: '0x00090006', name: 'R1', x: 220, y: 60, radius: 15 },
                    { id: 'btn_l2', usage: '0x00090007', name: 'L2', x: 40, y: 100, radius: 12 },
                    { id: 'btn_r2', usage: '0x00090008', name: 'R2', x: 240, y: 100, radius: 12 },
                    { id: 'btn_share', usage: '0x00090009', name: 'Share', x: 100, y: 140, radius: 12 },
                    { id: 'btn_options', usage: '0x0009000a', name: 'Options', x: 180, y: 140, radius: 12 },
                    { id: 'btn_ps', usage: '0x0009000b', name: 'PS', x: 160, y: 160, radius: 12 },
                ],
                sticks: []
            },
            4: { // Stadia Controller
                type: 'stadia',
                buttons: [
                    { id: 'btn_a', usage: '0x00090001', name: 'A', x: 160, y: 120, radius: 18 },
                    { id: 'btn_b', usage: '0x00090002', name: 'B', x: 180, y: 100, radius: 18 },
                    { id: 'btn_x', usage: '0x00090004', name: 'X', x: 140, y: 100, radius: 18 },
                    { id: 'btn_y', usage: '0x00090005', name: 'Y', x: 160, y: 80, radius: 18 },
                    { id: 'btn_l1', usage: '0x00090007', name: 'L1', x: 60, y: 60, radius: 15 },
                    { id: 'btn_r1', usage: '0x00090008', name: 'R1', x: 220, y: 60, radius: 15 },
                    { id: 'btn_l3', usage: '0x0009000e', name: 'L3', x: 80, y: 180, radius: 15 },
                    { id: 'btn_r3', usage: '0x0009000f', name: 'R3', x: 200, y: 180, radius: 15 },
                    { id: 'btn_opt', usage: '0x0009000b', name: 'Opt', x: 100, y: 140, radius: 12 },
                    { id: 'btn_menu', usage: '0x0009000c', name: 'Menu', x: 180, y: 140, radius: 12 },
                    { id: 'btn_stadia', usage: '0x0009000d', name: 'Stadia', x: 160, y: 160, radius: 12 },
                    { id: 'pad_left', usage: '0xfff90001', name: '←', x: 80, y: 240, radius: 12 },
                    { id: 'pad_right', usage: '0xfff90002', name: '→', x: 120, y: 240, radius: 12 },
                    { id: 'pad_up', usage: '0xfff90003', name: '↑', x: 100, y: 220, radius: 12 },
                    { id: 'pad_down', usage: '0xfff90004', name: '↓', x: 100, y: 260, radius: 12 },
                ],
                sticks: [
                    { id: 'stick_left', usageX: '0x00010030', usageY: '0x00010031', name: 'Links', x: 80, y: 180, radius: 25 },
                    { id: 'stick_right', usageX: '0x00010032', usageY: '0x00010035', name: 'Rechts', x: 200, y: 180, radius: 25 },
                ]
            },
            5: { // Xbox Adaptive Controller (XAC)
                type: 'xbox',
                buttons: [
                    { id: 'btn_a', usage: '0x00090005', name: 'A', x: 380, y: 230, radius: 22 },
                    { id: 'btn_b', usage: '0x00090006', name: 'B', x: 405, y: 205, radius: 22 },
                    { id: 'btn_x', usage: '0x0009000b', name: 'X', x: 355, y: 205, radius: 22 },
                    { id: 'btn_y', usage: '0x0009000c', name: 'Y', x: 380, y: 180, radius: 22 },
                    { id: 'btn_lb', usage: '0x00090004', name: 'LB', x: 100, y: 80, radius: 20 },
                    { id: 'btn_rb', usage: '0x0009000a', name: 'RB', x: 400, y: 80, radius: 20 },
                    { id: 'btn_x1', usage: '0x00090001', name: 'X1', x: 130, y: 180, radius: 16 },
                    { id: 'btn_x2', usage: '0x00090002', name: 'X2', x: 370, y: 180, radius: 16 },
                    { id: 'btn_ls', usage: '0x00090003', name: 'LS', x: 180, y: 250, radius: 18 },
                    { id: 'btn_rs', usage: '0x00090009', name: 'RS', x: 320, y: 250, radius: 18 },
                    { id: 'btn_view', usage: '0x00090007', name: 'View', x: 230, y: 210, radius: 16 },
                    { id: 'btn_menu', usage: '0x00090008', name: 'Menu', x: 270, y: 210, radius: 16 },
                    { id: 'pad_left', usage: '0xfff90001', name: '←', x: 140, y: 310, radius: 16 },
                    { id: 'pad_right', usage: '0xfff90002', name: '→', x: 180, y: 310, radius: 16 },
                    { id: 'pad_up', usage: '0xfff90003', name: '↑', x: 160, y: 290, radius: 16 },
                    { id: 'pad_down', usage: '0xfff90004', name: '↓', x: 160, y: 330, radius: 16 },
                    // XAC specifieke jacks (voor toekomstige uitbreiding)
                    { id: 'xac_jack_1', usage: '0xfff90010', name: 'Jack 1', x: 50, y: 150, radius: 12 },
                    { id: 'xac_jack_2', usage: '0xfff90011', name: 'Jack 2', x: 450, y: 150, radius: 12 },
                ],
                sticks: [
                    { id: 'stick_left', usageX: '0x00010030', usageY: '0x00010031', name: 'Links', x: 180, y: 250, radius: 35 },
                    { id: 'stick_right', usageX: '0x00010032', usageY: '0x00010035', name: 'Rechts', x: 320, y: 250, radius: 35 },
                ]
            }
        };
    }

    /**
     * Laad een controller layout op basis van device type
     */
    setDeviceType(deviceType) {
        this.deviceType = deviceType;
        this.currentLayout = this.layouts[deviceType] || this.layouts[5];
        this.render();
    }

    /**
     * Render de controller SVG
     */
    render() {
        if (!this.container || !this.currentLayout) return;

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        
        // Bepaal viewBox op basis van layout type
        const viewBox = this.currentLayout.type === 'xbox' 
            ? '0 0 500 400' 
            : '0 0 300 300';
        
        svg.setAttribute('viewBox', viewBox);
        svg.setAttribute('class', 'controller-svg');
        svg.style.width = '100%';
        svg.style.height = 'auto';
        svg.style.maxWidth = this.currentLayout.type === 'xbox' ? '600px' : '400px';

        // Render controller body
        this.renderControllerBody(svg, svgNS);

        // Render buttons
        if (this.currentLayout.buttons) {
            this.currentLayout.buttons.forEach(btn => {
                this.renderButton(svg, svgNS, btn);
            });
        }

        // Render sticks
        if (this.currentLayout.sticks) {
            this.currentLayout.sticks.forEach(stick => {
                this.renderStick(svg, svgNS, stick);
            });
        }

        // Render axes (voor mouse)
        if (this.currentLayout.axes) {
            this.currentLayout.axes.forEach(axis => {
                this.renderAxis(svg, svgNS, axis);
            });
        }

        // Clear container en voeg SVG toe
        this.container.innerHTML = '';
        this.container.appendChild(svg);
    }

    /**
     * Render controller body
     */
    renderControllerBody(svg, svgNS) {
        if (this.currentLayout.type === 'xbox') {
            // Xbox controller body
            const body = document.createElementNS(svgNS, 'rect');
            body.setAttribute('x', '100');
            body.setAttribute('y', '60');
            body.setAttribute('width', '300');
            body.setAttribute('height', '280');
            body.setAttribute('rx', '40');
            body.setAttribute('fill', '#4a4a4a');
            body.setAttribute('stroke', '#2a2a2a');
            body.setAttribute('stroke-width', '2');
            svg.appendChild(body);
        } else {
            // Generic controller background
            const bg = document.createElementNS(svgNS, 'ellipse');
            bg.setAttribute('cx', '150');
            bg.setAttribute('cy', '150');
            bg.setAttribute('rx', '130');
            bg.setAttribute('ry', '100');
            bg.setAttribute('fill', '#3a3a3a');
            bg.setAttribute('fill-opacity', '0.3');
            bg.setAttribute('stroke', '#555');
            bg.setAttribute('stroke-width', '2');
            svg.appendChild(bg);
        }
    }

    /**
     * Render een button
     */
    renderButton(svg, svgNS, btn) {
        const mapping = this.mappings.get(btn.usage);
        const isMapped = !!mapping;
        const isActive = this.activeButton === btn.usage;

        // Button shadow
        const shadow = document.createElementNS(svgNS, 'circle');
        shadow.setAttribute('cx', btn.x + 2);
        shadow.setAttribute('cy', btn.y + 2);
        shadow.setAttribute('r', btn.radius);
        shadow.setAttribute('fill', 'rgba(0,0,0,0.3)');
        shadow.setAttribute('pointer-events', 'none');
        svg.appendChild(shadow);

        // Button circle
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', btn.x);
        circle.setAttribute('cy', btn.y);
        circle.setAttribute('r', btn.radius);
        circle.setAttribute('id', btn.id);
        circle.setAttribute('data-usage', btn.usage);
        circle.setAttribute('class', `controller-button ${isMapped ? 'mapped' : ''} ${isActive ? 'active' : ''}`);
        
        // Color coding
        if (isMapped) {
            circle.setAttribute('fill', '#a6e3a1');
            circle.setAttribute('stroke', '#1e7e34');
        } else if (isActive) {
            circle.setAttribute('fill', '#89b4fa');
            circle.setAttribute('stroke', '#89b4fa');
        } else {
            circle.setAttribute('fill', '#5a5a5a');
            circle.setAttribute('stroke', '#3a3a3a');
        }
        
        circle.setAttribute('stroke-width', isActive ? '3' : '2');
        circle.style.cursor = 'pointer';
        
        // Event listeners
        circle.addEventListener('click', () => {
            if (this.onButtonClick) {
                this.onButtonClick(btn.usage, btn.name, btn.id);
            }
        });

        svg.appendChild(circle);

        // Button label
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', btn.x);
        text.setAttribute('y', btn.y + 5);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', btn.name.length > 2 ? '11' : '14');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', '#fff');
        text.setAttribute('pointer-events', 'none');
        text.textContent = btn.name;
        svg.appendChild(text);
    }

    /**
     * Render een stick
     */
    renderStick(svg, svgNS, stick) {
        const mappingX = this.mappings.get(stick.usageX);
        const mappingY = this.mappings.get(stick.usageY);
        const hasMapping = mappingX || mappingY;

        // Outer circle
        const outer = document.createElementNS(svgNS, 'circle');
        outer.setAttribute('cx', stick.x);
        outer.setAttribute('cy', stick.y);
        outer.setAttribute('r', stick.radius);
        outer.setAttribute('fill', hasMapping ? '#a6e3a1' : '#8e8e8e');
        outer.setAttribute('fill-opacity', '0.3');
        outer.setAttribute('stroke', hasMapping ? '#1e7e34' : '#666');
        outer.setAttribute('stroke-width', '2');
        outer.setAttribute('id', stick.id);
        outer.setAttribute('data-usage-x', stick.usageX);
        outer.setAttribute('data-usage-y', stick.usageY);
        outer.setAttribute('class', 'controller-button');
        outer.style.cursor = 'pointer';
        outer.addEventListener('click', () => {
            if (this.onButtonClick) {
                this.onButtonClick(stick.usageX, stick.name + ' X-as', stick.id);
            }
        });
        svg.appendChild(outer);

        // Inner circle
        const inner = document.createElementNS(svgNS, 'circle');
        inner.setAttribute('cx', stick.x);
        inner.setAttribute('cy', stick.y);
        inner.setAttribute('r', stick.radius * 0.7);
        inner.setAttribute('fill', hasMapping ? '#1e7e34' : '#2a2a2a');
        inner.setAttribute('fill-opacity', '0.8');
        inner.setAttribute('pointer-events', 'none');
        svg.appendChild(inner);

        // Label
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', stick.x);
        text.setAttribute('y', stick.y - stick.radius - 8);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', hasMapping ? '#a6e3a1' : '#8e8e8e');
        text.setAttribute('pointer-events', 'none');
        text.textContent = stick.name;
        svg.appendChild(text);
    }

    /**
     * Render een axis (voor mouse)
     */
    renderAxis(svg, svgNS, axis) {
        const mapping = this.mappings.get(axis.usage);
        const hasMapping = !!mapping;

        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', axis.x - axis.width / 2);
        rect.setAttribute('y', axis.y - axis.height / 2);
        rect.setAttribute('width', axis.width);
        rect.setAttribute('height', axis.height);
        rect.setAttribute('id', axis.id);
        rect.setAttribute('data-usage', axis.usage);
        rect.setAttribute('class', `controller-button ${hasMapping ? 'mapped' : ''}`);
        rect.setAttribute('fill', hasMapping ? '#a6e3a1' : '#5a5a5a');
        rect.setAttribute('stroke', hasMapping ? '#1e7e34' : '#3a3a3a');
        rect.setAttribute('stroke-width', '2');
        rect.setAttribute('rx', '4');
        rect.style.cursor = 'pointer';
        rect.addEventListener('click', () => {
            if (this.onButtonClick) {
                this.onButtonClick(axis.usage, axis.name, axis.id);
            }
        });
        svg.appendChild(rect);

        // Label
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', axis.x);
        text.setAttribute('y', axis.y - axis.height / 2 - 5);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '11');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', hasMapping ? '#a6e3a1' : '#8e8e8e');
        text.setAttribute('pointer-events', 'none');
        text.textContent = axis.name;
        svg.appendChild(text);
    }

    /**
     * Update mappings en re-render
     */
    updateMappings(mappings) {
        this.mappings.clear();
        mappings.forEach(mapping => {
            this.mappings.set(mapping.target_usage, mapping);
        });
        this.render();
    }

    /**
     * Set active button (voor visuele feedback tijdens luisteren)
     */
    setActiveButton(usage) {
        this.activeButton = usage;
        this.render();
    }

    /**
     * Clear active button
     */
    clearActiveButton() {
        this.activeButton = null;
        this.render();
    }
}

