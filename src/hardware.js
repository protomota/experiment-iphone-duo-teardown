// The small pieces: every screw Apple's repair manual names and every chip iFixit's chip ID names.
// No three.js, no DOM. Part numbers, torques, chip names and counts are published. x, z and the outlines are LAYOUT, read
// by eye off Apple's screw location diagrams and iFixit's board photos: nothing here is ever shown as a measurement.

// ------------------------------------------------------------ screws, in the order they come out
export const HEADS = {
  crosshead: 'Crosshead',
  pentalobe: 'Pentalobe PL1.1',
  super: 'Super screw',
  torx: 'Torx Plus 3IP',
  trilobe: 'Trilobe',
};

const UP = [0, 1, 0];
const OUT_END = [0, 0, 1];
const OUT_TOP = [0, 0, -1];
const screw = (id, part, head, torque, x, z, host, y, dir = UP) => ({id, kind: 'screw', part, head, torque, x, y, z, host, dir});

const COWL = -0.82;
const BOARD = -1.5;
const IO = -1.8;

export const SCREWS = [
  // the panels, on the rail beside the USB-C port: two for each panel, one each side of the port when the phone is closed
  screw('P1', '923-16065 or 923-16067', 'pentalobe', '0.55 kgf cm', -33.6, 58.75, 'backGlass', -2.6, OUT_END),
  screw('P2', '923-16065 or 923-16067', 'pentalobe', '0.55 kgf cm', -47.6, 58.75, 'backGlass', -2.6, OUT_END),
  screw('P3', '923-16064 or 923-16066', 'pentalobe', '0.55 kgf cm', 33.6, 58.75, 'outerDisplay', -2.6, OUT_END),
  screw('P4', '923-16064 or 923-16066', 'pentalobe', '0.55 kgf cm', 47.6, 58.75, 'outerDisplay', -2.6, OUT_END),
  // cowlings
  screw('A1', '923-13683', 'trilobe', '0.45 kgf cm', -14.1, -24.4, 'batteryCowling', COWL),
  screw('A2', '923-13683', 'trilobe', '0.45 kgf cm', -27.2, 9.5, 'batteryCowling', COWL),
  screw('E2', '923-16052', 'trilobe', '0.55 kgf cm', -37, -40.6, 'boardCowling', COWL),
  screw('E1', '923-16051', 'trilobe', '0.45 kgf cm', -28.9, -34.7, 'boardCowling', COWL),
  screw('D6', '923-16045', 'trilobe', '0.45 kgf cm', -37.6, -19.9, 'boardCowling', COWL),
  screw('E3', '923-16049', 'trilobe', '0.55 kgf cm', -41.3, -53.7, 'faceTimeCowling', COWL),
  screw('E4', '923-16049', 'trilobe', '0.55 kgf cm', -9.4, -50.6, 'faceTimeCowling', COWL),
  screw('K1', '923-13683', 'trilobe', '0.45 kgf cm', 47.6, 46.8, 'ioCowling', COWL),
  screw('K2', '923-16061', 'trilobe', '0.45 kgf cm', 64.6, 41.6, 'ioCowling', COWL),
  screw('K3', '923-16061', 'trilobe', '0.45 kgf cm', 71.1, 53.4, 'ioCowling', COWL),
  screw('K4', '923-16061', 'trilobe', '0.45 kgf cm', 41.1, 38.9, 'ioCowling', COWL),
  screw('K5', '923-16061', 'trilobe', '0.45 kgf cm', 14.6, 44.4, 'ioCowling', COWL),
  screw('K6', '923-16061', 'trilobe', '0.45 kgf cm', 14.3, 54.4, 'ioCowling', COWL),
  screw('J6', '923-16041', 'crosshead', '0.65 kgf cm', 63.6, -49.2, 'alsCowling', COWL),
  // speakers, antenna, Taptic Engine, microphone
  screw('A6', '923-16053', 'crosshead', '0.85 kgf cm', -72.9, 44.1, 'bottomSpeaker', -1),
  screw('A3', '923-16054', 'crosshead', '0.85 kgf cm', -69.5, 56.5, 'bottomSpeaker', -1),
  screw('A4', '923-16048', 'crosshead', '11.5 Ncm', -39.6, 44.1, 'bottomSpeaker', -1),
  screw('A5', '923-16048', 'crosshead', '11.5 Ncm', -35.6, 54.4, 'bottomSpeaker', -1),
  screw('B5', '923-16026', 'trilobe', '0.45 kgf cm', -6.4, 19, 'lowerAntenna', -0.84),
  screw('B2', '923-16051', 'trilobe', '0.45 kgf cm', -6.4, 37.1, 'lowerAntenna', -0.84),
  screw('B3', '923-16051', 'trilobe', '0.45 kgf cm', -27.6, 54.8, 'lowerAntenna', -0.84),
  screw('B1', '923-16038', 'crosshead', '0.55 kgf cm', -33, 55.5, 'taptic', -1),
  screw('B4', '923-16059', 'crosshead', '11.5 Ncm', -13.8, 54.1, 'taptic', -1),
  screw('B6', '923-16050', 'super', '0.65 kgf cm', -27.6, 54.8, 'mainMic', -1.4),
  screw('L1', '923-16035', 'crosshead', '0.85 kgf cm', 13.6, -45.1, 'topSpeaker', -1),
  screw('L2', '923-16035', 'crosshead', '0.85 kgf cm', 31.3, -54, 'topSpeaker', -1),
  screw('L3', '923-16035', 'crosshead', '0.85 kgf cm', 52.7, -47.5, 'topSpeaker', -1),
  screw('F5', '923-16055', 'torx', '0.65 kgf cm', 34, 51, 'usbC', -1.2),
  screw('F6', '923-16055', 'torx', '0.65 kgf cm', 47.2, 51, 'usbC', -1.2),
  // cameras
  screw('D1', '923-16046', 'crosshead', '0.55 kgf cm', -76.9, -36.5, 'cameraSpacer', -1.1),
  screw('C6', '923-16042', 'crosshead', '0.55 kgf cm', -70.2, -30.2, 'cameraSpacer', -1.1),
  screw('C5', '923-16063', 'crosshead', '0.55 kgf cm', -66.2, -30.2, 'cameraSpacer', -1.1),
  screw('D3', '923-16031', 'crosshead', '0.55 kgf cm', -58.8, -34.4, 'cameraSpacer', -1.1),
  screw('D2', '923-16060', 'crosshead', '14.5 Ncm', -76.9, -51.6, 'rearCamera', -1.8),
  screw('F1', '923-16036', 'super', '14.5 Ncm', -58.8, -34.4, 'rearCamera', -1.8),
  screw('F2', '923-16033', 'super', '14.5 Ncm', -37, -40.6, 'rearCamera', -1.3),
  screw('E5', '923-16037', 'crosshead', '0.55 kgf cm', 71.1, -55.4, 'outerFront', -0.8),
  screw('E6', '923-16039', 'crosshead', '0.55 kgf cm', 78.9, -50.3, 'outerFront', -0.8),
  // boards
  screw('G6', '923-16026', 'trilobe', '0.45 kgf cm', -6.4, 8.1, 'upperAntenna', -1.1),
  screw('G4', '923-16030', 'crosshead', '0.55 kgf cm', -22.5, -55.8, 'upperAntenna', -1.1),
  screw('G5', '923-16025', 'crosshead', '0.55 kgf cm', -14.1, -53.7, 'upperAntenna', -1.1),
  screw('G1', '923-16040', 'super', '0.75 kgf cm', -21.5, -49.6, 'logicBoard', BOARD),
  screw('G3', '923-16044', 'super', '0.75 kgf cm', -14.1, -24.4, 'logicBoard', BOARD),
  screw('G2', '923-16044', 'super', '0.75 kgf cm', -27.2, 9.5, 'logicBoard', BOARD),
  screw('M5', '923-16043', 'trilobe', '0.45 kgf cm', 21.8, 56.5, 'ioBoard', IO),
  screw('M6', '923-16043', 'trilobe', '0.45 kgf cm', 59.2, 56.5, 'ioBoard', IO),
  screw('L5', '923-16058', 'crosshead', '0.55 kgf cm', 31.6, 53.4, 'ioBoard', IO),
  screw('L6', '923-16058', 'crosshead', '0.55 kgf cm', 51.3, 53.4, 'ioBoard', IO),
  screw('M3', '923-16057', 'super', '0.65 kgf cm', 41.1, 38.9, 'ioBoard', IO),
  screw('M1', '923-16057', 'super', '0.65 kgf cm', 14.6, 44.4, 'ioBoard', IO),
  screw('M2', '923-16057', 'super', '0.65 kgf cm', 14.3, 54.4, 'ioBoard', IO),
  screw('M4', '923-16062', 'super', '0.65 kgf cm', 64.6, 41.6, 'ioBoard', IO),
  screw('L4', '923-16056', 'super', '0.65 kgf cm', 71.1, 53.4, 'ioBoard', IO),
  // the buttons, last out of the shell
  screw('H1', '923-16029', 'crosshead', '0.55 kgf cm', -33.6, -56.6, 'volumeButtons', -2.5, OUT_TOP),
  screw('H2', '923-16029', 'crosshead', '0.55 kgf cm', -50, -56.6, 'volumeButtons', -2.5, OUT_TOP),
  screw('H3', '923-16029', 'crosshead', '0.55 kgf cm', -60.1, -56.6, 'volumeButtons', -2.5, OUT_TOP),
  screw('H4', '923-16038', 'crosshead', '0.55 kgf cm', -70.9, -55.8, 'volumeButtons', -3),
  screw('H5', '923-16038', 'crosshead', '0.55 kgf cm', -66.2, -55.8, 'volumeButtons', -3),
  screw('J4', '923-16063', 'crosshead', '0.55 kgf cm', -77.6, -19, 'touchId', -3),
  screw('J1', '923-16047', 'crosshead', '0.55 kgf cm', -79.6, -27, 'touchId', -3),
  screw('J2', '923-16032', 'crosshead', '0.65 kgf cm', -79.6, 21, 'touchId', -3),
  screw('J3', '923-16034', 'crosshead', '0.55 kgf cm', -77.4, -11, 'touchId', -3),
  screw('J5', '923-16028', 'crosshead', '0.65 kgf cm', -77.4, 11, 'touchId', -3),
];

