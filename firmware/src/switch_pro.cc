#include "switch_pro.h"
#include "constants.h"
#include "remapper.h"
#include "ws2812_led.h"

#include <cstring>

#define NSWDEVS 8

// Nintendo Switch Pro Controller USB initialization
// The controller requires a handshake before it starts sending input reports.
// This is based on reverse engineering from various sources including:
// - Linux hid-nintendo driver
// - dekuNukem's Nintendo_Switch_Reverse_Engineering
// - HandheldLegend documentation

// USB commands for Switch Pro Controller
// These are sent via the output endpoint to initialize the controller

// Command to enable USB mode (baud rate change command)
static uint8_t usb_enable[] = { 0x80, 0x02 };

// Command for USB handshake
static uint8_t usb_handshake[] = { 0x80, 0x01 };

// Command to request device info (for verification, optional)
// static uint8_t usb_device_info[] = { 0x80, 0x03 };

// Command to force USB HID mode (required for input reports)
static uint8_t usb_hid_only[] = { 0x80, 0x04 };

// The Switch Pro Controller sends input reports in a specific format.
// We create a fake HID descriptor to parse these reports.
// Report ID 0x30 is the standard full input report (buttons, sticks, IMU)
// Report ID 0x21 is the reply to subcommands
// Report ID 0x3F is the simple HID mode report

// Simple HID mode descriptor - the controller uses this after 0x80 0x04 command
// Format: buttons (2 bytes), hat (1 byte), sticks (4 bytes), vendor (6 bytes)
static const uint8_t switch_pro_descriptor[] = {
    0x05, 0x01,        // Usage Page (Generic Desktop Ctrls)
    0x09, 0x05,        // Usage (Game Pad)
    0xA1, 0x01,        // Collection (Application)
    0x85, 0x3F,        //   Report ID (63 / 0x3F)
    
    // 16 buttons (2 bytes)
    0x05, 0x09,        //   Usage Page (Button)
    0x19, 0x01,        //   Usage Minimum (0x01)
    0x29, 0x10,        //   Usage Maximum (0x10)
    0x15, 0x00,        //   Logical Minimum (0)
    0x25, 0x01,        //   Logical Maximum (1)
    0x75, 0x01,        //   Report Size (1)
    0x95, 0x10,        //   Report Count (16)
    0x81, 0x02,        //   Input (Data,Var,Abs)
    
    // Hat switch (D-pad)
    0x05, 0x01,        //   Usage Page (Generic Desktop Ctrls)
    0x09, 0x39,        //   Usage (Hat switch)
    0x15, 0x00,        //   Logical Minimum (0)
    0x25, 0x07,        //   Logical Maximum (7)
    0x35, 0x00,        //   Physical Minimum (0)
    0x46, 0x3B, 0x01,  //   Physical Maximum (315)
    0x65, 0x14,        //   Unit (Eng Rot:Angular Pos)
    0x75, 0x04,        //   Report Size (4)
    0x95, 0x01,        //   Report Count (1)
    0x81, 0x42,        //   Input (Data,Var,Abs,Null)
    
    // Padding (4 bits)
    0x75, 0x04,        //   Report Size (4)
    0x95, 0x01,        //   Report Count (1)
    0x81, 0x03,        //   Input (Const,Var,Abs)
    
    // Left stick X
    0x09, 0x30,        //   Usage (X)
    0x15, 0x00,        //   Logical Minimum (0)
    0x26, 0xFF, 0x00,  //   Logical Maximum (255)
    0x75, 0x08,        //   Report Size (8)
    0x95, 0x01,        //   Report Count (1)
    0x81, 0x02,        //   Input (Data,Var,Abs)
    
    // Left stick Y (inverted)
    0x09, 0x31,        //   Usage (Y)
    0x81, 0x02,        //   Input (Data,Var,Abs)
    
    // Right stick X
    0x09, 0x32,        //   Usage (Z)
    0x81, 0x02,        //   Input (Data,Var,Abs)
    
    // Right stick Y (inverted)
    0x09, 0x35,        //   Usage (Rz)
    0x81, 0x02,        //   Input (Data,Var,Abs)
    
    // Vendor-specific data (6 bytes padding)
    0x06, 0x00, 0xFF,  //   Usage Page (Vendor Defined 0xFF00)
    0x09, 0x20,        //   Usage (0x20)
    0x75, 0x08,        //   Report Size (8)
    0x95, 0x06,        //   Report Count (6)
    0x81, 0x02,        //   Input (Data,Var,Abs)
    
    0xC0,              // End Collection
};

struct swdev_t {
    uint8_t dev_addr = 0;
    uint8_t itf_num = 0;
    uint8_t in_ep = 0;
    uint16_t in_ep_size = 0;
    uint8_t out_ep = 0;
    uint16_t out_ep_size = 0;
    int setup_stage = 0;
    uint8_t buf[64] = { 0 };
    uint16_t vid = 0;
    uint16_t pid = 0;
};

static struct swdev_t swdevs[NSWDEVS];

static struct swdev_t* allocate_swdev() {
    for (int i = 0; i < NSWDEVS; i++) {
        if (swdevs[i].dev_addr == 0) {
            return &swdevs[i];
        }
    }
    return nullptr;
}

