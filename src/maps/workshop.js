import { sideDoor } from './util.js';
import { play } from '../audio.js';

// Only the top part of the old room: a wide, shallow workshop.
export default {
  id: 'workshop',
  name: 'Workshop',
  theme: { floor: 'darkwood', wall: 'planks' },
  ambient: 0.6,
  tiles: [
    '####################',
    '#WWWWWWWWWWWWWWWWWW#',
    '#WWWWWWWWWWWWWWWWWW#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..............x.o.#',
    '#.............xooo.#',
    '####################',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
  ],
  props: [
    { t: 'door_side', x: 0, y: 4, side: 'L', text: 'The door back to the hallway.' },
    { t: 'pegboard', x: 4, y: 1, text: 'A pegboard full of tools. One of them is missing. Only its outline is left.' },
    { t: 'workbench', x: 4, y: 3, hide: true, blood: true, text: ['A workbench. A hammer, a saw, a vise...', 'The vise is caked with something dark.'] },
    { t: 'shelf_metal', x: 10, y: 3, text: 'Metal shelves with paint cans and jars of screws.' },
    { t: 'window', x: 14, y: 1, text: 'A grimy window. Spiders have made it their home.' },
    { t: 'crate', x: 16, y: 3, text: 'A crate of scrap wood.' },
    { t: 'crate', x: 17, y: 3, text: 'A crate full of rusty nails.' },
    { t: 'barrel', x: 18, y: 3, hide: true, text: 'A barrel. It smells like turpentine.' },
    { t: 'crate', x: 18, y: 4, hide: true, text: 'An empty crate.' },
    { t: 'cobweb', x: 18, y: 1, corner: 'tr' },
    { t: 'sawhorse', x: 5, y: 7, text: 'A sawhorse.' },
    { t: 'tablesaw', x: 14, y: 6, text: ['A table saw.', 'The blade is red. Not rust.'] },
    { t: 'planks', x: 2, y: 9, text: 'A pile of loose planks.' },
    { t: 'toolbox', x: 1, y: 8, text: 'A locked toolbox. The lock is rusted solid.' },
    { t: 'blood', x: 13, y: 7, kind: 'splat' },
    { t: 'debris', x: 7, y: 9, n: 5 },
    { t: 'debris', x: 12, y: 4, n: 4 },

    // the secret: a rug hiding a padlocked trapdoor
    {
      t: 'rug',
      x: 9,
      y: 6,
      tw: 3,
      th: 3,
      color: 0x5c4a3a,
      unless: 'rug_moved',
      reach: 'sprite', // the whole rug, edge to edge, can be looked at
      hollow: true, // and it sounds hollow to walk on

      onInteract: (g) =>
        g.say(['A dusty old rug.', 'The floor underneath it sounds... hollow.'], () => {
          g.flags.add('rug_moved');
          g.refresh();
          g.say('You drag the rug aside. There is a trapdoor hidden underneath!');
        }),
    },
    { t: 'rug_rolled', x: 11, y: 9, if: 'rug_moved', text: 'The rug, rolled up and pushed aside.' },
    {
      t: 'trapdoor',
      x: 10,
      y: 7,
      if: 'rug_moved',
      unless: 'trapdoor_open',
      text: ['A trapdoor in the floor.', 'It is held shut by a rusty padlock.'],
      // the small key from inside the piano opens the padlock
      use: {
        small_key: (g) => {
          play('unlock', 0.9);
          g.say(['The small key fits the padlock!', '...', 'The trapdoor creaks open. Cold air rises from below.'], () => {
            g.removeItem('small_key');
            g.flags.add('trapdoor_open');
            g.refresh();
          });
        },
      },
    },
    { t: 'hatch', x: 10, y: 7, if: 'trapdoor_open', text: 'The open trapdoor. A ladder leads down into the dark.' },
  ],
  doors: [
    ...sideDoor(0, 4, 'hall_g', [11, 17, 'left']),
    { x: 10, y: 7, to: 'passage', at: [2, 8, 'down'], if: 'trapdoor_open' },
  ],
};
