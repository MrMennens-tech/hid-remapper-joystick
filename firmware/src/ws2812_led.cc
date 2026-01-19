#include "ws2812_led.h"

#include <cstdio>

// Check if WS2812 is configured for this board
#ifdef PICO_DEFAULT_WS2812_PIN

#include "hardware/pio.h"
#include "hardware/clocks.h"
#include "ws2812.pio.h"

static PIO ws2812_pio = pio1;  // Use PIO1, PIO0 is used by USB
static uint ws2812_sm = 0;
static bool ws2812_initialized = false;

bool ws2812_led_init(void) {
    if (ws2812_initialized) {
        return true;
    }
    
    // Try to claim a state machine on PIO1
    int sm = pio_claim_unused_sm(ws2812_pio, false);
    if (sm < 0) {
        // PIO1 full, try PIO0
        ws2812_pio = pio0;
        sm = pio_claim_unused_sm(ws2812_pio, false);
        if (sm < 0) {
            printf("WS2812: No PIO state machine available\n");
            return false;
        }
    }
    ws2812_sm = (uint)sm;
    
    // Add the WS2812 program to PIO
    if (!pio_can_add_program(ws2812_pio, &ws2812_program)) {
        printf("WS2812: Cannot add PIO program\n");
        pio_sm_unclaim(ws2812_pio, ws2812_sm);
        return false;
    }
    
    uint offset = pio_add_program(ws2812_pio, &ws2812_program);
    
    // Initialize the WS2812 program
    // 800kHz is the standard WS2812 frequency
    ws2812_program_init(ws2812_pio, ws2812_sm, offset, PICO_DEFAULT_WS2812_PIN, 800000, false);
    
    ws2812_initialized = true;
    printf("WS2812: Initialized on pin %d (PIO%d SM%d)\n", PICO_DEFAULT_WS2812_PIN, ws2812_pio == pio0 ? 0 : 1, ws2812_sm);
    
    // Set initial color (dim blue = searching)
    ws2812_led_set(0x00000010);
    
    return true;
}

void ws2812_led_set(uint32_t color) {
    if (!ws2812_initialized) {
        return;
    }
    
    // WS2812 expects GRB format, we receive RGB
    uint8_t r = (color >> 16) & 0xFF;
    uint8_t g = (color >> 8) & 0xFF;
    uint8_t b = color & 0xFF;
    
    // Convert to GRB and shift left 8 bits (PIO shifts out MSB first, 24 bits)
    uint32_t grb = ((uint32_t)g << 24) | ((uint32_t)r << 16) | ((uint32_t)b << 8);
    
    pio_sm_put_blocking(ws2812_pio, ws2812_sm, grb);
}

bool ws2812_led_available(void) {
    return ws2812_initialized;
}

#else

// No WS2812 on this board - stub functions
bool ws2812_led_init(void) {
    return false;
}

void ws2812_led_set(uint32_t color) {
    (void)color;
}

bool ws2812_led_available(void) {
    return false;
}

#endif

