#include "ws2812_led.h"

#include <cstdio>
#include "globals.h"
#include "pico/time.h"  // for sleep_ms

uint8_t led_brightness = 64;
uint8_t led_strip_count = 0;
uint8_t led_strip_order = 0;

// 0x00RRGGBB scaled by led_brightness
[[maybe_unused]] static uint32_t scale_color(uint32_t color) {
    uint32_t r = ((color >> 16) & 0xFF) * led_brightness / 255;
    uint32_t g = ((color >> 8) & 0xFF) * led_brightness / 255;
    uint32_t b = (color & 0xFF) * led_brightness / 255;
    return (r << 16) | (g << 8) | b;
}

// Check if WS2812 is configured for this board
#ifdef PICO_DEFAULT_WS2812_PIN

#include "hardware/dma.h"
#include "hardware/pio.h"
#include "hardware/clocks.h"
#include "hardware/gpio.h"
#include "ws2812.pio.h"

static PIO ws2812_pio = nullptr;
static uint ws2812_sm = 0;
static bool ws2812_initialized = false;
static uint ws2812_pin = PICO_DEFAULT_WS2812_PIN;
static uint ws2812_offset = 0;

#define NO_COLOR 0xFFFFFFFF
#define MAX_STRIP_LEDS 64
// what the onboard LED currently shows, NO_COLOR if unknown
static uint32_t onboard_shown = NO_COLOR;

static bool strip_initialized = false;
static uint strip_sm = 0;
static int strip_dma = -1;
static uint32_t strip_buffer[MAX_STRIP_LEDS];
static uint32_t strip_wanted = 0;
static bool strip_dirty = false;
static uint8_t strip_lit = 0;  // how many LEDs the last frame addressed
static uint64_t strip_last_start = 0;

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
[[maybe_unused]] static int try_claim_pio(PIO pio) {
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
    // RP2040 has 2 PIO blocks and Pico-PIO-USB uses both: PIO0 SM0 for TX and
    // PIO1 SM0/SM1 for RX, with the RX programs filling PIO1's program memory.
    // It claims those state machines by number after we run, so we must not
    // take a low-numbered one. The last state machine on PIO0 is free.
    printf("WS2812: RP2040 detected, using PIO0 SM3...\n");
    if (!pio_sm_is_claimed(pio0, 3)) {
        pio_sm_claim(pio0, 3);
        ws2812_pio = pio0;
        ws2812_sm = 3;
        sm = 3;
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
    ws2812_offset = offset;
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
    // whoever calls this directly (status colours) bypasses the layer colour,
    // so make sure the layer colour is sent again afterwards
    onboard_shown = NO_COLOR;
}

uint8_t ws2812_led_pin(void) {
    return PICO_DEFAULT_WS2812_PIN;
}

void ws2812_led_invalidate(void) {
    onboard_shown = NO_COLOR;
    strip_dirty = true;
}

bool ws2812_strip_supported(void) {
    return true;
}

bool ws2812_strip_init(uint8_t pin) {
    if (!ws2812_initialized || strip_initialized) {
        return false;
    }
    // The strip gets its own state machine on the PIO block that already holds
    // the WS2812 program, so the onboard LED and the strip never share a pin.
    int sm = -1;
#if NUM_PIOS >= 3
    sm = pio_claim_unused_sm(ws2812_pio, false);
#else
    // see ws2812_led_init(): on RP2040 only the high state machines of PIO0 are safe
    if (!pio_sm_is_claimed(pio0, 2)) {
        pio_sm_claim(pio0, 2);
        sm = 2;
    }
#endif
    if (sm < 0) {
        printf("WS2812 strip: no state machine available\n");
        return false;
    }
    strip_dma = dma_claim_unused_channel(false);
    if (strip_dma < 0) {
        printf("WS2812 strip: no DMA channel available\n");
        pio_sm_unclaim(ws2812_pio, sm);
        return false;
    }
    strip_sm = (uint) sm;
    ws2812_program_init(ws2812_pio, strip_sm, ws2812_offset, pin, 800000.0f, false);

    dma_channel_config c = dma_channel_get_default_config(strip_dma);
    channel_config_set_transfer_data_size(&c, DMA_SIZE_32);
    channel_config_set_read_increment(&c, true);
    channel_config_set_write_increment(&c, false);
    channel_config_set_dreq(&c, pio_get_dreq(ws2812_pio, strip_sm, true));
    dma_channel_configure(strip_dma, &c, &ws2812_pio->txf[strip_sm], strip_buffer, 0, false);

    strip_initialized = true;
    strip_dirty = true;
    printf("WS2812 strip: ready on pin %d (SM%d, DMA%d)\n", pin, strip_sm, strip_dma);
    return true;
}

void ws2812_strip_task(void) {
    if (!strip_initialized || !strip_dirty || dma_channel_is_busy(strip_dma)) {
        return;
    }
    // A frame takes 30us per LED and the strip needs a pause before the next one.
    uint64_t now = time_us_64();
    if (now - strip_last_start < 5000) {
        return;
    }
    uint8_t count = led_strip_count > MAX_STRIP_LEDS ? MAX_STRIP_LEDS : led_strip_count;
    // also address the LEDs that were lit before, so a shorter count switches them off
    uint8_t total = count > strip_lit ? count : strip_lit;
    if (total == 0) {
        strip_dirty = false;
        return;
    }
    uint32_t r = (strip_wanted >> 16) & 0xFF, g = (strip_wanted >> 8) & 0xFF, b = strip_wanted & 0xFF;
    uint32_t pixel = (led_strip_order == 1) ? ((r << 16) | (g << 8) | b) : ((g << 16) | (r << 8) | b);
    for (uint8_t i = 0; i < total; i++) {
        strip_buffer[i] = (i < count) ? (pixel << 8) : 0;
    }
    strip_lit = count;
    strip_dirty = false;
    strip_last_start = now;
    dma_channel_set_read_addr(strip_dma, strip_buffer, false);
    dma_channel_set_trans_count(strip_dma, total, true);
}

bool ws2812_led_available(void) {
    return ws2812_initialized;
}

void ws2812_led_set_for_layer(uint8_t layer_state_mask) {
    if (!ws2812_initialized) {
        return;
    }
    // Use lowest active layer index (layer_state_mask: bit 0 = layer 0, etc.)
    int layer = 0;
    for (int i = 0; i < 4; i++) {
        if (layer_state_mask & (1u << i)) {
            layer = i;
            break;
        }
    }
    uint32_t color = scale_color(layer_colors[layer]);
    // this runs every millisecond, so only talk to the LEDs when something changed
    if (color != onboard_shown) {
        ws2812_led_set(color);
        onboard_shown = color;
    }
    if (color != strip_wanted) {
        strip_wanted = color;
        strip_dirty = true;
    }
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

uint8_t ws2812_led_pin(void) {
    return 0xFF;
}

void ws2812_led_invalidate(void) {
}

bool ws2812_strip_supported(void) {
    return false;
}

bool ws2812_strip_init(uint8_t pin) {
    (void)pin;
    return false;
}

void ws2812_strip_task(void) {
}

#endif
