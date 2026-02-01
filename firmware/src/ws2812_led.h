#ifndef _WS2812_LED_H_
#define _WS2812_LED_H_

#include <stdint.h>

// LED Colors for debug status
// Format: 0x00RRGGBB
// Values increased for better visibility

// Switch Pro Controller status colors
#define LED_COLOR_OFF           0x00000000  // Off
#define LED_COLOR_SEARCHING     0x00000040  // Blue - searching/waiting (brighter)
#define LED_COLOR_DETECTED      0x00400040  // Purple - Nintendo device detected
#define LED_COLOR_HANDSHAKE     0x00404000  // Yellow - sending handshake
#define LED_COLOR_USB_ENABLE    0x00401000  // Orange - USB enable
#define LED_COLOR_HID_MODE      0x00004000  // Dim Green - HID mode
#define LED_COLOR_CONNECTED     0x00008000  // Green - connected and receiving input
#define LED_COLOR_CONTROLLER_CONNECTED LED_COLOR_CONNECTED  // Same: controller active
#define LED_COLOR_INPUT         0x00000080  // Blue flash - receiving input
#define LED_COLOR_ERROR         0x00800000  // Red - error

// Initialize WS2812 LED
// Returns true if WS2812 is available on this board
bool ws2812_led_init(void);

// Set LED color (0x00RRGGBB format)
void ws2812_led_set(uint32_t color);

// Check if WS2812 is available
bool ws2812_led_available(void);

// Set LED color for active layer (layer_state_mask: bit 0 = layer 0, etc.)
// Uses lowest active layer index; called after process_mapping()
void ws2812_led_set_for_layer(uint8_t layer_state_mask);

#endif

