// TechRemap - languages. The Dutch text in the code is the key; English is looked up here.
// t('Laag {n}', { n: 2 }) -> "Laag 2" / "Layer 2". A missing entry falls back to the Dutch text.

const EN = {
    // shell
    'Geen bordje verbonden': 'No board connected',
    'Demo zonder bordje': 'Demo without a board',
    'Verbind bordje': 'Connect board',
    'Opslaan op bordje': 'Save to board',
    'Opgeslagen': 'Saved',
    'Bezig…': 'Saving…',
    'Donker': 'Dark',
    'Licht': 'Light',
    'Stel je bordje in': 'Set up your board',
    'Sluit het bordje met de USB-kabel aan op deze computer en klik op “Verbind bordje”. Dit werkt in Chrome en Edge.':
        'Plug the board into this computer with the USB cable and click “Connect board”. This works in Chrome and Edge.',
    'Probeer zonder bordje': 'Try without a board',
    'Deze browser kan niet met het bordje praten. Gebruik Chrome of Edge op een computer.':
        'This browser cannot talk to the board. Use Chrome or Edge on a computer.',
    'Knoppen': 'Buttons',
    'Lampjes': 'Lights',
    'Bord inrichten': 'Board setup',
    'Instellingen': 'Settings',
    'Toon': 'Show',
    'Alle lagen': 'All layers',
    'Laag {n}': 'Layer {n}',
    'laag {n}': 'layer {n}',
    'De pc ziet:': 'The PC sees:',
    'Demo: druk op je hardware': 'Demo: press your hardware',
    'Het apparaat dat de pc ziet, met toewijzingen per laag': 'The device the PC sees, with assignments per layer',

    // remap
    'Niet toegewezen': 'Not assigned',
    'Toetsenbord': 'Keyboard',
    'Klik op een toets om te kiezen welke knop of jack hem indrukt.': 'Click a key to choose which button or jack presses it.',
    'Klik op “Wijzig” en beweeg daarna de joystick die dit moet bedienen.': 'Click “Change”, then move the joystick that should drive this.',
    'Klik op “Wijzig” en druk daarna op je knop of jack.': 'Click “Change”, then press your button or jack.',
    'Wijzig': 'Change',
    'Wis': 'Clear',
    'Niets': 'Nothing',
    'Annuleer': 'Cancel',
    'Zelfde als laag 1': 'Same as layer 1',
    'Zelfde als laag 1 ({names})': 'Same as layer 1 ({names})',
    'Niets. {source} doet hier: {what}.': 'Nothing. Here {source} does: {what}.',
    'Niets op deze laag': 'Nothing on this layer',
    'Beweeg nu de joystick…': 'Move the joystick now…',
    'Druk nu op je knop of jack…': 'Press your button or jack now…',
    'Snelheid': 'Speed',
    'Dode zone': 'Dead zone',
    ' en ': ' and ',
    'Ongedaan maken': 'Undo',
    'Druk nu op de knop of jack die de laag moet wisselen.': 'Now press the button or jack that should switch the layer.',
    '{source} ingedrukt. Klik op wat hij moet bedienen op laag {n}.': '{source} pressed. Click what it should drive on layer {n}.',
    '{source} bedient nu {control} op laag {n}.': '{source} now drives {control} on layer {n}.',
    ' Let op: op deze laag bedient {source} ook {others}.': ' Note: on this layer {source} also drives {others}.',
    '{control} doet niets meer op laag {n}.': '{control} no longer does anything on layer {n}.',
    '{control} volgt op laag {n} weer laag 1.': '{control} follows layer 1 again on layer {n}.',
    'een andere functie': 'another function',
    'Hier hoort een joystick bij. Beweeg een joystick, of gebruik de richtingen ← → ↑ ↓ voor losse knoppen.':
        'This needs a joystick. Move a joystick, or use the directions ← → ↑ ↓ for separate buttons.',
    'Hier hoort een knop of jack bij, geen joystick.': 'This needs a button or jack, not a joystick.',
    'Er is geen ruimte meer voor nog een joystick-koppeling. Verwijder eerst een andere, of een expressie in de originele HID Remapper-tool.':
        'There is no room for another joystick link. Remove another one first, or an expression in the original HID Remapper tool.',

    // layer switching
    'Laag wisselen': 'Switching layers',
    'Welke knop of jack schakelt naar een andere laag.': 'Which button or jack switches to another layer.',
    'Nog geen laagknoppen.': 'No layer buttons yet.',
    'Ga naar laag {n}': 'Go to layer {n}',
    '⇧ Laag {n} zolang ingedrukt': '⇧ Layer {n} while held',
    'Laag {n} aan/uit': 'Layer {n} on/off',
    'Verwijder': 'Remove',
    'Let op.': 'Note.',
    'Vanuit laag {n} kun je niet terug naar laag 1. Opnieuw insteken brengt je altijd terug.':
        'From layer {n} there is no way back to layer 1. Plugging the board in again always brings you back.',
    'Op': 'On',
    'ga naar': 'go to',
    'zolang ingedrukt naar': 'while held, to',
    'Kies knop of jack': 'Pick a button or jack',
    'Vanaf laag': 'From layer',
    'Soort': 'Kind',
    'Naar laag': 'To layer',
    'Kies twee verschillende lagen.': 'Pick two different layers.',
    'Laag 1 is de basis; “zolang ingedrukt” werkt alleen naar laag 2, 3 of 4.': 'Layer 1 is the base; “while held” only works towards layer 2, 3 or 4.',
    '{source} gaat naar laag {to} (op laag {from}).': '{source} goes to layer {to} (on layer {from}).',
    '{source} activeert laag {to} zolang ingedrukt (op laag {from}).': '{source} activates layer {to} while held (on layer {from}).',
    'Laagknop verwijderd.': 'Layer button removed.',
    'laag {n} (zolang ingedrukt)': 'layer {n} (while held)',
    'ga naar laag {n}': 'go to layer {n}',

    // lights
    'Dit bordje draait de officiële HID Remapper-firmware. Daarmee kun je knoppen en lagen instellen, maar dit onderdeel zit alleen in de TechRemap-firmware.':
        'This board runs the official HID Remapper firmware. You can set up buttons and layers with it, but this part is only in the TechRemap firmware.',
    'De lamp op het bordje toont in welke laag je zit. Wijzigingen zie je meteen; ze blijven pas bewaard na “Opslaan op bordje”.':
        'The light on the board shows which layer you are on. Changes show right away; they are only kept after “Save to board”.',
    'Kleur laag {n}': 'Colour of layer {n}',
    'Helderheid': 'Brightness',

    // board
    'Jacks en pinnen': 'Jacks and pins',
    'Geef elke pin waar je een jack of schakelaar aan hebt gesoldeerd een naam. Die naam zie je daarna overal in plaats van het pinnummer. Druk op een schakelaar om te zien welke pin het is.':
        'Name every pin you soldered a jack or switch to. That name is then shown everywhere instead of the pin number. Press a switch to see which pin it is.',
    'bijv. Input Jack 1': 'e.g. Input Jack 1',
    'Een schakelaar of jack sluit je aan tussen de pin en GND; meerdere schakelaars mogen dezelfde GND delen.':
        'Wire a switch or jack between the pin and GND; several switches may share the same GND.',
    'LED-strip': 'LED strip',
    'Naam voor GPIO {n}': 'Name for GPIO {n}',
    'LED-strip of -ring': 'LED strip or ring',
    'Een WS2812-strip of -ring die de laagkleur toont. Sluit de datalijn aan op de gekozen pin.':
        'A WS2812 strip or ring that shows the layer colour. Connect its data line to the chosen pin.',
    'Pin': 'Pin',
    'Geen strip': 'No strip',
    'Een andere pin werkt pas nadat je hebt opgeslagen en het bordje opnieuw hebt ingestoken.':
        'A different pin only works after you have saved and plugged the board in again.',
    'Nog niet actief.': 'Not active yet.',
    'Aantal LEDs': 'Number of LEDs',
    'Kleurvolgorde': 'Colour order',
    'GRB (meeste strips)': 'GRB (most strips)',
    'Kloppen de kleuren niet (rood en groen verwisseld)? Kies dan de andere volgorde.': 'Colours wrong (red and green swapped)? Pick the other order.',
    '{count} LEDs op deze helderheid kunnen tot ongeveer {mA} mA trekken. Dat is meer dan een USB-poort veilig levert; verlaag de helderheid of voed de strip apart.':
        '{count} LEDs at this brightness can draw up to about {mA} mA. That is more than a USB port safely supplies; lower the brightness or power the strip separately.',
    'Deze firmware kan geen strip aansturen.': 'This firmware cannot drive a strip.',

    // settings
    'De pc ziet het bordje als': 'The PC sees the board as',
    'Werkt nadat je hebt opgeslagen en het bordje opnieuw hebt ingestoken.': 'Takes effect after you have saved and plugged the board in again.',
    'De toewijzingen die je al had zijn voor het vorige apparaat gemaakt en betekenen hier iets anders.':
        'The assignments you already had were made for the previous device and mean something else here.',
    'Begin met een lege indeling': 'Start with an empty layout',
    'Behoud ze toch': 'Keep them anyway',
    'Niet-toegewezen knoppen': 'Unassigned buttons',
    'gewoon doorgeven aan de pc': 'pass straight through to the PC',
    'Handig als je een gewone controller insteekt en maar een paar knoppen wilt veranderen.': 'Useful when you plug in a normal controller and only want to change a few buttons.',
    'Reservekopie': 'Backup',
    'Bewaar als bestand': 'Save as file',
    'Laad uit bestand': 'Load from file',
    'Voor gevorderden': 'For experts',
    'Open de originele HID Remapper-tool': 'Open the original HID Remapper tool',
    'Macro’s, expressies en quirks stel je voorlopig daar in. Wat je hier instelt blijft daar zichtbaar, en andersom.':
        'Macros, expressions and quirks are set up there for now. What you set here stays visible there, and the other way round.',
    'Firmware': 'Firmware',
    'Demo, geen bordje verbonden': 'Demo, no board connected',
    'TechRemap-firmware op {board}': 'TechRemap firmware on {board}',
    'een onbekend bord': 'an unknown board',
    'Officiële HID Remapper-firmware': 'Official HID Remapper firmware',
    'Taal': 'Language',

    // messages
    'Demo: er is geen bordje om op te slaan.': 'Demo: there is no board to save to.',
    'Opgeslagen op het bordje.': 'Saved to the board.',
    'Opslaan is niet gelukt: {why}': 'Saving failed: {why}',
    'Bestand geladen. Klik op “Opslaan op bordje” om het te bewaren.': 'File loaded. Click “Save to board” to keep it.',
    'Dit bestand kan ik niet lezen: {why}': 'This file cannot be read: {why}',
    'Het bordje is losgekoppeld.': 'The board was disconnected.',

    // inputs
    'Knop {n}': 'Button {n}',
    'Toets {k}': 'Key {k}',
    'Linker stick': 'Left stick',
    'Rechter stick': 'Right stick',
    'Derde stick': 'Third stick',
    'Schuif': 'Slider',
    'Scrollwiel': 'Scroll wheel',
    'Gaspedaal': 'Accelerator',
    'Rempedaal': 'Brake',
    'Expressie {n}': 'Expression {n}',

    // device notes
    'Goed om te weten bij de Xbox Adaptive Controller en Hori Flex': 'Good to know for the Xbox Adaptive Controller and Hori Flex',
    'Een Xbox Adaptive Controller met recente firmware leest per USB-poort twee sticks, het D-pad en 12 knoppen. Met oudere firmware is dat minder; werk de controller bij in de Xbox Accessories-app.':
        'An Xbox Adaptive Controller with recent firmware reads two sticks, the D-pad and 12 buttons per USB port. Older firmware reads less; update the controller in the Xbox Accessories app.',
    'De knopnamen hier kloppen als je het bordje in de linker USB-poort van de Xbox Adaptive Controller steekt. In de rechterpoort zijn sommige knoppen verwisseld.':
        'The button names here are right when the board is in the left USB port of the Xbox Adaptive Controller. In the right port some buttons are swapped.',
    'Analoge trekkers werken op de Xbox Adaptive Controller alleen als aan/uit-knop.': 'On the Xbox Adaptive Controller, analog triggers only work as on/off buttons.',
    'De Hori Flex accepteert via USB alleen een analoge stick, geen knoppen, en één stick per poort.': 'The Hori Flex only accepts an analog stick over USB, no buttons, and one stick per port.',
    'Goed om te weten bij PlayStation': 'Good to know for PlayStation',
    'Op een PS4 werkt dit direct. Op een PS5 werkt het rechtstreeks alleen bij vechtspellen, en dan met een apart authenticatie-apparaat. Via een adapter zoals de Brook Wingman FGC2, Beloader of Besavior werkt het in alle PS5-spellen.':
        'On a PS4 this works directly. On a PS5 it only works directly in fighting games, and then with a separate authentication device. Through an adapter such as the Brook Wingman FGC2, Beloader or Besavior it works in all PS5 games.',
    'Van de touchpad wordt alleen de klik doorgegeven, geen vingerbeweging.': 'Only the click of the touchpad is passed on, not finger movement.',

    // devices and controls
    'Muis + toetsenbord': 'Mouse + keyboard',
    'Muis (absoluut) + toetsenbord': 'Mouse (absolute) + keyboard',
    'Schouder links': 'Left shoulder',
    'Schouder rechts': 'Right shoulder',
    'Midden': 'Centre',
    'Zijknoppen': 'Side buttons',
    'Scrollen': 'Scrolling',
    'Cursor bewegen': 'Moving the cursor',
    'X1-knop': 'X1 button', 'X2-knop': 'X2 button',
    'Linker bumper': 'Left bumper', 'Rechter bumper': 'Right bumper',
    'Knop Y': 'Y button', 'Knop B': 'B button', 'Knop A': 'A button', 'Knop X': 'X button',
    'Driehoek': 'Triangle', 'Rondje': 'Circle', 'Kruisje': 'Cross', 'Vierkant': 'Square',
    'View-knop': 'View button', 'Menu-knop': 'Menu button', 'Share-knop': 'Share button', 'Options-knop': 'Options button',
    'PS-knop': 'PS button', 'Touchpad-klik': 'Touchpad click', 'Min-knop': 'Minus button', 'Plus-knop': 'Plus button',
    'Home-knop': 'Home button', 'Capture-knop': 'Capture button', 'Stadia-knop': 'Stadia button', 'Assistent-knop': 'Assistant button',
    'D-pad omhoog': 'D-pad up', 'D-pad rechts': 'D-pad right', 'D-pad omlaag': 'D-pad down', 'D-pad links': 'D-pad left',
    'Linker stick naar links': 'Left stick left', 'Linker stick naar rechts': 'Left stick right',
    'Linker stick omhoog': 'Left stick up', 'Linker stick omlaag': 'Left stick down', 'Linker stick indrukken': 'Left stick click',
    'Rechter stick naar links': 'Right stick left', 'Rechter stick naar rechts': 'Right stick right',
    'Rechter stick omhoog': 'Right stick up', 'Rechter stick omlaag': 'Right stick down', 'Rechter stick indrukken': 'Right stick click',
    'Cursor met joystick': 'Cursor with joystick', 'Scrollen met joystick': 'Scrolling with joystick',
    'Linkermuisknop': 'Left mouse button', 'Middelste knop (wiel)': 'Middle button (wheel)', 'Rechtermuisknop': 'Right mouse button',
    'Zijknop vooruit': 'Side button forward', 'Zijknop terug': 'Side button back',
    'Scrollen omhoog': 'Scroll up', 'Scrollen omlaag': 'Scroll down', 'Scrollen naar links': 'Scroll left', 'Scrollen naar rechts': 'Scroll right',
    'Cursor naar links': 'Cursor left', 'Cursor naar rechts': 'Cursor right', 'Cursor omhoog': 'Cursor up', 'Cursor omlaag': 'Cursor down',
    'Spatie': 'Space', 'Shift rechts': 'Right Shift', 'Alt rechts': 'Right Alt', 'Ctrl rechts': 'Right Ctrl',
};

export let lang = 'nl';
export function setLang(l) {
    lang = l === 'en' ? 'en' : 'nl';
    document.documentElement.lang = lang;
}
export function t(text, vars) {
    let out = lang === 'en' && EN[text] !== undefined ? EN[text] : text;
    if (vars) for (const k in vars) out = out.split(`{${k}}`).join(vars[k]);
    return out;
}
// "Toets Spatie" and friends are built from a prefix and a key name.
export function tKey(name) {
    if (!name.startsWith('Toets ')) return t(name);
    return t('Toets {k}', { k: t(name.slice(6)) });
}
