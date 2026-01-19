#ifndef _SWITCH_PRO_H_
#define _SWITCH_PRO_H_

#include <stdint.h>

#include "host/usbh.h"
#include "host/usbh_pvt.h"

bool switch_proh_init(void);
bool switch_proh_open(uint8_t rhport, uint8_t dev_addr, tusb_desc_interface_t const* desc_itf, uint16_t max_len);
bool switch_proh_set_config(uint8_t dev_addr, uint8_t itf_num);
bool switch_proh_xfer_cb(uint8_t dev_addr, uint8_t ep_addr, xfer_result_t result, uint32_t xferred_bytes);
void switch_proh_close(uint8_t dev_addr);

#endif

