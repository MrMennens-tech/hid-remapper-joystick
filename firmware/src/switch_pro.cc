#include "switch_pro.h"
#include "constants.h"
#include "remapper.h"
#include "ws2812_led.h"

#include <cstring>
#include <tusb.h>

// Nintendo Switch Pro Controller USB initialization
// The controller requires a handshake before it starts sending input reports.
// This is based on reverse engineering from various sources including:
// - Linux hid-nintendo driver
// - dekuNukem's Nintendo_Switch_Reverse_Engineering
// - HandheldLegend documentation

// USB commands for Switch Pro Controller
// These are sent via SET_REPORT to initialize the controller

// Command for USB handshake
static uint8_t usb_handshake[] = { 0x80, 0x01 };

// Command to enable USB mode (baud rate change command)
static uint8_t usb_enable[] = { 0x80, 0x02 };

// Command to force USB HID mode (required for input reports)
static uint8_t usb_hid_only[] = { 0x80, 0x04 };

// The Switch Pro Controller sends input reports in a specific format.
// Report ID 0x30 is the standard full input report (buttons, sticks, IMU)
// Report ID 0x21 is the reply to subcommands
// Report ID 0x3F is the simple HID mode report
// Report ID 0x81 is a USB command reply

#define MAX_SWITCH_DEVICES 4

struct switch_hid_dev_t {
    uint8_t dev_addr;
    uint8_t instance;
    uint8_t setup_stage;  // 0 = not initialized, 1-3 = sending commands, 4 = ready
    bool active;
};

static switch_hid_dev_t switch_hid_devs[MAX_SWITCH_DEVICES];

static switch_hid_dev_t* find_switch_hid_dev(uint8_t dev_addr, uint8_t instance) {
    for (int i = 0; i < MAX_SWITCH_DEVICES; i++) {
        if (switch_hid_devs[i].active &&
            switch_hid_devs[i].dev_addr == dev_addr &&
            switch_hid_devs[i].instance == instance) {
            return &switch_hid_devs[i];
        }
    }
    return nullptr;
}

static switch_hid_dev_t* allocate_switch_hid_dev(uint8_t dev_addr, uint8_t instance) {
    for (int i = 0; i < MAX_SWITCH_DEVICES; i++) {
        if (!switch_hid_devs[i].active) {
            switch_hid_devs[i].dev_addr = dev_addr;
            switch_hid_devs[i].instance = instance;
            switch_hid_devs[i].setup_stage = 0;
            switch_hid_devs[i].active = true;
            return &switch_hid_devs[i];
        }
    }
    return nullptr;
}

bool switch_pro_is_nintendo_controller(uint16_t vid, uint16_t pid) {
    if (vid != VENDOR_ID_NINTENDO) {
        return false;
    }
    
    return (pid == PRODUCT_ID_NINTENDO_SWITCH_PRO_CONTROLLER ||
            pid == PRODUCT_ID_NINTENDO_SWITCH_JOYCON_L ||
            pid == PRODUCT_ID_NINTENDO_SWITCH_JOYCON_R ||
            pid == PRODUCT_ID_NINTENDO_SWITCH_JOYCON_GRIP);
}

static bool send_setup_report(switch_hid_dev_t* dev, uint8_t* data, size_t len) {
    bool result = tuh_hid_set_report(dev->dev_addr, dev->instance, 0, HID_REPORT_TYPE_OUTPUT, data, len);
    if (!result) {
        printf("Switch Pro [%d:%d]: tuh_hid_set_report FAILED!\n", dev->dev_addr, dev->instance);
        ws2812_led_set(LED_COLOR_ERROR);  // Red = error
    }
    return result;
}