static struct swdev_t* get_swdev_by_itf(uint8_t dev_addr, uint8_t itf_num) {
    for (int i = 0; i < NSWDEVS; i++) {
        if ((swdevs[i].dev_addr == dev_addr) && (swdevs[i].itf_num == itf_num)) {
            return &swdevs[i];
        }
    }
    return nullptr;
}

static struct swdev_t* get_swdev_by_ep(uint8_t dev_addr, uint8_t ep) {
    for (int i = 0; i < NSWDEVS; i++) {
        if ((swdevs[i].dev_addr == dev_addr) &&
            ((swdevs[i].in_ep == ep) || (swdevs[i].out_ep == ep))) {
            return &swdevs[i];
        }
    }
    return nullptr;
}

bool switch_proh_init(void) {
    return true;
}

bool switch_proh_open(uint8_t rhport, uint8_t dev_addr, tusb_desc_interface_t const* desc_itf, uint16_t max_len) {
    // Check if this is a Nintendo Switch Pro Controller
    // The controller uses a vendor-specific class (0xFF) with subclass 0x01 and protocol 0x01
    // But we also check via VID/PID
    
    uint16_t vid, pid;
    tuh_vid_pid_get(dev_addr, &vid, &pid);
    
    printf("Switch Pro: Checking device VID=%04x PID=%04x (class=%02x sub=%02x proto=%02x)\n", 
           vid, pid, desc_itf->bInterfaceClass, desc_itf->bInterfaceSubClass, desc_itf->bInterfaceProtocol);
    
    // Check for Nintendo controllers
    if (vid != VENDOR_ID_NINTENDO) {
        printf("Switch Pro: Not Nintendo VID, skipping\n");
        return false;
    }
    
    // Check for Switch Pro Controller and Joy-Cons
    if (pid != PRODUCT_ID_NINTENDO_SWITCH_PRO_CONTROLLER &&
        pid != PRODUCT_ID_NINTENDO_SWITCH_JOYCON_L &&
        pid != PRODUCT_ID_NINTENDO_SWITCH_JOYCON_R &&
        pid != PRODUCT_ID_NINTENDO_SWITCH_JOYCON_GRIP) {
        printf("Switch Pro: Not Switch controller PID, skipping\n");
        return false;
    }
    
    // We need at least 2 endpoints (in + out)
    if (desc_itf->bNumEndpoints < 2) {
        return false;
    }
    
    if (max_len < sizeof(tusb_desc_interface_t) + desc_itf->bNumEndpoints * sizeof(tusb_desc_endpoint_t)) {
        return false;
    }
    
    struct swdev_t* swdev = allocate_swdev();
    if (swdev == nullptr) {
        return false;
    }
    
    uint8_t in_ep = 0;
    uint16_t in_ep_size = 0;
    uint8_t out_ep = 0;
    uint16_t out_ep_size = 0;
    
    uint8_t const* p_desc = (uint8_t const*) desc_itf;
    
    // Find the endpoints
    for (int i = 0; i < desc_itf->bNumEndpoints; i++) {
        p_desc = tu_desc_next(p_desc);
        
        // Skip non-endpoint descriptors (like HID descriptor which has type 0x21)
        while (tu_desc_type(p_desc) != TUSB_DESC_ENDPOINT) {
            p_desc = tu_desc_next(p_desc);
        }
        
        tusb_desc_endpoint_t const* desc_ep = (tusb_desc_endpoint_t const*) p_desc;
        
        if (!tuh_edpt_open(dev_addr, desc_ep)) {
            return false;
        }
        
        uint8_t ep_addr = desc_ep->bEndpointAddress;
        if (tu_edpt_dir(ep_addr) == TUSB_DIR_IN) {
            in_ep = ep_addr;
            in_ep_size = tu_edpt_packet_size(desc_ep);
        } else {
            out_ep = ep_addr;
            out_ep_size = tu_edpt_packet_size(desc_ep);
        }
    }
    
    if (in_ep == 0 || out_ep == 0) {
        return false;
    }
    
    swdev->dev_addr = dev_addr;
    swdev->itf_num = desc_itf->bInterfaceNumber;
    swdev->in_ep = in_ep;
    swdev->in_ep_size = in_ep_size;
    if (swdev->in_ep_size > sizeof(swdev->buf)) {
        swdev->in_ep_size = sizeof(swdev->buf);
    }
    swdev->out_ep = out_ep;
    swdev->out_ep_size = out_ep_size;
    swdev->vid = vid;
    swdev->pid = pid;
    
    printf("Switch Pro Controller connected: VID=%04x PID=%04x itf=%d in_ep=%02x out_ep=%02x\n", 
           vid, pid, desc_itf->bInterfaceNumber, in_ep, out_ep);
    
    // LED: Purple = Nintendo device detected
    ws2812_led_set(LED_COLOR_DETECTED);
    
    return true;
}

