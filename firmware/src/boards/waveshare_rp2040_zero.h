// -----------------------------------------------------
// NOTE: THIS HEADER IS ALSO INCLUDED BY ASSEMBLER SO
//       SHOULD ONLY CONSIST OF PREPROCESSOR DIRECTIVES
// -----------------------------------------------------

// Waveshare RP2040-Zero with a USB-A receptacle soldered on by hand:
// D+ to GP0, D- to GP1, VBUS to 5V, GND to GND (same wiring as the
// single Pico variant in HARDWARE.md).

#ifndef _BOARDS_WAVESHARE_RP2040_ZERO_H
#define _BOARDS_WAVESHARE_RP2040_ZERO_H

// For board detection
#define WAVESHARE_RP2040_ZERO_BOARD

// GP0-GP15 and GP26-GP29 are on the edge, GP17-GP25 are pads on the
// bottom. GP16 drives the onboard WS2812 and is not available as GPIO.
// The USB host pins are removed from this mask at runtime.
#define GPIO_VALID_PINS_BASE 0b00111111111111101111111111111111

#define PICO_DEFAULT_PIO_USB_DP_PIN 0

// --- LED ---
#ifndef PICO_DEFAULT_WS2812_PIN
#define PICO_DEFAULT_WS2812_PIN 16
#endif

// --- FLASH ---

#define PICO_BOOT_STAGE2_CHOOSE_W25Q080 1

#ifndef PICO_FLASH_SPI_CLKDIV
#define PICO_FLASH_SPI_CLKDIV 2
#endif

#ifndef PICO_FLASH_SIZE_BYTES
#define PICO_FLASH_SIZE_BYTES (2 * 1024 * 1024)
#endif

#ifndef PICO_RP2040_B0_SUPPORTED
#define PICO_RP2040_B0_SUPPORTED 1
#endif

#endif
