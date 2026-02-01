#include <tusb.h>

#include "pio_usb.h"
#include "usb_midi_host.h"

#include "pico/platform.h"
#include "pico/time.h"

#include "constants.h"
#include "descriptor_parser.h"
#include "out_report.h"
#include "remapper.h"
#include "switch_pro.h"
#include "tick.h"
#include "ws2812_led.h"

static bool __no_inline_not_in_flash_func(manual_sof)(repeating_timer_t* rt) {
    pio_usb_host_frame();
    set_tick_pending();
    return true;
}

static repeating_timer_t sof_timer;

void extra_init() {
    pio_usb_configuration_t pio_cfg = PIO_USB_DEFAULT_CONFIG;
    pio_cfg.pin_dp = PICO_DEFAULT_PIO_USB_DP_PIN;
    pio_cfg.skip_alarm_pool = true;
    printf("USB Host: Configuring PIO USB on pin %d\n", PICO_DEFAULT_PIO_USB_DP_PIN);
    tuh_configure(BOARD_TUH_RHPORT, TUH_CFGID_RPI_PIO_USB_CONFIGURATION, &pio_cfg);
    add_repeating_timer_us(-1000, manual_sof, NULL, &sof_timer);
    printf("USB Host: Ready and waiting for devices\n");
}

uint32_t get_gpio_valid_pins_mask() {
    return GPIO_VALID_PINS_BASE & ~(
#ifdef PICO_DEFAULT_UART_TX_PIN
                                      (1 << PICO_DEFAULT_UART_TX_PIN) |
#endif
#ifdef PICO_DEFAULT_UART_RX_PIN
                                      (1 << PICO_DEFAULT_UART_RX_PIN) |
#endif
                                      (1 << PICO_DEFAULT_PIO_USB_DP_PIN) |
                                      (1 << (PICO_DEFAULT_PIO_USB_DP_PIN + 1)));
}

static bool reports_received;

void read_report(bool* new_report, bool* tick) {
    *tick = get_and_clear_tick_pending();

    reports_received = false;
    tuh_task();
    *new_report = reports_received;
}

void interval_override_updated() {
}

void flash_b_side() {
}

void descriptor_received_callback(uint16_t vendor_id, uint16_t product_id, const uint8_t* report_descriptor, int len, uint16_t interface, uint8_t hub_port, uint8_t itf_num) {
    parse_descriptor(vendor_id, product_id, report_descriptor, len, interface, itf_num);

    device_connected_callback(interface, vendor_id, product_id, hub_port);
}

// Called when ANY USB device is mounted (before class drivers)
void tuh_mount_cb(uint8_t dev_addr) {
    uint16_t vid, pid;
    tuh_vid_pid_get(dev_addr, &vid, &pid);
    printf(">>> USB Device mounted: dev_addr=%d VID=%04x PID=%04x <<<\n", dev_addr, vid, pid);
    
    // Flash WHITE to show USB device was detected
    ws2812_led_set(0x00404040);  // White
    sleep_ms(300);
    
    // Show VID via LED color for debugging:
    // Nintendo (0x057e) = PURPLE
    // Microsoft (0x045e) = CYAN  
    // Other = YELLOW
    if (vid == VENDOR_ID_NINTENDO) {  // 0x057e
        printf(">>> Nintendo VID (0x057e) detected! <<<\n");
        ws2812_led_set(LED_COLOR_DETECTED);  // Purple
    } else if (vid == VENDOR_ID_MICROSOFT) {  // 0x045e
        printf(">>> Microsoft VID (0x045e) detected! <<<\n");
        ws2812_led_set(0x00004040);  // Cyan
    } else {
        printf(">>> Unknown VID: 0x%04x <<<\n", vid);
        ws2812_led_set(0x00404000);  // Yellow = unknown VID
    }
}

// Called when ANY USB device is unmounted
void tuh_umount_cb(uint8_t dev_addr) {
    printf(">>> USB Device unmounted: dev_addr=%d <<<\n", dev_addr);
}

static int hid_device_count = 0;
static bool controller_connected_led_done = false;

