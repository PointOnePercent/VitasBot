import Discord from 'discord.js';
import { 
    CustomReaction,
} from './logic';

import { vitas } from './commands';

export const Reaction: { [key:string]: (msg:Discord.Message) => string | void} = {
    vitas: (msg:Discord.Message) => new CustomReaction(msg).execute(vitas, msg, 'reaction'),
};