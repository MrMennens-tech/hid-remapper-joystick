#ifndef _WS2812_LED_H_
#define _WS2812_LED_H_

#include <stdint.h>

// LED Colors for debug status
// Format: 0x00RRGGBB

// Switch Pro Controller status colors
#define LED_COLOR_OFF           0x00000000  // Off
#define LED_COLOR_SEARCHING     0x00000010  // Dim Blue - searching/waiting
#define LED_COLOR_DETECTED      0x00100010  // Purple - Nintendo device detected
#define LED_COLOR_HANDSHAKE     0x00101000  // Yellow - sending handshake
#define LED_COLOR_USB_ENABLE    0x00100800  // Orange - USB enable
#define LED_COLOR_HID_MODE      0x00001000  // Dim Green - HID mode
#define LED_COLOR_CONNECTED     0x00002000  // Green - connected and receiving input
#define LED_COLOR_INPUT         0x00000020  // Blue flash - receiving input
#define LED_COLOR_ERROR         0x00200000  // Red - error

// Initialize WS2812 LED
// Returns true if WS2812 is available on this board
bool ws2812_led_init(void);

// Set LED color (0x00RRGGBB format)
void ws2812_led_set(uint32_t color);

// Check if WS2812 is available
bool ws2812_led_available(void);

#endif

