# Overdracht: draadloze joystick-brug (Electric Wheelchair System)

Opgesteld vanuit het TechRemap-project, zodat het wheelchair-project hiermee verder kan.
Datum: 2026-11-18. Alles hieronder is **niet op hardware getest**, tenzij het expliciet "getest" heet.

## 1. Waar we zijn aangekomen

Het oorspronkelijke plan (optie A in `hardware-architectuur.md`) was een Pico als software-router met UART naar
een ESP32-C3 en een nRF52840. Dat is aangepast naar een eenvoudiger, volledig draadloze opzet:

```
Rolstoel ─► Dino (Keepongaming, R-Net) ─ USB-kabel ─► ESP32-S3 (zender)
                                                         │
                          ┌──────────────────────────────┴───────────────────────────┐
                          │ GAME-modus: Bluetooth LE, standaard HID-gamepad          │ HOME-modus: wifi
                          ▼                                                          ▼
          nRF52840 met standaard HID Remapper                              Home Assistant
          Bluetooth-firmware (ontvanger)                                   (ESPHome / MQTT)
                          │ USB
                          ▼
              pc / Switch / Xbox Adaptive Controller / console
```

- De rolstoel hoeft **nergens fysiek in** gestoken te worden; alles na de Dino is draadloos.
- GAME en HOME worden **nooit tegelijk** gebruikt. De modus wordt geschakeld, zonder herstart.
- De ontvanger is **de standaard** Bluetooth-firmware van HID Remapper (jfedor2). Daar hoeft niets voor gebouwd te worden.
- **Stap 1 is de firmware voor de ESP32-S3.** Dit is het enige echte ontwikkelwerk.

Harde grens (ongewijzigd): **geen CAN-aftap** (verboden in EU/NL) en niet aan de rij-elektronica komen.
Alles hier zit achter de USB-uitvoer van de Dino.

## 2. Wat vaststaat

