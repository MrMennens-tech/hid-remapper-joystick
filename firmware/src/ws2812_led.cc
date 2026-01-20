#include "ws2812_led.h"

#include <cstdio>
#include "pico/time.h"  // for sleep_ms

// Check if WS2812 is configured for this board
#ifdef PICO_DEFAULT_WS2812_PIN

#include "hardware/pio.h"
#include "hardware/clocks.h"
#include "hardware/gpio.h"
#include "ws2812.pio.h"

static PIO ws2812_pio = pio1;  // Use PIO1, PIO0 might be used by USB
static uint ws2812_sm = 0;
static bool ws2812_initialized = false;
static uint ws2812_pin = PICO_DEFAULT_WS2812_PIN;

// Send raw 32-bit value to the PIO state machine
static inline void put_pixel(uint32_t pixel_grb) {
    pio_sm_put_blocking(ws2812_pio, ws2812_sm, pixel_grb);
}

bool ws2812_led_init(void) {
    if (ws2812_initialized) {
        return true;
    }
    
    printf("=== WS2812 LED Initialization ===\n");
    printf("WS2812: Configured pin = %d\n", ws2812_pin);
    printf("WS2812: System clock = %lu Hz\n", (unsigned long)clock_get_hz(clk_sys));
    
    // First, try to claim a state machine on PIO1
    // PIO0 is often used by USB PIO on RP2040/RP2350
    int sm = pio_claim_unused_sm(ws2812_pio, false);
    if (sm < 0) {
        printf("WS2812: PIO1 full, trying PIO0...\n");
        ws2812_pio = pio0;
        sm = pio_claim_unused_sm(ws2812_pio, false);
        if (sm < 0) {
            printf("WS2812: ERROR - No PIO state machine available!\n");
            return false;
        }
    }
    ws2812_sm = (uint)sm;
    printf("WS2812: Using PIO%d SM%d\n", ws2812_pio == pio0 ? 0 : 1, ws2812_sm);
    
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
    printf("WS2812: Initialization COMPLETE on pin %d\n", ws2812_pin);
    
    // Quick flash to show LED is working (no long delays that break USB!)
    ws2812_led_set(0x00200000);  // Brief red flash
    sleep_ms(50);
    ws2812_led_set(LED_COLOR_SEARCHING);  // Blue = ready
    printf("WS2812: LED ready (blue)\n");
    
    return true;
}

void ws2812_led_set(uint32_t color) {
    if (!ws2812_initialized) {
        return;
    }
    
    // WS2812 expects GRB format, we receive RGB in 0x00RRGGBB format
    uint8_t r = (color >> 16) & 0xFF;
    uint8_t g = (color >> 8) & 0xFF;
    uint8_t b = color & 0xFF;
    
    // Convert to GRB format and shift left 8 bits
    // The PIO program shifts out MSB first, expecting 24 bits in upper part of 32-bit word
    uint32_t grb = ((uint32_t)g << 24) | ((uint32_t)r << 16) | ((uint32_t)b << 8);
    
    put_pixel(grb);
}

bool ws2812_led_available(void) {
    return ws2812_initialized;
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

#endif