void tuh_hid_mount_cb(uint8_t dev_addr, uint8_t instance, uint8_t const* desc_report, uint16_t desc_len) {
    hid_device_count++;
    printf("tuh_hid_mount_cb: dev=%d inst=%d\n", dev_addr, instance);

    uint8_t hub_addr;
    uint8_t hub_port;
    tuh_get_hub_addr_port(dev_addr, &hub_addr, &hub_port);

    uint16_t vid;
    uint16_t pid;
    tuh_vid_pid_get(dev_addr, &vid, &pid);

    tuh_itf_info_t itf_info;
    tuh_hid_itf_get_info(dev_addr, instance, &itf_info);
    uint8_t itf_num = itf_info.desc.bInterfaceNumber;

    printf("HID mount: VID=%04x PID=%04x dev=%d inst=%d\n", vid, pid, dev_addr, instance);

    descriptor_received_callback(vid, pid, desc_report, desc_len, (uint16_t) (dev_addr << 8) | instance, hub_port, itf_num);
    
    // Start receiving reports FIRST
    tuh_hid_receive_report(dev_addr, instance);

    // Check if this is a Nintendo Switch controller - needs special initialization
    // We do this AFTER tuh_hid_receive_report so the HID driver is ready
    if (switch_pro_is_nintendo_controller(vid, pid)) {
        printf(">>> Nintendo Switch controller detected! VID=%04x PID=%04x <<<\n", vid, pid);
        switch_pro_init_controller(dev_addr, instance);
        // Start the init sequence NOW - Switch Pro won't send reports until initialized
        switch_pro_start_init(dev_addr, instance);
    }
}

// NOTE: tuh_hid_set_report_complete_cb is defined in out_report.cc
// It calls switch_pro_set_report_complete() for Switch Pro init

void umount_callback(uint8_t dev_addr, uint8_t instance) {
    device_disconnected_callback(dev_addr);
}

void tuh_hid_umount_cb(uint8_t dev_addr, uint8_t instance) {
    printf("tuh_hid_umount_cb\n");
    switch_pro_unmount(dev_addr, instance);
    umount_callback(dev_addr, instance);
    hid_device_count--;
    if (hid_device_count <= 0) {
        hid_device_count = 0;
        controller_connected_led_done = false;
        if (ws2812_led_available()) {
            ws2812_led_set(LED_COLOR_SEARCHING);
        }
    }
}

void report_received_callback(uint8_t dev_addr, uint8_t instance, uint8_t const* report, uint16_t len) {
    if (len > 0) {
        handle_received_report(report, len, (uint16_t) (dev_addr << 8) | instance);

        reports_received = true;

        // Boot sequence: set LED to "controller connected" on first usable report
        if (ws2812_led_available() && !controller_connected_led_done) {
            controller_connected_led_done = true;
            ws2812_led_set(LED_COLOR_CONTROLLER_CONNECTED);
        }
    }
}

void tuh_hid_report_received_cb(uint8_t dev_addr, uint8_t instance, uint8_t const* report, uint16_t len) {
    // Check if this is a Switch Pro Controller setup reply
    if (switch_pro_process_report(dev_addr, instance, report, len)) {
        // It was a setup reply, continue receiving
        tuh_hid_receive_report(dev_addr, instance);
        return;
    }

    report_received_callback(dev_addr, instance, report, len);

    tuh_hid_receive_report(dev_addr, instance);
}

void tuh_midi_rx_cb(uint8_t dev_addr, uint32_t num_packets) {
    uint8_t hub_addr;
    uint8_t hub_port;
    tuh_get_hub_addr_port(dev_addr, &hub_addr, &hub_port);

    uint8_t buf[4];
    while (tuh_midi_packet_read(dev_addr, buf)) {
        handle_received_midi(hub_port, buf);
    }
    reports_received = true;
}

void queue_out_report(uint16_t interface, uint8_t report_id, const uint8_t* buffer, uint8_t len) {
    do_queue_out_report(buffer, len, report_id, interface >> 8, interface & 0xFF, OutType::OUTPUT);
}

void queue_set_feature_report(uint16_t interface, uint8_t report_id, const uint8_t* buffer, uint8_t len) {
    do_queue_out_report(buffer, len, report_id, interface >> 8, interface & 0xFF, OutType::SET_FEATURE);
}

void queue_get_feature_report(uint16_t interface, uint8_t report_id, uint8_t len) {
    do_queue_get_report(report_id, interface >> 8, interface & 0xFF, len);
}

void send_out_report() {
    do_send_out_report();
}

void __no_inline_not_in_flash_func(sof_callback)() {
}

void get_report_cb(uint8_t dev_addr, uint8_t interface, uint8_t report_id, uint8_t report_type, uint8_t* report, uint16_t len) {
    handle_get_report_response((uint16_t) (dev_addr << 8) | interface, report_id, report, len);
}

void set_report_complete_cb(uint8_t dev_addr, uint8_t interface, uint8_t report_id) {
    handle_set_report_complete((uint16_t) (dev_addr << 8) | interface, report_id);
}
