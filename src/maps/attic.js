// The attic: a long, low room running left to right, much darker than the floors below.
// It is crowded with furniture under dust sheets. At the far end a wall of covered
// junk blocks the way, and everything behind it fades into black (see `darkZone`).
const W = 46;
const VOID = ' '.repeat(W);
const row = (fill, edge = fill) => edge + fill.repeat(W - 2) + edge;

const BLOCK = "Looks like these things are blocking the way, can't go any further.";
const SHEETS = [
  'Something under a dust sheet. I would rather not lift it.',
  'A dust sheet, grey with years of dirt.',
  'Furniture under a sheet. The shape is... almost like someone sitting.',
  'A sheet-covered cabinet. Something inside it knocks, once.',
  'Covered furniture. The sheet is stained on one side.',
  'A dresser under a dust sheet.',
];
let n = 0;
const sheet = (x, y, kind, text) => {
  const i = n++;
  return { t: 'sheet', x, y, kind, seed: 100 + i, text: text ?? SHEETS[i % SHEETS.length] };
};
const block = (x, y, kind) => ({ t: 'sheet', x, y, kind, seed: 200 + x * 7 + y, text: BLOCK });

export default {
  id: 'attic',
  name: 'Attic',
  theme: { floor: 'attic', wall: 'attic' },
  ambient: 0.84,
  playerLight: 70,
  darkZone: { from: 39 * 16, to: 44 * 16, max: 0.97 },
  tiles: [
    VOID, VOID, VOID,
    row('#'),
    row('W', '#'),
    row('W', '#'),
    row('.', '#'),
    row('.', '#'),
    row('.', '#').replace(/^(.{14})\./, '$1x'),
    row('.', '#'),
    row('.', '#').replace(/^(.{27})\./, '$1x'),
    row('.', '#'),
    row('#'),
    VOID, VOID,
  ],
  props: [
    // the way back down
    { t: 'hatch', x: 3, y: 7, text: 'The hatch back down to the upper floor.' },
    { t: 'cobweb_big', x: 1, y: 4, corner: 'tl' },
    { t: 'box', x: 1, y: 6, open: true, text: 'A box of old letters. The ink has run.' },
    { t: 'box', x: 2, y: 6, text: 'A box labelled "DO NOT OPEN".' },
    { t: 'trunk', x: 1, y: 10, hide: true, text: 'An old travel trunk. Empty.' },
    { t: 'window', x: 6, y: 4, text: 'A tiny window, caked in grime. A sliver of moonlight gets through.' },

    // along the back wall
    { ...sheet(5, 6, 'cabinet'), hide: true },
    sheet(6, 6, 'tall'),
    { t: 'web', x: 8, y: 6 },
    { ...sheet(10, 6, 'dresser'), hide: true },
    sheet(12, 6, 'mirror', 'A big round mirror, half covered. The sheet keeps slipping off.'),
    { t: 'cobweb_big', x: 14, y: 4, corner: 'tl' },
    sheet(15, 6, 'cabinet'),
    { t: 'web', x: 17, y: 6 },
    sheet(20, 6, 'wide'),
    sheet(22, 6, 'cabinet'),
    { t: 'window', x: 24, y: 4, text: 'A round window. The moon behind it is the wrong color.' },
    sheet(26, 6, 'round'),
    sheet(27, 6, 'lump', 'Under this sheet: something shaped like a person, standing perfectly still.'),
    { t: 'web', x: 29, y: 6 },
    { ...sheet(31, 6, 'dresser'), hide: true },
    { t: 'cobweb_big', x: 33, y: 4, corner: 'tr' },
    sheet(35, 6, 'tall'),
    { ...sheet(36, 6, 'mirror', 'Another covered mirror. Something moved in the uncovered part.'), hide: true },

    // along the bottom
    sheet(5, 11, 'low'),
    sheet(8, 11, 'round'),
    sheet(11, 11, 'cabinet'),
    sheet(13, 11, 'dresser'),
    sheet(19, 11, 'mirror'),
    sheet(21, 11, 'wide'),
    sheet(25, 11, 'tall'),
    sheet(29, 11, 'low'),
    sheet(32, 11, 'cabinet'),
    sheet(34, 11, 'round'),
    sheet(36, 11, 'dresser'),

    // scattered in between, leaving a winding path
    { t: 'beam', x: 9, y: 8, text: 'A wooden support beam. It creaks.' },
    { t: 'rockingchair', x: 12, y: 9, text: 'A rocking chair, facing the wall.' },
    { t: 'mirror_round', x: 16, y: 8, text: ['A large round mirror.', 'For a second I saw something standing behind me.'] },
    { t: 'beam', x: 18, y: 10, text: 'A support beam, gnawed at the bottom.' },
    { t: 'mannequin', x: 23, y: 8, dress: true, text: ['A mannequin in a moth-eaten wedding dress.', 'I could swear it was facing the other way a moment ago.'] },
    { t: 'crate', x: 24, y: 9, text: 'A crate full of broken toys.' },
    sheet(27, 9, 'lump'),
    { t: 'beam', x: 30, y: 7, text: 'A support beam. Someone carved tally marks into it.' },
    { t: 'doll', x: 31, y: 9, text: 'A doll with its face painted over.' },
    sheet(33, 8, 'wide'),
    { t: 'beam', x: 37, y: 9, text: 'A support beam.' },
    { t: 'debris', x: 4, y: 9, n: 4 },
    { t: 'debris', x: 14, y: 8, n: 3 },
    { t: 'debris', x: 21, y: 9, n: 4 },
    { t: 'debris', x: 35, y: 9, n: 3 },

    // the barrier at the far end
    block(39, 6, 'cabinet'),
    block(40, 6, 'tall'),
    block(39, 7, 'wide'),
    block(39, 8, 'lump'),
    block(40, 8, 'cabinet'),
    block(39, 9, 'dresser'),
    block(39, 10, 'round'),
    block(40, 10, 'mirror'),
    block(39, 11, 'low'),
    { t: 'cobweb_big', x: 38, y: 4, corner: 'tr' },

    // more junk fading into the dark behind it
    { t: 'sheet', x: 42, y: 6, kind: 'cabinet', seed: 301 },
    { t: 'sheet', x: 43, y: 8, kind: 'wide', seed: 302 },
    { t: 'sheet', x: 41, y: 10, kind: 'tall', seed: 303 },
    { t: 'sheet', x: 42, y: 11, kind: 'round', seed: 304 },
    { t: 'beam', x: 44, y: 7 },
  ],
  doors: [{ x: 3, y: 7, to: 'landing', at: [7, 4, 'down'] }],
};