static void send_next_setup_command(switch_hid_dev_t* dev) {
    switch (dev->setup_stage) {
        case 1:
            // Step 1: USB handshake - tells controller we're ready
            printf("Switch Pro [%d:%d]: Sending handshake (0x80 0x01)\n", dev->dev_addr, dev->instance);
            ws2812_led_set(LED_COLOR_HANDSHAKE);  // Yellow
            send_setup_report(dev, usb_handshake, sizeof(usb_handshake));
            break;
        case 2:
            // Step 2: USB enable (baud rate) - some controllers need this
            printf("Switch Pro [%d:%d]: Sending USB enable (0x80 0x02)\n", dev->dev_addr, dev->instance);
            ws2812_led_set(LED_COLOR_USB_ENABLE);  // Orange
            send_setup_report(dev, usb_enable, sizeof(usb_enable));
            break;
        case 3:
            // Step 3: Force HID-only mode - this makes the controller send simple HID reports
            printf("Switch Pro [%d:%d]: Sending HID-only mode (0x80 0x04)\n", dev->dev_addr, dev->instance);
            ws2812_led_set(LED_COLOR_HID_MODE);  // Dim Green
            send_setup_report(dev, usb_hid_only, sizeof(usb_hid_only));
            break;
        case 4:
            // Setup complete!
            printf("Switch Pro [%d:%d]: Initialization complete!\n", dev->dev_addr, dev->instance);
            ws2812_led_set(LED_COLOR_CONNECTED);  // Green
            break;
        default:
            break;
    }
}

// Called when a SET_REPORT completes - advance to next setup stage
void switch_pro_set_report_complete(uint8_t dev_addr, uint8_t instance, uint8_t report_id) {
    switch_hid_dev_t* dev = find_switch_hid_dev(dev_addr, instance);
    if (dev == nullptr) {
        return;
    }
    
    printf("Switch Pro [%d:%d]: SET_REPORT complete (stage %d)\n", dev_addr, instance, dev->setup_stage);
    
    // Advance to next stage
    if (dev->setup_stage > 0 && dev->setup_stage < 4) {
        dev->setup_stage++;
        send_next_setup_command(dev);
    }
}

// Flag to delay init until after HID driver is ready
static switch_hid_dev_t* pending_init_dev = nullptr;

bool switch_pro_init_controller(uint8_t dev_addr, uint8_t instance) {
    // Check if already tracked
    switch_hid_dev_t* dev = find_switch_hid_dev(dev_addr, instance);
    if (dev != nullptr) {
        printf("Switch Pro [%d:%d]: Already tracked\n", dev_addr, instance);
        return true;
    }
    
    // Allocate new device
    dev = allocate_switch_hid_dev(dev_addr, instance);
    if (dev == nullptr) {
        printf("Switch Pro: No free device slots!\n");
        return false;
    }
    
    printf("Switch Pro [%d:%d]: Detected, will init after HID driver ready\n", dev_addr, instance);
    ws2812_led_set(LED_COLOR_DETECTED);  // Purple = detected
    
    // Don't start immediately - wait for HID driver to be fully ready
    // The init will be triggered by the first received report or a timeout
    dev->setup_stage = 0;  // Not started yet
    pending_init_dev = dev;
    
    return true;
}

// Call this to actually start the init sequence (after HID driver is ready)
void switch_pro_start_init(uint8_t dev_addr, uint8_t instance) {
    switch_hid_dev_t* dev = find_switch_hid_dev(dev_addr, instance);
    if (dev == nullptr || dev->setup_stage != 0) {
        return;  // Not found or already started
    }
    
    printf("Switch Pro [%d:%d]: Starting initialization sequence NOW\n", dev->dev_addr, dev->instance);
    dev->setup_stage = 1;
    send_next_setup_command(dev);
    pending_init_dev = nullptr;
}

// Check if there's a pending init that needs to be started
void switch_pro_check_pending_init(void) {
    if (pending_init_dev != nullptr && pending_init_dev->setup_stage == 0) {
        printf("Switch Pro: Starting pending init\n");
        pending_init_dev->setup_stage = 1;
        send_next_setup_command(pending_init_dev);
        pending_init_dev = nullptr;
    }
}

