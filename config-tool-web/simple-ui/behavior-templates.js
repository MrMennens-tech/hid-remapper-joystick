/**
 * Behavior Templates
 * Genereert RPN expressies voor verschillende gedragstypen
 */
export class BehaviorTemplates {
    constructor() {
        this.registerCounter = 0;
        this.maxRegisters = 32; // Maximum aantal registers
        this.usedRegisters = new Set();
    }

    /**
     * Genereer expressie op basis van behavior type
     */
    generateExpression(behaviorType, sourceUsage, params = {}) {
        this.registerCounter = 0;
        this.usedRegisters.clear();

        switch (behaviorType) {
            case 'direct':
                return this.generateDirect(sourceUsage);
            
            case 'toggle':
                return this.generateToggle(sourceUsage, params);
            
            case 'turbo':
                return this.generateTurbo(sourceUsage, params);
            
            case 'hold':
                return this.generateHold(sourceUsage, params);
            
            default:
                return this.generateDirect(sourceUsage);
        }
    }

    /**
     * Direct mapping (1-op-1)
     * Expressie: PUSH_USAGE source_usage
     */
    generateDirect(sourceUsage) {
        const usageNum = parseInt(sourceUsage, 16);
        return {
            expression: `PUSH_USAGE ${usageNum}`,
            description: 'Direct (1-op-1)',
            complexity: 1
        };
    }

    /**
     * Toggle behavior (Aan/Uit bij elke druk)
     * Expressie: reg recall not reg store
     * Gebruikt een register om de toggle state bij te houden
     */
    generateToggle(sourceUsage, params = {}) {
        const register = this.getNextRegister();
        const usageNum = parseInt(sourceUsage, 16);
        
        // RPN: INPUT_STATE source -> RECALL register -> NOT -> STORE register -> INPUT_STATE source
        // Dit genereert: als input actief is, toggle de register state
        const expression = [
            `PUSH_USAGE ${usageNum}`,  // Push source usage
            'INPUT_STATE_BINARY',      // Get binary state (0 or 1)
            `PUSH ${register}`,        // Push register number
            'RECALL',                  // Recall register value
            'NOT',                     // Invert (toggle)
            `PUSH ${register}`,        // Push register number again
            'STORE',                   // Store new value
            `PUSH ${register}`,        // Push register number
            'RECALL'                   // Recall to output
        ].join(' ');

        return {
            expression: expression,
            description: 'Toggle (Aan/Uit)',
            complexity: 3,
            registers: [register]
        };
    }

    /**
     * Turbo/Rapid Fire behavior
     * Expressie: Herhaaldelijk pulseren wanneer input actief is
     */
    generateTurbo(sourceUsage, params = {}) {
        const rate = params.rate || 10; // Pulses per seconde
        const register = this.getNextRegister();
        const usageNum = parseInt(sourceUsage, 16);
        
        // RPN logica:
        // - Als input actief is, genereer pulsen op basis van tijd
        // - Gebruik TIME en MOD om periodieke pulsen te maken
        const period = 1000 / rate; // Periode in milliseconden
        
        const expression = [
            `PUSH_USAGE ${usageNum}`,
            'INPUT_STATE_BINARY',      // Check if input is active
            `PUSH ${period}`,          // Push period
            'TIME',                    // Get current time
            'MOD',                     // Modulo voor periodieke herhaling
            `PUSH ${period / 2}`,      // Half period (voor 50% duty cycle)
            'LT',                      // Less than -> pulse high voor eerste helft
            'MUL'                      // Multiply with input state
        ].join(' ');

        return {
            expression: expression,
            description: `Turbo (${rate} Hz)`,
            complexity: 4,
            registers: [register]
        };
    }

    /**
     * Hold to Trigger behavior
     * Expressie: Actieven na X milliseconden vasthouden
     */
    generateHold(sourceUsage, params = {}) {
        const holdTime = params.holdTime || 500; // Milliseconden
        const register = this.getNextRegister();
        const usageNum = parseInt(sourceUsage, 16);
        
        // RPN logica:
        // - Houd bij wanneer input voor het eerst actief wordt
        // - Check of holdTime is verstreken
        // - Output alleen als holdTime is bereikt
        
        // Complexere expressie die tijd bijhoudt
        const expression = [
            `PUSH_USAGE ${usageNum}`,
            'INPUT_STATE_BINARY',
            `PUSH ${register}`,
            'RECALL',                  // Get previous state
            'NOT',                     // Invert
            'MUL',                     // Only true when transitioning from 0 to 1
            'TIME',                    // Get current time
            `PUSH ${register}`,
            'STORE',                   // Store trigger time
            `PUSH_USAGE ${usageNum}`,
            'INPUT_STATE_BINARY',
            `PUSH ${register}`,
            'RECALL',                  // Get trigger time
            'SUB',                     // Current time - trigger time
            `PUSH ${holdTime}`,
            'GT',                      // Greater than holdTime?
            `PUSH_USAGE ${usageNum}`,
            'INPUT_STATE_BINARY',
            'MUL'                      // Only if still holding
        ].join(' ');

        return {
            expression: expression,
            description: `Hold to Trigger (${holdTime}ms)`,
            complexity: 5,
            registers: [register]
        };
    }

    /**
     * Get next available register number
     */
    getNextRegister() {
        // Zoek eerste beschikbare register
        for (let i = 0; i < this.maxRegisters; i++) {
            if (!this.usedRegisters.has(i)) {
                this.usedRegisters.add(i);
                return i;
            }
        }
        
        // Als alle registers gebruikt zijn, recycle
        this.registerCounter = (this.registerCounter + 1) % this.maxRegisters;
        return this.registerCounter;
    }

    /**
     * Reset register tracking
     */
    resetRegisters() {
        this.usedRegisters.clear();
        this.registerCounter = 0;
    }

    /**
     * Valideer expressie syntax (basis check)
     */
    validateExpression(expression) {
        if (!expression || typeof expression !== 'string') {
            return { valid: false, error: 'Expressie is leeg' };
        }

        const tokens = expression.split(/\s+/);
        const validOps = [
            'PUSH', 'PUSH_USAGE', 'INPUT_STATE', 'INPUT_STATE_BINARY',
            'ADD', 'SUB', 'MUL', 'DIV', 'MOD',
            'EQ', 'GT', 'LT', 'NOT',
            'STORE', 'RECALL', 'TIME', 'ABS', 'MIN', 'MAX'
        ];

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            // Check of het een nummer is
            if (!isNaN(token)) {
                continue;
            }
            
            // Check of het een geldige operatie is
            if (!validOps.includes(token)) {
                return { valid: false, error: `Onbekende operatie: ${token}` };
            }
        }

        return { valid: true };
    }

    /**
     * Converteer expressie naar firmware formaat
     * (Voor nu returnen we de expressie string, later kan dit gecompileerd worden)
     */
    compileExpression(expression) {
        // In de toekomst kan dit gecompileerd worden naar bytecode
        // Voor nu returnen we de expressie string
        return expression;
    }
}

