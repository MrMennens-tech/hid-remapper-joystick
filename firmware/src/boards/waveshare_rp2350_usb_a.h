// -----------------------------------------------------
// NOTE: THIS HEADER IS ALSO INCLUDED BY ASSEMBLER SO
//       SHOULD ONLY CONSIST OF PREPROCESSOR DIRECTIVES
// -----------------------------------------------------

// pico_cmake_set PICO_PLATFORM=rp2350

#ifndef _BOARDS_WAVESHARE_RP2350_USB_A_H
#define _BOARDS_WAVESHARE_RP2350_USB_A_H

// For board detection
#define WAVESHARE_RP2350_USB_A_BOARD

#define GPIO_VALID_PINS_BASE 0b00111100000000000000011111111111

#define PICO_DEFAULT_PIO_USB_DP_PIN 12

// --- RP2350 VARIANT ---
#define PICO_RP2350A 1

// --- UART ---
// The debug UART is off by default so that GP0/GP1 can be used as GPIO.
// Build with REMAPPER_DEBUG_UART=1 in the environment to get debug logs
// on GP0 (TX) / GP1 (RX); those two pins are then not available as GPIO.
#ifdef REMAPPER_DEBUG_UART
#ifndef PICO_DEFAULT_UART
#define PICO_DEFAULT_UART 0
#endif
#ifndef PICO_DEFAULT_UART_TX_PIN
#define PICO_DEFAULT_UART_TX_PIN 0
#endif
#ifndef PICO_DEFAULT_UART_RX_PIN
#define PICO_DEFAULT_UART_RX_PIN 1
#endif
#endif

// --- LED ---
#ifndef PICO_DEFAULT_WS2812_PIN
#define PICO_DEFAULT_WS2812_PIN 16
#endif

// --- FLASH ---

#define PICO_BOOT_STAGE2_CHOOSE_W25Q080 1

#ifndef PICO_FLASH_SPI_CLKDIV
#define PICO_FLASH_SPI_CLKDIV 2
#endif

// pico_cmake_set_default PICO_FLASH_SIZE_BYTES = (2 * 1024 * 1024)
#ifndef PICO_FLASH_SIZE_BYTES
#define PICO_FLASH_SIZE_BYTES (2 * 1024 * 1024)
#endif

#ifndef PICO_RP2350_A2_SUPPORTED
#define PICO_RP2350_A2_SUPPORTED 1
#endif

#endif
