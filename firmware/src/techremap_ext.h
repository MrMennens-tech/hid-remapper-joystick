#ifndef _TECHREMAP_EXT_H_
#define _TECHREMAP_EXT_H_

// TechRemap extensions on top of HID Remapper.
//
// Everything here lives next to the upstream configuration instead of inside
// it: the settings are stored in their own flash sector and are read and
// written with their own config commands (numbered from 64). The upstream
// config format and commands are untouched, so the upstream config tool keeps
// working with this firmware.

#include <stdint.h>

#include "types.h"

#define TECHREMAP_EXT_VERSION 1
#define TECHREMAP_NPINS 30
#define TECHREMAP_PIN_NAME_LEN 16
#define TECHREMAP_MAX_STRIP_LEDS 64
#define TECHREMAP_NO_PIN 0xFF

#define TECHREMAP_BOARD_UNKNOWN 0
#define TECHREMAP_BOARD_RP2040_ZERO 1
#define TECHREMAP_BOARD_RP2350_USB_A 2

// Reply to TR_GET_INFO: what this board can do.
struct __attribute__((packed)) tr_info_t {
    uint8_t ext_version;
    uint8_t board;
    uint8_t nlayers;
    uint8_t onboard_led_pin;      // TECHREMAP_NO_PIN if the board has no WS2812
    uint32_t board_pins_mask;     // every pin the board offers as GPIO
    uint32_t usable_pins_mask;    // the same minus the pin the LED strip took at boot
    uint8_t max_strip_leds;       // 0 if this build cannot drive a strip
    uint8_t pin_name_len;
    uint8_t active_strip_pin;     // pin the strip is driven on since boot, or TECHREMAP_NO_PIN
};

// TR_SET_LED / TR_GET_LED. Colours are full-scale 0x00RRGGBB; brightness scales them.
struct __attribute__((packed)) tr_led_t {
    uint8_t brightness;
    uint8_t strip_pin;            // takes effect after a restart
    uint8_t strip_count;
    uint8_t strip_order;          // 0 = GRB (most strips and rings), 1 = RGB
    uint32_t layer_colors[4];
};

// TR_SET_PIN_NAME and the reply to TR_GET_PIN_NAME.
struct __attribute__((packed)) tr_pin_name_t {
    uint8_t pin;
    char name[TECHREMAP_PIN_NAME_LEN];  // UTF-8, zero padded, not necessarily terminated
};

// Read the stored settings. Must run before the GPIO pins are set up,
// because the LED strip takes its pin away from the GPIO pool.
void techremap_ext_load(const uint8_t* flash_sector, uint32_t board_pins_mask);

// Pins that must not be used as GPIO (the LED strip pin, if any).
uint32_t techremap_ext_reserved_pins();

// Pin the LED strip is driven on, or TECHREMAP_NO_PIN.
uint8_t techremap_ext_strip_pin();

// Write the settings to flash if they differ from what is stored.
void techremap_ext_persist();

// Config command hooks. Both return true if the command was one of ours.
bool techremap_ext_handle_set(const set_feature_t* request);
bool techremap_ext_handle_get(ConfigCommand command, uint8_t* reply);

// Provided by the platform (main.cc).
void techremap_ext_write_flash(const uint8_t* sector);
const uint8_t* techremap_ext_flash();

#endif
