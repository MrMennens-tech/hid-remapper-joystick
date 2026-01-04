/**
 * InputListener Class
 * Universele luistermodus voor input detectie via WebHID
 */
export class InputListener {
    constructor(device, onInputDetected) {
        this.device = device;
        this.onInputDetected = onInputDetected;
        this.isListening = false;
        this.timeout = null;
        this.startTime = null;
        this.duration = 5000; // 5 seconden standaard
        this.lastReportData = null;
        this.reportId = 101; // REPORT_ID_MONITOR
        
        // Bind event handler
        this.handleInputReport = this.handleInputReport.bind(this);
    }

    /**
     * Start luisteren naar input
     */
    start(duration = 5000) {
        if (!this.device) {
            throw new Error('Geen device verbonden');
        }

        if (this.isListening) {
            this.stop();
        }

        this.isListening = true;
        this.duration = duration;
        this.startTime = Date.now();
        this.lastReportData = null;

        // Enable monitor mode op device (als beschikbaar)
        if (typeof window !== 'undefined' && window.set_monitor_enabled) {
            window.set_monitor_enabled(true);
        }

        // Luister naar input reports
        this.device.addEventListener('inputreport', this.handleInputReport);

        // Timeout
        this.timeout = setTimeout(() => {
            this.stop();
            if (this.onInputDetected) {
                this.onInputDetected(null, 'timeout');
            }
        }, this.duration);

        return this;
    }

    /**
     * Stop luisteren
     */
    stop() {
        this.isListening = false;

        if (this.device) {
            this.device.removeEventListener('inputreport', this.handleInputReport);
        }

        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        // Disable monitor mode (optioneel)
        // if (typeof window !== 'undefined' && window.set_monitor_enabled) {
        //     window.set_monitor_enabled(false);
        // }

        return this;
    }

    /**
     * Handle input report events
     */
    handleInputReport(event) {
        if (!this.isListening) return;

        // Check of dit een monitor report is
        if (event.reportId !== this.reportId) {
            return;
        }

        try {
            const data = event.data;
            const detectedInput = this.parseInputReport(data);

            if (detectedInput) {
                this.stop();
                if (this.onInputDetected) {
                    this.onInputDetected(detectedInput, 'success');
                }
            }
        } catch (error) {
            console.error('Error parsing input report:', error);
        }
    }

    /**
     * Parse input report data om input te detecteren
     * Gebaseerd op monitor report structuur: 7 entries van 9 bytes elk
     * Elke entry: 4 bytes usage (uint32), 4 bytes value (int32), 1 byte padding
     */
    parseInputReport(data) {
        if (!data || data.byteLength < 9) {
            return null;
        }

        // Parse monitor data (7 entries)
        for (let i = 0; i < 7; i++) {
            const offset = i * 9;
            if (offset + 8 > data.byteLength) break;

            // Read usage (uint32, little-endian)
            const usage = data.getUint32(offset, true);
            const usageHex = '0x' + usage.toString(16).padStart(8, '0');

            // Read value (int32, little-endian)
            const value = data.getInt32(offset + 4, true);

            // Skip null usage
            if (usage === 0 || usageHex === '0x00000000') {
                continue;
            }

            // Detect button press (value > 0 voor buttons)
            // Detect axis movement (value != 0 voor axes)
            if (value !== 0) {
                // Check of dit een nieuwe input is (niet dezelfde als laatste)
                const currentData = `${usageHex}:${value}`;
                if (this.lastReportData === currentData) {
                    continue; // Skip duplicate
                }
                this.lastReportData = currentData;

                // Bepaal input type
                const inputType = this.determineInputType(usage, value);

                return {
                    usage: usageHex,
                    value: value,
                    type: inputType,
                    timestamp: Date.now()
                };
            }
        }

        return null;
    }

    /**
     * Bepaal input type op basis van usage code
     */
    determineInputType(usage, value) {
        // Extract usage page (eerste 16 bits)
        const usagePage = (usage >>> 16) & 0xFFFF;

        // Generic Desktop Page (0x01) - axes
        if (usagePage === 0x01) {
            return 'axis';
        }

        // Button Page (0x09) - buttons
        if (usagePage === 0x09) {
            return 'button';
        }

        // Consumer Page (0x0C) - media controls
        if (usagePage === 0x0C) {
            return 'consumer';
        }

        // Keyboard Page (0x07) - keyboard keys
        if (usagePage === 0x07) {
            return 'keyboard';
        }

        // Default
        return 'unknown';
    }

    /**
     * Get remaining time in milliseconds
     */
    getRemainingTime() {
        if (!this.isListening || !this.startTime) {
            return 0;
        }

        const elapsed = Date.now() - this.startTime;
        return Math.max(0, this.duration - elapsed);
    }

    /**
     * Get progress percentage (0-100)
     */
    getProgress() {
        if (!this.isListening || !this.startTime) {
            return 0;
        }

        const elapsed = Date.now() - this.startTime;
        return Math.min(100, (elapsed / this.duration) * 100);
    }
}

