#ifndef _SWITCH_PRO_H_
#define _SWITCH_PRO_H_

#include <stdint.h>

#include "host/usbh.h"
#include "host/usbh_pvt.h"

// Check if device is a Nintendo Switch controller (Pro Controller, Joy-Cons)
bool switch_pro_is_nintendo_controller(uint16_t vid, uint16_t pid);

// Initialize a Switch Pro Controller via the HID driver
// Call this from tuh_hid_mount_cb when a Nintendo controller is detected
// Returns true if initialization was started
bool switch_pro_init_controller(uint8_t dev_addr, uint8_t instance);

// Process a report from Switch Pro Controller
// Returns true if this was a Switch Pro setup reply (not actual input)
bool switch_pro_process_report(uint8_t dev_addr, uint8_t instance, uint8_t const* report, uint16_t len);

// Check if controller is ready to receive input
bool switch_pro_is_ready(uint8_t dev_addr, uint8_t instance);

// Clean up when controller is disconnected
void switch_pro_unmount(uint8_t dev_addr, uint8_t instance);

// Called when SET_REPORT completes - advance to next setup stage
void switch_pro_set_report_complete(uint8_t dev_addr, uint8_t instance, uint8_t report_id);

// Custom driver functions (fallback for vendor-specific interface)
bool switch_proh_init(void);
bool switch_proh_open(uint8_t rhport, uint8_t dev_addr, tusb_desc_interface_t const* desc_itf, uint16_t max_len);
bool switch_proh_set_config(uint8_t dev_addr, uint8_t itf_num);
bool switch_proh_xfer_cb(uint8_t dev_addr, uint8_t ep_addr, xfer_result_t result, uint32_t xferred_bytes);
void switch_proh_close(uint8_t dev_addr);

#endif

