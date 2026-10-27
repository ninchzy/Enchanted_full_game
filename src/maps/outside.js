// The front of the house, seen from outside: only reached in ending 1. The facade runs
// along the top (two windows, the open front door in the middle, a flower bed of bushes
// under each window); everything else is black. The map runs far down into that
// blackness so the camera can follow the skeleton away until the house is out of sight.
const W = 20, H = 24;
const row = (inner) => '   ' + inner + '   ';

export default {
  id: 'outside',
  name: 'Outside',
  theme: { floor: 'grass', wall: 'siding' },
  ambient: 0.6,
  playerLight: 70,
  // a little light spilling out of the open door
  lights: [{ x: 160, y: 40, r: 56, a: 0.55 }],
  tiles: [
    row('#'.repeat(W - 6)),
    row('W'.repeat(W - 6)),
    row('W'.repeat(W - 6)),
    ...Array.from({ length: H - 3 }, () => ' '.repeat(W)),
  ],
  props: [
    { t: 'window', x: 5, y: 1, text: 'A window of the house.' },
    { t: 'window', x: 14, y: 1, text: 'A window of the house.' },
    // the front door, standing open onto the dark inside
    { t: 'portal', x: 9, y: 1, empty: true },
    { t: 'shrub_bed', x: 3, y: 3, tw: 5 },
    { t: 'shrub_bed', x: 12, y: 3, tw: 5, dy: 3 },
  ],
  doors: [],
};