bool switch_pro_process_report(uint8_t dev_addr, uint8_t instance, uint8_t const* report, uint16_t len) {
    switch_hid_dev_t* dev = find_switch_hid_dev(dev_addr, instance);
    if (dev == nullptr) {
        return false;  // Not a Switch Pro Controller we're tracking
    }
    
    if (len == 0) {
        return false;
    }
    
    uint8_t report_id = report[0];
    
    printf("Switch Pro [%d:%d]: Received report 0x%02x (%d bytes), stage=%d\n", 
           dev_addr, instance, report_id, len, dev->setup_stage);
    
    // Handle USB command replies (0x81)
    if (report_id == 0x81) {
        if (len >= 2) {
            uint8_t reply_type = report[1];
            printf("Switch Pro [%d:%d]: USB reply type 0x%02x\n", dev_addr, instance, reply_type);
        }
        // USB command replies are handled, don't pass to normal processing
        return true;
    }
    
    // Input reports (0x3F = simple, 0x30 = full)
    if (report_id == 0x3F || report_id == 0x30) {
        // This is actual input data - flash LED
        static uint8_t led_counter = 0;
        if ((led_counter++ & 0x0F) == 0) {
            ws2812_led_set(LED_COLOR_INPUT);  // Blue flash
        } else {
            ws2812_led_set(LED_COLOR_CONNECTED);  // Green
        }
        return false;  // Let normal processing handle this
    }
    
    // Other reports during setup phase - don't pass through yet
    if (dev->setup_stage > 0 && dev->setup_stage < 4) {
        return true;  // Still setting up, eat this report
    }
    
    return false;  // Unknown report, let normal processing try
}

bool switch_pro_is_ready(uint8_t dev_addr, uint8_t instance) {
    switch_hid_dev_t* dev = find_switch_hid_dev(dev_addr, instance);
    if (dev == nullptr) {
        return true;  // Not a Switch controller, consider ready
    }
    return dev->setup_stage >= 4;
}

void switch_pro_unmount(uint8_t dev_addr, uint8_t instance) {
    switch_hid_dev_t* dev = find_switch_hid_dev(dev_addr, instance);
    if (dev != nullptr) {
        printf("Switch Pro [%d:%d]: Disconnected\n", dev_addr, instance);
        ws2812_led_set(LED_COLOR_SEARCHING);  // Back to dim blue
        dev->active = false;
    }
}

// ============================================================================
// Custom driver functions (for vendor-specific interface - may not be used)
// ============================================================================

#define NSWDEVS 8

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
    // This is called for interfaces that aren't claimed by other drivers
    // The Switch Pro Controller usually has a HID interface that gets claimed by the HID driver
    // So this function may never be called for Switch controllers
    
    uint16_t vid, pid;
    tuh_vid_pid_get(dev_addr, &vid, &pid);
    
    printf("Switch Pro custom driver: Checking device VID=%04x PID=%04x (class=%02x)\n", 
           vid, pid, desc_itf->bInterfaceClass);
    
    if (!switch_pro_is_nintendo_controller(vid, pid)) {
        return false;
    }
    
    // If we get here, this is a Nintendo controller with a non-HID interface
    // (which is unusual - they usually only have HID interfaces)
    printf("Switch Pro custom driver: Nintendo device with class=%02x - not claiming\n", 
           desc_itf->bInterfaceClass);
    
    return false;
}

bool switch_proh_set_config(uint8_t dev_addr, uint8_t itf_num) {
    return false;
}

bool switch_proh_xfer_cb(uint8_t dev_addr, uint8_t ep_addr, xfer_result_t result, uint32_t xferred_bytes) {
    return false;
}

void switch_proh_close(uint8_t dev_addr) {
    for (int i = 0; i < NSWDEVS; i++) {
        if (swdevs[i].dev_addr == dev_addr) {
            printf("Switch Pro custom driver: Device disconnected\n");
            umount_callback(dev_addr, swdevs[i].itf_num);
            swdevs[i] = {};
        }
    }
}
