// Behind the house. The back wall of the house runs along the top; the porch and its
// steps are part of this same map (no fade), the tool shed is a separate area.
// Everything outside the broken fence is black.
const yard = (inner) => '  f' + inner + 'f  ';

const MARIE = ["A hole in the ground with someone's tombstone on top of it.", 'The tombstone says: "Marie W. Stewart, 1912-1962"', 'The grave is empty.'];
const CROP = ['Withered crops. Nothing has grown here in a long time.', 'Dead stalks. They rustle, though there is no wind.', 'A rotten head of cabbage, crawling with something.'];

export default {
  id: 'backyard',
  name: 'Backyard',
  theme: { floor: 'grass', wall: 'siding' },
  ambient: 0.55,
  playerLight: 92,
  tileText: {
    f: 'A broken-down fence. Beyond it there is nothing but darkness.',
    q: 'The fence has collapsed here... but there is nothing out there. Only black.',
  },
  tiles: [
    '  ' + '#'.repeat(20) + '  ',
    '  ' + 'W'.repeat(20) + '  ',
    '  ' + 'W'.repeat(20) + '  ',
    yard('ggg' + 'g' + 'pppppppppp' + 'g' + 'ggg'),
    yard('ggg' + 'g' + 'pppppppppp' + 'g' + 'ggg'),
    yard('ggg' + 'g' + 'pppppppppp' + 'g' + 'ggg'),
    yard('gggg' + 'FFFF' + 'PP' + 'FFFF' + 'gggg'),
    yard('gggggggg' + 'PP' + 'gggggggg'),
    yard('g' + 'ssssss' + 'g' + ',,' + 'gggggggg'),
    '  q' + 'g' + 'ssssss' + 'g' + ',,' + 'gggggggg' + 'f  ',
    '  q' + 'g' + 'ssssss' + 'g' + ',,' + 'gggggggg' + 'f  ',
    yard('g' + 'ssssss' + 'g' + ',,' + 'gggggggg'),
    yard('gggggggg' + ',,,,,' + 'ggggg'),
    yard('gggggggg' + ',,' + 'gggggggg'),
    '  f' + 'gggggggg' + ',,' + 'gggggggg' + 'q  ',
    yard('gggggggg' + ',,' + 'gggggggg'),
    yard('gggggggg' + ',,' + 'gggggggg'),
    yard('ggg' + ',,,,,,,' + 'gggggggg'),
    '  ' + 'fffffffqqffffffqffff' + '  ',
    ' '.repeat(24),
  ],
  props: [
    // the house
    { t: 'door_back', x: 11, y: 1, text: 'The back door of the house.' },
    { t: 'window', x: 5, y: 1, text: 'A window into the house. It is dark inside.' },
    { t: 'window', x: 8, y: 1, text: 'Through the glass I can see the hallway... and something standing in it.' },
    { t: 'window', x: 15, y: 1, text: 'A boarded window.' },
    { t: 'window', x: 18, y: 1, text: 'The curtains on the other side are moving.' },

    // porch
    { t: 'doormat', x: 11, y: 3, tw: 2 },
    { t: 'planter', x: 6, y: 3, text: 'A stone flower bed. Everything in it is dead.' },
    { t: 'planter', x: 17, y: 3, text: 'A stone flower bed full of dry, grey stems.' },
    { t: 'rockingchair', x: 8, y: 3, text: 'A rocking chair on the porch. It sways gently by itself.' },
    { t: 'plant', x: 15, y: 3, text: 'A dead plant in a cracked pot.' },

    // garden on the left
    ...[4, 5, 6, 7, 8, 9].flatMap((x, i) => [
      { t: 'crop', x, y: 8, kind: ['corn', 'cabbage', 'stake'][i % 3], text: CROP[i % 3] },
      { t: 'crop', x, y: 10, kind: ['stake', 'corn', 'cabbage'][i % 3], text: CROP[(i + 1) % 3] },
    ]),
    { t: 'scarecrow', x: 7, y: 9, text: ['A scarecrow with a burlap sack for a head.', 'Its stitched mouth is stained red.'] },
    { t: 'shed', x: 4, y: 13, text: 'A small tool shed.' },

    // trees and the well on the right
    { t: 'tree', x: 19, y: 4, seed: 11, text: 'A dead tree. Its bark peels away like skin.' },
    { t: 'tree', x: 17, y: 8, seed: 5, text: 'A dead tree.' },
    { t: 'tree', x: 13, y: 14, seed: 7, text: 'A twisted, leafless tree.' },
    { t: 'tree', x: 19, y: 14, seed: 9, text: 'A dead tree. Something has scratched marks into the trunk.' },
    // bare at first; the rope and then the bucket change it (see src/puzzles.js)
    {
      t: 'well',
      x: 15,
      y: 13,
      looks: [['well_rope', { state: 'rope' }], ['well_bucket', { state: 'bucket' }]],
      text: ['An old stone well.', 'It is too dark to see the bottom. I can hear dripping... and breathing.'],
    },
    { t: 'blood', x: 14, y: 12, kind: 'splat' },

    // graves along the fence, either side of the porch: hers has been dug up
    { t: 'tombstone', x: 3, y: 5, text: MARIE },
    { t: 'grave_hole', x: 3, y: 6, text: MARIE },
    { t: 'dirt_pile', x: 5, y: 5 },
    { t: 'tombstone', x: 20, y: 5, text: ["Someone's grave.", 'The tombstone says: "Dave R. Stewart, 1911-______".'] },
    { t: 'debris', x: 10, y: 15, n: 3 },
  ],
  doors: [
    { x: 11, y: 2, to: 'hall_g', at: [9, 20, 'up'] },
    { x: 12, y: 2, to: 'hall_g', at: [10, 20, 'up'] },
    { x: 6, y: 16, to: 'shed', at: [5, 8, 'up'] },
  ],
};
