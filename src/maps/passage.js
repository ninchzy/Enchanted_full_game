// Secret passage under the workshop: a long stone corridor running left to right.
// The torches are the only light, and they ignite one by one when you arrive
// (closest first). The door to the hidden room is on the top wall at the far end.
const W = 40;
const row = (fill, edge = fill) => edge + fill.repeat(W - 2) + edge;
const VOID = ' '.repeat(W);

const TORCH = 'A burning torch. Who lit these?';
// the door to the hidden room has no lock: a switch in the front door works it, so it only
// opens once the front door has been unlocked (and the portal is there)
const SHUT = [
  "The door won't open, but it doesn't have a lock either.",
  'You notice in a small crack in the wall some sort of hidden mechanism.',
  'Maybe something else needs to be done first for this door to open.',
];

export default {
  id: 'passage',
  name: 'Secret Passage',
  theme: { floor: 'stone', wall: 'stone' },
  ambient: 0.97,
  corridor: 'horizontal', // the seeker stops against the top or bottom wall here
  playerLight: 40,
  playerLightAlpha: 0.5,
  tiles: [
    VOID, VOID, VOID, VOID,
    '#'.repeat(W),
    row('W', '#'),
    row('W', '#'),
    row('.', '#'),
    row('.', '#'),
    row('.', '#'),
    '#'.repeat(W),
    VOID, VOID, VOID, VOID,
  ],
  props: [
    { t: 'ladder', x: 2, y: 5, text: 'The ladder back up to the workshop.' },
    { t: 'chains', x: 4, y: 5, text: 'Rusted chains hang from the wall.' },
    ...[6, 12, 18, 24, 30, 37].map((x) => ({ t: 'torch', x, y: 5, sequence: true, text: TORCH })),
    // places where the wall has caved in, big enough to squeeze into
    { t: 'wall_breach', x: 8, y: 5, hide: true, text: ['Part of the wall has caved in.', 'There is just enough room in there for me to squeeze inside.'] },
    { t: 'wall_breach', x: 27, y: 5, hide: true, text: ['A collapsed section of wall. It is pitch black inside.', 'Something small scurries away deeper in.'] },
    { t: 'door_dungeon', x: 35, y: 5, text: 'A heavy wooden door bound with iron.' },
    { t: 'cobweb', x: 38, y: 5, corner: 'tr' },
    { t: 'puddle', x: 13, y: 8, tw: 2, text: 'A puddle of black water.' },
    { t: 'bone', x: 5, y: 9, text: 'A long bone, gnawed at one end.' },
    { t: 'ribcage', x: 21, y: 8, text: 'A ribcage. Too small to be an adult.' },
    { t: 'skull', x: 32, y: 9, text: 'A skull. It looks a lot like mine.' },
    { t: 'debris', x: 17, y: 9, n: 4 },
    { t: 'debris', x: 31, y: 7, n: 3 },
    { t: 'blood', x: 27, y: 8, tw: 8, kind: 'drag' },
  ],
  doors: [
    { x: 2, y: 7, to: 'workshop', at: [10, 8, 'down'] },
    { x: 35, y: 6, to: 'cellar', at: [9, 13, 'up'], if: 'portal_open' },
    { x: 36, y: 6, to: 'cellar', at: [10, 13, 'up'], if: 'portal_open' },
    // (he still walks through: it's his house)
    { x: 35, y: 6, to: 'cellar', at: [9, 13, 'up'], unless: 'portal_open', locked: SHUT },
    { x: 36, y: 6, to: 'cellar', at: [10, 13, 'up'], unless: 'portal_open', locked: SHUT },
  ],
};
