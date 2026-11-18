// -----------------------------------------------------
// NOTE: THIS HEADER IS ALSO INCLUDED BY ASSEMBLER SO
//       SHOULD ONLY CONSIST OF PREPROCESSOR DIRECTIVES
// -----------------------------------------------------

// HID Remapper custom board v8 with three analog inputs and a NeoPixel.
//
// Same board as remapper_v8 (no USB inputs, TRRS jack for analog input), but:
//  - GPIO26, GPIO27 and GPIO28 are all analog inputs (usages 0xfff80000-0xfff80002).
//    GPIO28 is taken out of the digital pin mask, otherwise its pull-up would skew
//    the analog reading.
//  - A NeoPixel (WS2812) is supported. Its pin is chosen in the TechRemap app
//    (Board setup > LED strip, 1 LED); GP16 is the default.

#ifndef _BOARDS_REMAPPER_V8_3ADC_H
#define _BOARDS_REMAPPER_V8_3ADC_H

#define HID_REMAPPER_BOARD_V8

#define ADC_ENABLED
#define NADCS 3

// GPIO0-GPIO25 are digital; GPIO26-GPIO28 are analog. GPIO0/1 stay reserved for the USB host.
#define GPIO_VALID_PINS_BASE 0x03FFFFFF

#define PICO_DEFAULT_PIO_USB_DP_PIN 0
#define PICO_SMPS_MODE_PIN 23

// NeoPixel through the config tool (see techremap_ext.cc for the defaults)
#define TECHREMAP_LED_STRIP
#define TECHREMAP_DEFAULT_STRIP_PIN 16
#define TECHREMAP_DEFAULT_STRIP_COUNT 1

// --- FLASH ---

#define PICO_BOOT_STAGE2_CHOOSE_W25Q080 1

#ifndef PICO_FLASH_SPI_CLKDIV
#define PICO_FLASH_SPI_CLKDIV 2
#endif

#ifndef PICO_FLASH_SIZE_BYTES
#define PICO_FLASH_SIZE_BYTES (1 * 1024 * 1024)
#endif

#ifndef PICO_RP2040_B0_SUPPORTED
#define PICO_RP2040_B0_SUPPORTED 1
#endif

#endif
