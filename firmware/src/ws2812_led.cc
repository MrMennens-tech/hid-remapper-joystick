#include "ws2812_led.h"

#include <cstdio>
#include "pico/time.h"  // for sleep_ms

// Check if WS2812 is configured for this board
#ifdef PICO_DEFAULT_WS2812_PIN

#include "hardware/pio.h"
#include "hardware/clocks.h"
#include "hardware/gpio.h"
#include "ws2812.pio.h"

static PIO ws2812_pio = nullptr;
static uint ws2812_sm = 0;
static bool ws2812_initialized = false;
static uint ws2812_pin = PICO_DEFAULT_WS2812_PIN;

// Send raw 32-bit value to the PIO state machine
static inline void put_pixel(uint32_t pixel_grb) {
    pio_sm_put_blocking(ws2812_pio, ws2812_sm, pixel_grb);
}

// Helper to get PIO index for debug output
static int get_pio_index(PIO pio) {
    if (pio == pio0) return 0;
    if (pio == pio1) return 1;
#if NUM_PIOS >= 3
    if (pio == pio2) return 2;
#endif
    return -1;
}

// Try to claim a state machine on the given PIO
static int try_claim_pio(PIO pio) {
    int sm = pio_claim_unused_sm(pio, false);
    if (sm >= 0) {
        ws2812_pio = pio;
        ws2812_sm = (uint)sm;
        printf("WS2812: Claimed PIO%d SM%d\n", get_pio_index(pio), sm);
    }
    return sm;
}

bool ws2812_led_init(void) {
    if (ws2812_initialized) {
        return true;
    }
    
    printf("=== WS2812 LED Initialization ===\n");
    printf("WS2812: Configured pin = %d\n", ws2812_pin);
    printf("WS2812: System clock = %lu Hz\n", (unsigned long)clock_get_hz(clk_sys));
    printf("WS2812: Platform has %d PIO blocks\n", NUM_PIOS);
    
    int sm = -1;
    
    // RP2350 has 3 PIO blocks - use PIO2 to avoid conflicts with USB PIO
    // USB PIO typically uses PIO0 or PIO1
#if NUM_PIOS >= 3
    printf("WS2812: RP2350 detected, trying PIO2 first (to avoid USB conflict)...\n");
    sm = try_claim_pio(pio2);
    if (sm < 0) {
        printf("WS2812: PIO2 full, trying PIO1...\n");
        sm = try_claim_pio(pio1);
    }
    if (sm < 0) {
        printf("WS2812: PIO1 full, trying PIO0...\n");
        sm = try_claim_pio(pio0);
    }
#else
    // RP2040 has 2 PIO blocks - try PIO1 first (PIO0 often used by USB)
    printf("WS2812: RP2040 detected, trying PIO1 first...\n");
    sm = try_claim_pio(pio1);
    if (sm < 0) {
        printf("WS2812: PIO1 full, trying PIO0...\n");
        sm = try_claim_pio(pio0);
    }
#endif
    
    if (sm < 0) {
        printf("WS2812: ERROR - No PIO state machine available!\n");
        return false;
    }
    
    // Check if we can add the program
    if (!pio_can_add_program(ws2812_pio, &ws2812_program)) {
        printf("WS2812: ERROR - Cannot add PIO program (no space)!\n");
        pio_sm_unclaim(ws2812_pio, ws2812_sm);
        return false;
    }
    
    uint offset = pio_add_program(ws2812_pio, &ws2812_program);
    printf("WS2812: PIO program loaded at offset %d\n", offset);
    
    // Initialize the WS2812 program
    // 800kHz is the standard WS2812 frequency
    // false = not RGBW (24-bit mode)
    ws2812_program_init(ws2812_pio, ws2812_sm, offset, ws2812_pin, 800000.0f, false);
    
    ws2812_initialized = true;
    printf("WS2812: Initialization COMPLETE on PIO%d SM%d pin %d\n", 
           get_pio_index(ws2812_pio), ws2812_sm, ws2812_pin);
    
    // Quick color test - should show RED, GREEN, BLUE in sequence
    printf("WS2812: Color test - RED, GREEN, BLUE\n");
    
    ws2812_led_set(0x00400000);  // RED
    sleep_ms(300);
    ws2812_led_set(0x00004000);  // GREEN
    sleep_ms(300);
    ws2812_led_set(0x00000040);  // BLUE
    sleep_ms(300);
    
    ws2812_led_set(LED_COLOR_SEARCHING);  // Blue = ready
    printf("WS2812: LED ready (blue)\n");
    printf("=================================\n");
    
    return true;
}

void ws2812_led_set(uint32_t color) {
    if (!ws2812_initialized) {
        return;
    }
    
    // Waveshare boards use RGB format LEDs (not GRB like standard WS2812)
    // Input is in 0x00RRGGBB format
    // Shift left 8 bits so RGB is in the upper 24 bits (MSB first)
    uint32_t rgb = color << 8;
    
    put_pixel(rgb);
}

bool ws2812_led_available(void) {
    return ws2812_initialized;
}

// Default colors per layer (0x00RRGGBB): Layer 0 blue, 1 green, 2 yellow, 3 red
static const uint32_t layer_colors[4] = {
    0x00000040,  // Layer 0: Blue
    0x00004000,  // Layer 1: Green
    0x00404000,  // Layer 2: Yellow
    0x00400000,  // Layer 3: Red
};

void ws2812_led_set_for_layer(uint8_t layer_state_mask) {
    if (!ws2812_initialized) {
        return;
    }
    // Use lowest active layer index (layer_state_mask: bit 0 = layer 0, etc.)
    for (int i = 0; i < 4; i++) {
        if (layer_state_mask & (1u << i)) {
            ws2812_led_set(layer_colors[i]);
            return;
        }
    }
    ws2812_led_set(layer_colors[0]);  // Fallback: layer 0
}

#else

// No WS2812 on this board - stub functions
bool ws2812_led_init(void) {
    printf("WS2812: NOT configured for this board (PICO_DEFAULT_WS2812_PIN not defined)\n");
    return false;
}

void ws2812_led_set(uint32_t color) {
    (void)color;
}

bool ws2812_led_available(void) {
    return false;
}

void ws2812_led_set_for_layer(uint8_t layer_state_mask) {
    (void)layer_state_mask;
}

#endif