// ------------------------------------------------------------ chips
// w runs along x, d along z. h is drawn, not published.
const chip = (id, board, side, name, role, step, x, z, w, d, surface = 'package', h = side === 'back' ? 0.7 : 0.38) => ({id, kind: 'chip', host: board, side, name, role, step, x, z, w, d, h, surface});
const L = 'logicBoard';
const I = 'ioBoard';

export const CHIPS = [
  chip('apl106b', L, 'front', 'Apple APL106B/338S01447', 'Power management', 1, -23.9, -25.3, 7.1, 6.1),
  chip('cp3201q5', L, 'front', 'Texas Instruments CP3201A0Q5', 'Battery charger', 1, -23.5, -10.8, 7, 5.3),
  chip('cbtl', L, 'front', 'NXP CBTL1701B0', 'USB Type-C port controller', 1, -30.1, -18.1, 5.2, 5.1),
  chip('codec', L, 'front', 'Apple/Cirrus Logic 338S01268', 'Audio codec', 1, -34.8, -8.9, 5.4, 4.7),
  chip('amp1', L, 'front', 'Apple/Cirrus Logic 338S01377', 'Audio amplifier', 1, -35, -14, 4.4, 3.8),
  chip('haptic', L, 'front', 'Apple/Cirrus Logic 338S01267', 'Haptic driver', 1, -32.4, 8.2, 4.6, 3.9),
  chip('eeprom', L, 'front', 'Rohm BRCC008GWZ-5', '1 kB serial EEPROM memory', 1, -19.4, -27.2, 1.9, 1.8),
  chip('cp5100', L, 'front', 'Texas Instruments CP5100A0', 'LED flash driver', 2, -36.5, 7.1, 3.4, 3.3),
  chip('stpmia', L, 'front', 'Possibly STMicroelectronics STPMIA3A', 'Power management', 2, -33.7, -26.6, 4.7, 4.5),
  chip('lm3638', L, 'front', 'Likely Texas Instruments LM3638', 'DC-DC converter', 2, -40.6, -0.5, 2.6, 2.4),
  chip('richtekL', L, 'front', 'Richtek', 'DC-DC converter', 2, -37.2, -3.9, 3, 2.9),
  chip('tps259', L, 'front', 'Texas Instruments TPS259482A', '8 A efuse with bi-directional power delivery', 2, -29.7, -12.9, 3.7, 3.1),
  chip('tps229', L, 'front', 'Texas Instruments TPS22915B', '2 A, 37 mΩ load switch', 2, -40.6, -17.6, 1.7, 1.6),
  chip('uwb', L, 'front', 'USI UWB module', 'Contains Apple’s U2 Ultra Wideband chip', 3, -25, -48.9, 8, 8.2, 'lid'),
  chip('nfc', L, 'front', 'NXP Semiconductors', 'NFC controller', 3, -39, -16.3, 4.5, 4.7),
  chip('pn800', L, 'front', 'NXP Semiconductors PN800', 'NFC controller', 3, -28.4, 1.9, 3.9, 4.1),
  chip('a20', L, 'back', 'Apple A20 Pro', 'Applications processor with memory', 4, -33.9, -10.1, 18, 19.4, 'lid', 1),
  chip('nand', L, 'back', '256 GB NAND', 'Flash memory', 4, -18.3, -5, 11.8, 16.1),
  chip('apl109h', L, 'back', 'Apple APL109H/343S00993', 'Power management', 4, -35.9, 4.4, 9, 8.8),
  chip('amp2', L, 'back', 'Apple/Cirrus Logic 338S01377', 'Audio amplifier', 4, -14.9, 8.2, 4.9, 3.7),
  chip('bcm', L, 'back', 'Broadcom BCM59367A1IUBG', 'Wireless charging receiver controller', 4, -22.6, 5.4, 6.7, 4.7),
  chip('qm', L, 'back', 'Qorvo QM81026A', 'Envelope tracker', 4, -33.9, -23.7, 5.6, 5.3),
  chip('max', L, 'back', 'Analog Devices MAX11390A', 'Analog-to-digital converter', 4, -39.8, -23.7, 4.5, 5.3),
  chip('dcdc392', L, 'back', 'Apple 338S01392', 'DC-DC converter', 5, -39.7, -26.8, 3, 3.3),
  chip('tlv', L, 'back', 'Texas Instruments TLV4031R1YKAR', 'Comparator with reference', 5, -15, 4, 2.6, 2),
  chip('c2', L, 'back', 'Apple APL1117/343S00943', 'C2 5G modem', 6, -24.9, -26.5, 11.6, 9.6, 'package', 0.8),
  chip('rf', L, 'back', 'Apple APL1088/338S01421', 'RF transceiver', 6, -25.3, -37.2, 8.6, 7.8, 'package', 0.8),
  chip('mmwaveIf', L, 'back', 'Likely Apple APL1087/338S01410', '5G mmWave IF transceiver', 6, -15.9, -50.4, 6.9, 7.6),
  chip('wifi', L, 'back', 'Apple/USI 339M00482', 'Wi-Fi 7 and Bluetooth 6 module, with Apple’s N1 chip inside', 6, -18.3, -17.4, 12.7, 7.4, 'lid'),
  chip('mmwaveFem', L, 'back', 'Likely Apple 339M00604', '5G mmWave front-end module', 6, -15.8, -39.7, 7.1, 12.5, 'lid'),
  chip('afem8283', L, 'back', 'Broadcom AFEM-8283', 'Front-end module', 6, -26.8, -45.3, 5.6, 6.5, 'lid'),
  chip('sky540', L, 'back', 'Skyworks SKY58540-21', 'Front-end module', 6, -38.3, -39.6, 5.8, 5.7, 'lid'),
  chip('afem8274a', L, 'back', 'Broadcom AFEM-8274', 'Front-end module', 7, -37.2, -34.1, 4.3, 4.1, 'lid'),
  chip('afem8274b', L, 'back', 'Broadcom AFEM-8274', 'Front-end module', 7, -34.6, -44.7, 4.3, 4.1, 'lid'),
  chip('sky562', L, 'back', 'Likely Skyworks SKY58562', 'Front-end module', 7, -33.3, -39.2, 5.2, 4.9, 'lid'),
  chip('imu', L, 'back', 'Bosch Sensortec', 'Accelerometer and gyroscope', 8, -14.3, -31.5, 4.5, 4.5),
  chip('richtekI', I, 'front', 'Richtek', 'DC-DC converter', 9, 25.5, 51.7, 2.6, 2.3),
  chip('apl106i', I, 'back', 'Likely Apple APL106I/338S01452', 'Power management', 10, 29.2, 46, 7.4, 4.9),
  chip('cp3201p5', I, 'back', 'Texas Instruments CP3201A0P5', 'Battery charger', 10, 18, 46.4, 6.3, 6.7, 'die'),
  chip('tps656a', I, 'back', 'Texas Instruments TPS65659A0', 'Display power supply', 10, 53.6, 46.4, 4.3, 4.1),
  chip('tps656b', I, 'back', 'Texas Instruments TPS65659A0', 'Display power supply', 10, 58.8, 47.6, 4.7, 4.1),
  chip('onsemiA', I, 'back', 'onsemi', 'DC-DC converter', 10, 54.3, 42.9, 2.5, 2),
  chip('onsemiB', I, 'back', 'onsemi', 'DC-DC converter', 10, 57.4, 42.9, 2.5, 2),
  chip('dcdcA', I, 'back', 'Not identified', 'DC-DC converter', 10, 61.9, 43, 2.9, 2.5),
  chip('dcdcB', I, 'back', 'Not identified', 'DC-DC converter', 10, 67.8, 46.7, 2.9, 3.1),
].map((item, i) => ({...item, tag: i + 1}));

