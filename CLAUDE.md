# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This is **HID Remapper** — a configurable USB dongle (RP2040/RP2350 or nRF52840) that remaps HID inputs (mouse, keyboard, gamepad). It has three main components:

- `firmware/` — C++ firmware for RP2040/RP2350, built with CMake + pico-sdk
- `firmware-bluetooth/` — C++ firmware for nRF52840, built with Zephyr/West
- `config-tool-web-v2/` — **TechRemap**, a custom WebHID config UI (plain ES modules, no build step)
- `config-tool-web/` — Original upstream config tool (reference only, do not modify)
- `config-tool/` — Python CLI alternative to the web tool

## Active development branch

All UI work is done on branch `claude/simplify-hid-ui-yNeiI`. The `gh-pages` branch hosts the live site; push `config-tool-web-v2/` files there to deploy.

## Web UI — config-tool-web-v2

**No build step.** Pure ES modules loaded directly in the browser. Serve locally with any static file server, e.g.:
```
cd config-tool-web-v2
python3 -m http.server 8080
```
Requires Chrome/Chromium (WebHID API).

### Module architecture

| File | Role |
|------|------|
| `index.html` | Shell — tab bar, panels, SVG controller layout |
| `app.js` | All UI logic, state, event handlers, tab renderers |
| `device.js` | WebHID communication layer — connect, load/save config, monitor |
| `usages.js` | HID usage code registry, controller visual layout, color helpers |
| `crc.js` | CRC-32 for HID feature report integrity |

**`app.js` exports only `init()`**, which is called from `index.html`. All state lives in the `state` object at the top of the file.

### Critical data model details

- **`layers: []`** in a mapping means "active on ALL layers" (firmware convention). An empty array is NOT "no layers". The `getMappingsFor()` function handles this: `m.layers.length === 0 || m.layers.includes(layer)`.
- **HID usage codes** are 32-bit hex strings: `'0xPPPPUUUU'` (page + usage). Always lowercase, zero-padded to 10 chars.
- **`scaling`** is stored as an integer where 1000 = 100%. Display as `(value / 10).toFixed(0) + '%'`.
- **`layer_colors`** are `0x00RRGGBB` firmware values with max channel ~0x40 (64); multiply by 4 for CSS display.

### Device protocol (device.js)

- Uses HID feature reports (report ID 100) with a 32-byte packet format: `[version(1), command(1), payload..., crc32(4)]`
- Monitor data arrives via input reports (report ID 101): `[usage_hi(2), usage_lo(2), hub_port(1), value(4)] * n`
- `CONFIG_VERSION = 18` — firmware version must match; mismatches throw a user-visible error
- `busy` flag prevents concurrent device operations

### Tabs

- **Remap** — SVG controller visual + assignment panel (source picker, sensitivity slider, deadzone, advanced options hidden in `<details>`)
- **Overview** — read-only table of all mappings (rendered by `renderOverviewTab()`)
- **Layers & LED** — passthrough layer toggles + WS2812 LED color pickers
- **Settings** — polling rate, emulation mode, normalize gamepad inputs, timing
- **Advanced** — macros, expressions, quirks, JSON import/export
- **Monitor** — live input stream via `enableMonitor`/`disableMonitor` (firmware command 22)

## Firmware build (RP2040)

Prerequisites: `gcc-arm-none-eabi`, `libnewlib-arm-none-eabi`, `libstdc++-arm-none-eabi-newlib`, `srecord`.

```bash
git submodule update --init
cd firmware && mkdir build && cd build
cmake ..                        # standard single-Pico build
# PICO_BOARD=remapper cmake ..  # custom board variants
make
```

GitHub Actions (`.github/workflows/build-rp2040.yml`) build all variants automatically.

## Firmware build (nRF52)

```bash
docker run --rm -v $(pwd):/workdir/project -w /workdir/project/firmware-bluetooth \
  nordicplayground/nrfconnect-sdk:v2.2-branch west build -b seeed_xiao_nrf52840
```

## Config JSON format

The config JSON (import/export) mirrors the in-memory `cfg` object from `device.js`. Key fields:
```json
{
  "version": 18,
  "mappings": [
    { "source_usage": "0xfff30001", "target_usage": "0x00010030",
      "scaling": 1000, "layers": [], "sticky": false, "tap": false, "hold": false }
  ],
  "layer_colors": [64, 16384, 4194304, 4194368],
  "unmapped_passthrough_layers": [0,1,2,3,4,5,6,7]
}
```
