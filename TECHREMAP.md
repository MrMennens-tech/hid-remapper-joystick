# TechRemap firmware extensions

This fork adds a few things on top of HID Remapper. The upstream configuration
format (version 18) and its commands are unchanged, so the upstream config tool
still works with this firmware; it just does not know about the extras below.

## Boards

| Board | `PICO_BOARD` | Host USB | Onboard LED | GPIO |
|---|---|---|---|---|
| Waveshare RP2040-Zero | `waveshare_rp2040_zero` | D+ GP0, D- GP1 (soldered on) | GP16 | GP2-15, GP17-25, GP26-29 |
| Waveshare RP2350-USB-A | `waveshare_rp2350_usb_a` | USB-A port (GP12/13) | GP16 | GP0-10, GP26-29 |

Set `REMAPPER_DEBUG_UART=1` in the environment when running `cmake` to get
debug logs on a UART; on the RP2350-USB-A that takes GP0/GP1 away from GPIO.

## Go to layer

Target usage `0xFFFC000N` (N = 0..3) means "go to layer N". Pressing the source
makes N the layer that is active when no other layer is held or toggled on, and
it stays that way after release. The tap and hold flags work as usual. The
mapping's own layer mask decides on which layers the button does this, so one
button can mean "go to layer 2" on layer 1 and "go to layer 1" on layer 2.
After power-up the device is always on layer 1 (index 0).

The existing layer usages (`0xFFF1000N`, active while held, or toggled with
"sticky") are unchanged.

## LED and pin names

Stored in their own flash sector, read and written with these config commands
(same 32-byte feature report as upstream; `PERSIST_CONFIG` saves them too):

| Command | No. | Payload |
|---|---|---|
| `TR_GET_INFO` | 64 | reply: `tr_info_t` (board, pins, limits) |
| `TR_SET_LED` | 65 | `tr_led_t` |
| `TR_GET_LED` | 66 | reply: `tr_led_t` |
| `TR_SET_PIN_NAME` | 67 | `tr_pin_name_t` |
| `TR_GET_PIN_NAME` | 68 | `uint32 pin`; reply: `tr_pin_name_t` |

The structs are in `firmware/src/techremap_ext.h`.

- Layer colours are full-scale `0x00RRGGBB`; `brightness` (0-255, default 64)
  scales them for both the onboard LED and the strip.
- An external WS2812 strip or ring (up to 64 LEDs) shows the active layer's
  colour on every LED. Colour, brightness, count and colour order apply
  immediately; a new strip pin applies after a restart, and that pin is then no
  longer available as GPIO.
- Each GPIO pin can carry a 16-byte UTF-8 name (for example "Input Jack 1").
  The firmware only stores it.