### De Dino
Gebruikt de XAC-gamepad van milador ([CircuitPython_XAC_Gamepad](https://github.com/milador/CircuitPython_XAC_Gamepad)).
Gecontroleerd in `boot.py` en `hid_xac_gamepad.py`:

| Onderdeel | Waarde |
|---|---|
| Soort | Generic Desktop, Gamepad (usage page 0x01, usage 0x05) |
| Rapport-ID | **5** (elk invoerrapport begint met dit ID) |
| Knoppen | 8, één bit elk (knop 1 = bit 0) |
| Assen | X en Y, 8 bits, bereik 0–255, **midden 128** |
| Hat-schakelaar | geen |
| Inhoud | 3 bytes: knoppen, X, Y (`'<BBB'`, geen padding) |

Het formaat is klein en vast. De zender hoeft dus **geen willekeurige HID-beschrijving te kunnen lezen**; hij mag
dit ene rapport aannemen. (Een andere joystick vraagt een kleine aanpassing.)

### De ontvanger
Standaard HID Remapper Bluetooth-firmware op een nRF52840 (Seeed Xiao of Adafruit Feather). Uit `BLUETOOTH.md`:
- Alleen **Bluetooth Low Energy**, geen Bluetooth Classic.
- Koppelen: het bronapparaat in koppelmodus, de remapper in koppelmodus (knop of "Pair new device" in de configtool);
  de blauwe led brandt constant in koppelmodus.
- Meerdere apparaten tegelijk kan; alle toewijzingen werken zoals bij elke HID Remapper.
- De zender moet zich dus als **gewoon Bluetooth-HID-apparaat (HID over GATT)** melden. Er is geen eigen protocol.
- Instellen van de toewijzingen: configtool op remapper.org/config (Chrome, WebHID).

### De zender: ESP32-S3
Bord uit de foto: ESP32-S3-WROOM-1 N8R2 (8 MB PSRAM), 44 pins, twee USB-C-poorten, RGB-led.
- Heeft zowel **Bluetooth LE als wifi**, en een **USB-OTG-controller die als host kan werken**.
- Eén poort is meestal voor programmeren/seriële uitvoer (UART/USB-serial-JTAG), de andere is de native USB (OTG).
  **Controleren welke welke is** voordat je bedraad.

## 3. Stap 1: firmware voor de ESP32-S3

Het maakt niet uit in welke taal of omgeving, zolang het werkt. Mijn voorkeur (niet getest):
**ESP-IDF** of **Arduino-ESP32**, omdat USB-host-HID daar het best ondersteund is.
ESPHome heeft een `usb_host`-component voor de S2/S3, maar of er een bruikbare HID-klasse-driver bij zit is **niet
gecontroleerd**. Controleer dit eerst; zo niet, dan ESP-IDF/Arduino.

### Taken, in deze volgorde
Elke stap moet afzonderlijk werken voordat de volgende begint.

1. **Dino lezen via USB-host.** Rapporten van 3 bytes (na ID 5) uitlezen en op de seriële monitor tonen.
   Dit is het riskantste deel; het bewijst dat de S3 de Dino herkent. Test ook hot-plug (insteken/uittrekken).
2. **Bluetooth-gamepad.** Zich melden als HID-over-GATT-gamepad met dezelfde beschrijving als de Dino
   (rapport-ID 5, 8 knoppen, X/Y 0–255) en het rapport **1-op-1 doorsturen**. Koppelen met de nRF-ontvanger en
   controleren in de Monitor-tab van de configtool dat de assen binnenkomen.
3. **Wifi + Home Assistant.** Zie sectie 4.
4. **Modus-schakeling** (GAME / HOME / BOTH). Zie sectie 5.
5. **Instelling door de gebruiker** (wifi, namen). Zie sectie 4.

### Wat nog onbekend is (eerst uitzoeken)
- **Voeding van de Dino via de OTG-poort.** Als USB-host moet de S3 5 V aan de Dino leveren. Op veel
  ontwikkelbordjes levert de OTG-connector **geen** VBUS tenzij er een soldeerbrug/jumper is gezet of het bord via
  de andere poort of de 5V-pin gevoed wordt. Meet dit voordat je de Dino aansluit. De stroomvraag van de Dino is
  niet bekend.
- **Of de S3 de Dino als USB-host herkent.** Low-speed/full-speed en de HID-klasse moeten kloppen. Alleen proberen
  kan dit beantwoorden.
- **Gedrag van wifi en Bluetooth op één radio** (zie sectie 5).
- **De Bluetooth-firmware met de TechRemap-wijzigingen**: niet gebouwd. Niet nodig voor dit plan (de standaard
  firmware volstaat), maar wie de TechRemap-app met de nRF-ontvanger wil gebruiken moet dat eerst controleren.

## 4. Home Assistant: automatisch zichtbaar, en instellen via USB

Het doel: de gebruiker steekt de S3 in een computer, vult wifi en namen in, en Home Assistant ziet het apparaat
zelf. Dit is de route die ik zou volgen; de details zijn niet uitgeprobeerd.

### Automatisch ontdekken
- **ESPHome** (native API) wordt door Home Assistant **automatisch gevonden** via mDNS, mits het apparaat op
  hetzelfde netwerk zit. De gebruiker hoeft alleen "Toevoegen" te kiezen. Geen MQTT-broker nodig.
- **Alternatief: MQTT met "discovery"-berichten.** Home Assistant maakt dan de entiteiten zelf aan; vereist een
  broker. Open beslispunt uit het overzicht: *MQTT of native ESPHome API*. Mijn advies: ESPHome-API, tenzij er al
  een broker is.
- Gebruik een **naam met een deel van het MAC-adres** (in ESPHome: `name_add_mac_suffix`), zodat meerdere
  kits naast elkaar werken.

### Wifi invoeren via USB, zonder programmeren
- **Improv Serial** laat de gebruiker wifi-gegevens invoeren vanuit de browser over de USB-kabel; **ESP Web Tools**
  (flash + wifi-setup op één pagina) doet dat in Chrome/Edge. ESPHome ondersteunt Improv Serial.
- Voor de Amerikaanse tester, die niet kan solderen: een **kant-en-klare kit** met firmware die al op de S3 staat,
  plus een webpagina voor de wifi-instelling. Dat past ook bij "geen scherm".
- Een nette volgorde voor de gebruiker: USB in → webpagina → wifi → Home Assistant meldt "nieuw apparaat".

### Namen van joystick en knoppen
- Entiteiten krijgen hun naam **bij het compileren** (ESPHome). Wie ze anders wil noemen, hernoemt ze **in Home
  Assistant zelf**; dat is gewoon en blijft bewaard.
- Namen **tijdens de installatie via USB** invullen kan alleen met eigen code (namen in het geheugen van het
  apparaat opslaan en bij het opstarten aan Home Assistant doorgeven). Dat is extra werk. Mijn advies: **niet in
  de eerste versie**; begin met vaste namen ("Joystick X", "Joystick Y", "Knop 1" ... "Knop 8") en hernoemen in HA.
- Per as een modus te kiezen in HA (schakelaar / half-vol / schuif), zoals al bedacht: dit zijn
  `select`-entiteiten in ESPHome.

## 5. Modus-schakeling zonder herstart

| Modus | Joystick gaat naar | Radio |
|---|---|---|
| GAME | Bluetooth (nRF-ontvanger) | Bluetooth aan |
| HOME | Home Assistant | wifi aan |
| BOTH | beide | beide aan |

- **Schakelen** met een knop op de S3 (een vrije pin) én via een `select`-entiteit in Home Assistant.
- **Eén radio**: wifi en Bluetooth delen op de S3 dezelfde radio. Tegelijk aan werkt, maar kan jitter of vertraging
  geven. Omdat GAME en HOME nooit tegelijk nodig zijn, kan elke modus één radio uitzetten.
- **Mijn advies**: begin met **beide radio's altijd aan** en laat de modus alleen bepalen waar de data heen gaat.
  Meet de vertraging. Pas als dat merkbaar is, schakel per modus een radio uit. Een radio uitzetten kost bij het
  terugschakelen enkele seconden (opnieuw verbinden); dat is het nadeel.
- **Welke modus bij opstarten?** Open beslispunt. Veiligste keuze lijkt mij HOME (er gaat niets naar een
  console), maar dat moet de gebruiker bepalen. Laatste modus onthouden in het geheugen van het apparaat is ook een optie.
- Latentie-eis is niet vastgesteld. Stel een doel vast (bijvoorbeeld "voelt niet trager dan bedraad") en meet.

## 6. Boards en voorraad

- **ESP32-S3 (deze overdracht)**: zender en wifi-brug in één bord.
- **nRF52840 (Xiao of Feather)**: ontvanger, standaard HID Remapper Bluetooth-firmware.
- **LILYGO T-PicoC3 (RP2040 + ESP32-C3)**: eerder het voorkeursbord. Met de S3-opzet niet meer nodig; wel
  eventueel te gebruiken als de Bluetooth-zender in een kleinere versie. Niet verder uitgewerkt.
- **Xbox Adaptive Controller**: alleen nodig om met dezelfde joystick **op een Xbox** te gamen. Voor Home Assistant
  en voor pc/Switch niet. Een PS5 of Xbox rechtstreeks op de ontvanger werkt niet; dat gaat via een
  adapter of de XAC.
- Advies uit het overzicht (maximaal één à twee boards) blijft staan: S3 + nRF52840.

## 7. TechRemap en wat daar al bestaat

Repository: `MrMennens-tech/hid-remapper-joystick`, branch `claude/simplify-hid-ui-yNeiI`. Site: remap.mennens.tech.
Gebouwd op **HID Remapper van Jacek Fedoryński (jfedor2)**, MIT-licentie. Voor dit project bruikbaar:
- De **app** (techremap/) voor toewijzingen, lagen en een Test-tab, in Nederlands en Engels.
- Firmware voor **RP2040/RP2350** (Waveshare-borden, Pico, eigen borden van jfedor2). Die draait **niet** op een
  ESP32-S3. Voor dit plan is hij niet nodig.
- De **web-flashpagina met uitleg** (firmwarebestanden op remap.mennens.tech/firmware/) is een voorbeeld voor de kit.
- Verschil met dit plan: TechRemap-firmware zet zich als gamepad naar een computer; hier moet de S3 juist een
  Bluetooth-gamepad **zijn**.

## 8. Credits, aansprakelijkheid, afspraken

- Noem in elk publiek of commercieel product: **jfedor2 (HID Remapper)**, **milador (XAC Gamepad)**,
  TechRemap by Mennens.Tech, en de Dino/Keepongaming.nl. De Amerikaanse tester wil zelf ook credits.
- Open uit het overzicht, voor **elke betaalde levering**: verzending, aansprakelijkheid, credits.
- Een hulpmiddel dat bij een rolstoel hoort is gevoelig. Zeg erbij dat dit **geen vervanging** is voor de
  originele bediening en dat het niet aan de rij-elektronica zit.

## 9. Open punten (samengevat)

1. Programmeeromgeving voor de S3 (ESP-IDF, Arduino, ESPHome met externe component): kiezen na controle van USB-host-HID.
2. VBUS/voeding van de Dino via de OTG-poort van het S3-bord.
3. Welke van de twee USB-C-poorten is native USB.
4. ESPHome-API of MQTT.
5. Opstartmodus en een latentie-doel.
6. Namen invoeren via USB: nu of later (advies: later).
7. Kit voor de Amerikaanse tester: wat is er precies kant-en-klaar, en wie levert het.
8. Waar de Dino-/joystickcode staat (open uit het oorspronkelijke overzicht).

## 10. Nuttige bronnen

- [milador/CircuitPython_XAC_Gamepad](https://github.com/milador/CircuitPython_XAC_Gamepad)
- [HID Remapper (jfedor2)](https://github.com/jfedor2/hid-remapper), [handleiding](https://www.remapper.org/manual/), `BLUETOOTH.md` in de repo
- [controllercustom/dinput_tinyusb](https://awesome.ecosyste.ms/projects/github.com%2Fcontrollercustom%2Fdinput_tinyusb): voorbeeld van een XAC-gamepadbeschrijving
- [ESP Web Tools](https://esphome.github.io/esp-web-tools/) en Improv Serial voor flashen en wifi via de browser
