import { room, sideDoor } from './util.js';

export default {
  id: 'bedroom',
  name: 'Bedroom',
  theme: { floor: 'wood', wall: 'stripe' },
  ambient: 0.5,
  tiles: room({
    11: '.ooo..............',
    12: '.oox..............',
    13: '..x...............',
  }),
  props: [
    { t: 'door_side', x: 19, y: 4, side: 'R', text: 'The door back to the hallway.' },
    { t: 'wardrobe', x: 2, y: 2, hide: true, scratched: true, text: ['A tall wardrobe.', 'The doors are covered in scratches... from the inside.'] },
    { t: 'picture', x: 5, y: 1, kind: 'portrait', blood: true, text: 'A portrait of a young woman. Her eyes have been painted over in red.' },
    { t: 'nightstand', x: 6, y: 3, item: 'lamp', text: 'A bedside lamp. The bulb is shattered.' },
    { t: 'bed', x: 7, y: 3, hide: true, blood: true, text: ['A double bed. The sheets are stained and torn.', 'Someone left in a hurry. Or did not leave at all.'] },
    { t: 'nightstand', x: 10, y: 3, item: 'candle', text: 'A candle burning on the nightstand. Who lit it?' },
    { t: 'window', x: 12, y: 1, text: 'The window is nailed shut. The moon is barely visible.' },
    { t: 'dresser', x: 14, y: 3, mirror: true, items: true, text: 'A dresser with a vanity mirror. Old perfume bottles, all dried up.' },
    { t: 'picture', x: 17, y: 1, kind: 'family', text: 'A family photo. Someone burned the faces out.' },
    { t: 'cobweb', x: 18, y: 1, corner: 'tr' },
    { t: 'rug', x: 6, y: 7, tw: 6, th: 4, color: 0x4a5560 },
    { t: 'chair', x: 3, y: 9, dir: 'fallen', text: 'A toppled chair.' },
    { t: 'doll', x: 16, y: 9, text: 'A porcelain doll. One of its eyes has been gouged out.' },
    { t: 'blood', x: 11, y: 6, kind: 'splat' },
    { t: 'debris', x: 5, y: 11, n: 5 },
  ],
  doors: [...sideDoor(19, 4, 'hall_g', [7, 11, 'right'])],
};