// ------------------------------------------------------------ board layout, from iFixit's photos
export const LOGIC_OUTLINE = [[-42.7, -48], [-28.5, -48], [-28.5, -55.6], [-15.2, -55.6], [-12, -52.6], [-12, 11], [-42.7, 11]];
export const IO_OUTLINE = [[14, 42.3], [38.7, 42.3], [40, 40.3], [40, 38], [42.8, 38], [42.8, 42.3], [63, 42.4], [63.2, 40.4], [66, 40.4], [66, 42.5], [72, 42.7], [72, 54.6], [62, 54.6], [62, 52.4], [49.8, 52.8], [48.6, 48], [40, 48], [38.7, 46.6], [33.3, 54.2], [14, 54.6]];

// x, z, w along x, d along z
export const LOGIC_CONNECTORS = [
  [-16.8, -0.2, 2.8, 12.3], [-16.8, -12.5, 2.8, 12.3], [-39.5, -27.2, 2.3, 6.7], [-39.7, -33.9, 2.7, 6.1], [-38.8, -39.8, 1.9, 4.9],
  [-35.1, -33.3, 1.9, 4.9], [-33.9, -39, 2.2, 4.6], [-35.2, -44.3, 5.8, 1.9], [-25.8, -53.8, 4.5, 1.9], [-14.8, -22, 1.5, 4.6],
  [-17.1, 8.7, 6.4, 1.8], [-21.4, -0.3, 2.3, 8], [-23.9, 7.4, 1.6, 4.9],
];
export const IO_CONNECTORS = [[24, 44.8, 9.4, 2.1], [34, 44.8, 9, 2.1], [66.4, 45, 8.1, 2], [66.4, 49.2, 8.1, 2], [59, 44.8, 4, 1.6]];
export const LOGIC_HOLES = [[-27.2, 9.5], [-14.1, -24.4], [-37, -40.6], [-21.5, -49.6]];
export const IO_HOLES = [[41.1, 38.9], [14.6, 44.4], [14.3, 54.4], [64.6, 41.6], [71.1, 53.4]];