static bool swxfer_in(struct swdev_t* swdev) {
    if (!usbh_edpt_claim(swdev->dev_addr, swdev->in_ep)) {
        return false;
    }
    
    if (!usbh_edpt_xfer(swdev->dev_addr, swdev->in_ep, swdev->buf, swdev->in_ep_size)) {
        usbh_edpt_release(swdev->dev_addr, swdev->in_ep);
        return false;
    }
    
    return true;
}

static bool swxfer_out(struct swdev_t* swdev, uint8_t* buf, uint16_t len) {
    if (!usbh_edpt_claim(swdev->dev_addr, swdev->out_ep)) {
        return false;
    }
    
    if (!usbh_edpt_xfer(swdev->dev_addr, swdev->out_ep, buf, len)) {
        usbh_edpt_release(swdev->dev_addr, swdev->out_ep);
        return false;
    }
    
    return true;
}

static void process_setup(struct swdev_t* swdev) {
    switch (swdev->setup_stage) {
        case 1:
            // Step 1: USB handshake - tells controller we're ready
            printf("Switch Pro: Sending handshake (0x80 0x01)\n");
            ws2812_led_set(LED_COLOR_HANDSHAKE);  // Yellow
            swxfer_out(swdev, usb_handshake, sizeof(usb_handshake));
            break;
        case 2:
            // Step 2: USB enable (baud rate) - some controllers need this
            printf("Switch Pro: Sending USB enable (0x80 0x02)\n");
            ws2812_led_set(LED_COLOR_USB_ENABLE);  // Orange
            swxfer_out(swdev, usb_enable, sizeof(usb_enable));
            break;
        case 3:
            // Step 3: Force HID-only mode - this makes the controller send simple HID reports
            printf("Switch Pro: Sending HID-only mode (0x80 0x04)\n");
            ws2812_led_set(LED_COLOR_HID_MODE);  // Dim Green
            swxfer_out(swdev, usb_hid_only, sizeof(usb_hid_only));
            break;
        case 4: {
            // Setup complete, register the descriptor and start receiving reports
            printf("Switch Pro: Initialization complete, starting input\n");
            ws2812_led_set(LED_COLOR_CONNECTED);  // Green
            swdev->setup_stage = 0;
            swxfer_in(swdev);
            
            uint8_t hub_addr;
            uint8_t hub_port;
            tuh_get_hub_addr_port(swdev->dev_addr, &hub_addr, &hub_port);
            
            descriptor_received_callback(
                swdev->vid,
                swdev->pid,
                switch_pro_descriptor,
                sizeof(switch_pro_descriptor),
                (uint16_t) (swdev->dev_addr << 8) | swdev->itf_num,
                hub_port, swdev->itf_num);
            usbh_driver_set_config_complete(swdev->dev_addr, swdev->itf_num);
            break;
        }
    }
}

bool switch_proh_set_config(uint8_t dev_addr, uint8_t itf_num) {
    struct swdev_t* swdev = get_swdev_by_itf(dev_addr, itf_num);
    if (swdev == nullptr) {
        return false;
    }
    
    // Start setup sequence - same pattern as Xbox driver
    // Send all commands first, then start receiving input
    swdev->setup_stage = 1;
    process_setup(swdev);
    
    return true;
}

bool switch_proh_xfer_cb(uint8_t dev_addr, uint8_t ep_addr, xfer_result_t result, uint32_t xferred_bytes) {
    struct swdev_t* swdev = get_swdev_by_ep(dev_addr, ep_addr);
    if (swdev == nullptr) {
        return false;
    }
    
    if (ep_addr == swdev->in_ep) {
        if (xferred_bytes > 0) {
            // Check the report ID
            uint8_t report_id = swdev->buf[0];
            
            printf("Switch Pro: IN report: 0x%02x (%lu bytes)\n", report_id, (unsigned long)xferred_bytes);
            
            // 0x3F is the simple HID mode report (what we want after 0x80 0x04)
            // 0x30 is the full input report (standard mode)
            // 0x21 is a subcommand reply
            // 0x81 is a USB command reply
            
            if (report_id == 0x3F || report_id == 0x30) {
                // Standard input report - pass it on
                report_received_callback(swdev->dev_addr, swdev->itf_num, swdev->buf, xferred_bytes);
            } else if (report_id == 0x81) {
                // USB command reply - just log it
                uint8_t reply_type = swdev->buf[1];
                printf("Switch Pro: USB reply: 0x%02x\n", reply_type);
            }
        }
        
        // Continue receiving
        swxfer_in(swdev);
    }
    
    // OUT transfer completed - advance to next setup stage
    if (ep_addr == swdev->out_ep) {
        printf("Switch Pro: OUT complete (stage %d)\n", swdev->setup_stage);
        if (swdev->setup_stage != 0) {
            swdev->setup_stage++;
            process_setup(swdev);
        }
    }
    
    return true;
}

void switch_proh_close(uint8_t dev_addr) {
    for (int i = 0; i < NSWDEVS; i++) {
        if (swdevs[i].dev_addr == dev_addr) {
            printf("Switch Pro Controller disconnected\n");
            ws2812_led_set(LED_COLOR_SEARCHING);  // Back to dim blue
            umount_callback(dev_addr, swdevs[i].itf_num);
            swdevs[i] = {};
        }
    }
}

