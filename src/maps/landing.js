// Upper floor: the landing, now only the right part of the old space. Ladder to the
// attic on the back wall, the end of the stairs from the ground floor, a big hole in the
// planks, and the door to the summoning room on the right wall.
const SUMMONING_LOCK = { flag: 'summoning_unlocked', key: 'spare_key' };

export default {
  id: 'landing',
  name: 'Upper Floor',
  theme: { floor: 'darkwood', wall: 'stripe' },
  ambient: 0.58,
  tiles: [
    '     ###############',
    '     #WWWWWWWWWWWWW#',
    '     #WWWWWWWWWWWWW#',
    '     #.............#',
    '     #......DD.....#',
    '     #......DD.....#',
    '     #......DD.....#',
    '     #.............#',
    '     #.xooox.......#',
    '     #.oooooo......#',
    '     #ooooooo......#',
    '     #ooooooo......#',
    '     #xooooox......#',
    '     #.xooox.......#',
    '     ###############',
  ],
  props: [
    { t: 'cobweb', x: 6, y: 1, corner: 'tl' },
    { t: 'ladder', x: 7, y: 1, text: 'A ladder up to the attic. The hatch above is open.' },
    { t: 'window', x: 9, y: 1, text: 'A tall window. The glass is cracked like a spider web.' },
    { t: 'trunk', x: 9, y: 3, hide: true, text: 'An old trunk. Locked tight.' },
    { t: 'picture', x: 15, y: 1, kind: 'portrait', text: 'A portrait of a child. Its face has been scratched out.' },
    { t: 'window', x: 17, y: 1, text: 'Through the dirty glass, the garden below is swallowed by fog.' },
    { t: 'sidetable', x: 17, y: 3, text: 'A side table with a vase of wilted lilies.' },
    { t: 'cobweb', x: 18, y: 1, corner: 'tr' },
    { t: 'doll', x: 13, y: 10, text: 'A doll, sitting at the edge of the hole. As if it was watching something below.' },
    { t: 'candle', x: 15, y: 8, black: false, text: 'A candle someone left on the floor.' },
    { t: 'debris', x: 14, y: 9, n: 6 },
    { t: 'debris', x: 8, y: 7, n: 4 },
    { t: 'blood', x: 13, y: 12, tw: 5, kind: 'drag' },
    { t: 'door_side', x: 19, y: 11, side: 'R', blood: true, text: 'A heavy door. The blood trail leads right under it.' },
    // the save point
    { t: 'savebook', x: 18, y: 8, onInteract: (g) => g.openSaveBook() },
  ],
  doors: [
    { x: 7, y: 3, to: 'attic', at: [3, 8, 'down'] },
    { x: 12, y: 6, to: 'hall_g', at: [7, 2, 'down'] },
    { x: 13, y: 6, to: 'hall_g', at: [8, 2, 'down'] },
    // locked until the spare key from the well
    { x: 19, y: 11, to: 'summoning', at: [1, 12, 'right'], lock: SUMMONING_LOCK },
    { x: 19, y: 12, to: 'summoning', at: [1, 12, 'right'], lock: SUMMONING_LOCK },
  ],
};
