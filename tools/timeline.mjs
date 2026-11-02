// Writes the tour's key times for the kit's --stills beats sheet, so the review tiles land on what the tour does.
import fs from 'node:fs';
import {TOUR_KEYS} from '../src/model.js';

fs.mkdirSync('teardown-out', {recursive: true});
// the sheet adds 0.3 s, so each tile lands near the end of its step's hold
const beats = Object.fromEntries(TOUR_KEYS.map((key, i) => [`${String(i).padStart(2, '0')}-${key.label}`, Math.max(key.until - 0.5, 0)]));
fs.writeFileSync('teardown-out/timeline.json', JSON.stringify(beats, null, 2));
