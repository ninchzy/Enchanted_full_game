// Wording for hiding spots. A prop with `hide: true` is a hiding spot; `hide` can also be
// a phrase like "under the sink" to override the wording below.

const INSIDE = new Set(['wardrobe', 'counter', 'fridge', 'trunk', 'wall_breach', 'fireplace', 'bathtub', 'uppercab', 'cage', 'iron_maiden']);
const UNDER = new Set(['table', 'table_small', 'bed', 'bed_single', 'workbench', 'altar', 'rack', 'sheet', 'tablesaw']);

const NAMES = {
  counter: 'cabinet', uppercab: 'cabinet', wall_breach: 'hole in the wall', table_small: 'table', bed_single: 'bed',
  sheet: 'dust sheet', sofa_back: 'sofa', shelf_metal: 'shelves', mirror_round: 'mirror', iron_maiden: 'iron maiden',
  bathtub: 'bathtub', rockingchair: 'rocking chair', tablesaw: 'table saw', bone_pile: 'bones',
};

export const spotName = (t) => NAMES[t] ?? t.replace(/_/g, ' ');

/** e.g. "inside the wardrobe", "under the table", "behind the barrel" */
export function hidePhrase(prop) {
  if (typeof prop.hide === 'string') return prop.hide;
  const where = INSIDE.has(prop.t) ? 'inside' : UNDER.has(prop.t) ? 'under' : 'behind';
  return `${where} the ${spotName(prop.t)}`;
}
