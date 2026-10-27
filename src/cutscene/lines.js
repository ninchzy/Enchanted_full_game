import { VOICE } from '../ui/common.js';

// Message box pages for people speaking out loud (thoughts and narration are plain strings).

/** the skeleton speaking */
export const me = (text, extra = {}) => ({ text: `"${text}"`, color: VOICE.skeleton, ...extra });
/** the hooded figure speaking */
export const him = (text) => ({ text: `"${text}"`, color: VOICE.seeker });
/** the skeleton trailing off: no quote marks */
export const mePause = (text = '...') => ({ text, color: VOICE.skeleton });
