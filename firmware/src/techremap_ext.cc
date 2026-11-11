#include "techremap_ext.h"

#include <cstring>

#include "crc.h"
#include "globals.h"
#include "ws2812_led.h"

#define TR_SECTOR_SIZE 4096
#define TR_MAGIC 0x31585254  // "TRX1"

extern uint32_t gpio_valid_pins_mask;

struct __attribute__((packed)) tr_persist_t {
    uint32_t magic;
    uint8_t version;
    tr_led_t led;
    char pin_names[TECHREMAP_NPINS][TECHREMAP_PIN_NAME_LEN];
};

static tr_led_t led = {
    .brightness = 64,
    .strip_pin = TECHREMAP_NO_PIN,
    .strip_count = 0,
    .strip_order = 0,
    .layer_colors = { 0x000000FF, 0x0000FF00, 0x00FF0000, 0x00FFFF00 },
};
static char pin_names[TECHREMAP_NPINS][TECHREMAP_PIN_NAME_LEN] = {};

static uint32_t board_pins = 0;
static uint8_t active_strip_pin = TECHREMAP_NO_PIN;
static uint8_t requested_pin = 0;

static void apply_led() {
    if (led.strip_count > TECHREMAP_MAX_STRIP_LEDS) {
        led.strip_count = TECHREMAP_MAX_STRIP_LEDS;
    }
    memcpy(layer_colors, led.layer_colors, sizeof(layer_colors));
    led_brightness = led.brightness;
    led_strip_count = led.strip_count;
    led_strip_order = led.strip_order;
    ws2812_led_invalidate();
}

void techremap_ext_load(const uint8_t* flash_sector, uint32_t board_pins_mask) {
    board_pins = board_pins_mask;
    const tr_persist_t* stored = (const tr_persist_t*) flash_sector;
    uint32_t stored_crc;
    memcpy(&stored_crc, flash_sector + TR_SECTOR_SIZE - 4, 4);
    if ((stored->magic == TR_MAGIC) && (stored->version == TECHREMAP_EXT_VERSION) &&
        (crc32(flash_sector, TR_SECTOR_SIZE - 4) == stored_crc)) {
        led = stored->led;
        memcpy(pin_names, stored->pin_names, sizeof(pin_names));
    }
    apply_led();
    if ((led.strip_count > 0) && (led.strip_pin < TECHREMAP_NPINS) && (board_pins & (1u << led.strip_pin)) &&
        ws2812_strip_supported()) {
        active_strip_pin = led.strip_pin;
    }
}

uint32_t techremap_ext_reserved_pins() {
    return (active_strip_pin == TECHREMAP_NO_PIN) ? 0 : (1u << active_strip_pin);
}

uint8_t techremap_ext_strip_pin() {
    return active_strip_pin;
}

void techremap_ext_persist() {
    // stack size is 2KB
    static uint8_t buffer[TR_SECTOR_SIZE];
    memset(buffer, 0, sizeof(buffer));
    tr_persist_t* out = (tr_persist_t*) buffer;
    out->magic = TR_MAGIC;
    out->version = TECHREMAP_EXT_VERSION;
    out->led = led;
    memcpy(out->pin_names, pin_names, sizeof(pin_names));
    uint32_t crc = crc32(buffer, TR_SECTOR_SIZE - 4);
    memcpy(buffer + TR_SECTOR_SIZE - 4, &crc, 4);
    if (memcmp(buffer, techremap_ext_flash(), TR_SECTOR_SIZE) != 0) {
        techremap_ext_write_flash(buffer);
    }
}

bool techremap_ext_handle_set(const set_feature_t* request) {
    switch (request->command) {
        case ConfigCommand::TR_GET_INFO:
        case ConfigCommand::TR_GET_LED:
            return true;
        case ConfigCommand::TR_SET_LED:
            memcpy(&led, request->data, sizeof(led));
            apply_led();
            return true;
        case ConfigCommand::TR_SET_PIN_NAME: {
            const tr_pin_name_t* in = (const tr_pin_name_t*) request->data;
            if (in->pin < TECHREMAP_NPINS) {
                memcpy(pin_names[in->pin], in->name, TECHREMAP_PIN_NAME_LEN);
            }
            return true;
        }
        case ConfigCommand::TR_GET_PIN_NAME:
            requested_pin = ((const get_indexed_t*) request->data)->requested_index;
            return true;
        default:
            return false;
    }
}

bool techremap_ext_handle_get(ConfigCommand command, uint8_t* reply) {
    switch (command) {
        case ConfigCommand::TR_GET_INFO: {
            tr_info_t* info = (tr_info_t*) reply;
            info->ext_version = TECHREMAP_EXT_VERSION;
#ifdef TECHREMAP_BOARD_ID
            info->board = TECHREMAP_BOARD_ID;
#else
            info->board = TECHREMAP_BOARD_UNKNOWN;
#endif
            info->nlayers = 4;
            info->onboard_led_pin = ws2812_led_pin();
            info->board_pins_mask = board_pins;
            info->usable_pins_mask = gpio_valid_pins_mask;
            info->max_strip_leds = ws2812_strip_supported() ? TECHREMAP_MAX_STRIP_LEDS : 0;
            info->pin_name_len = TECHREMAP_PIN_NAME_LEN;
            info->active_strip_pin = active_strip_pin;
            return true;
        }
        case ConfigCommand::TR_GET_LED:
            memcpy(reply, &led, sizeof(led));
            return true;
        case ConfigCommand::TR_GET_PIN_NAME: {
            tr_pin_name_t* out = (tr_pin_name_t*) reply;
            out->pin = requested_pin;
            if (requested_pin < TECHREMAP_NPINS) {
                memcpy(out->name, pin_names[requested_pin], TECHREMAP_PIN_NAME_LEN);
            }
            return true;
        }
        default:
            return false;
    }
}
