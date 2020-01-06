import Discord from 'discord.js';

import { ICommand } from '../types/command';
import { 
    CustomCommand,
} from './logic';

import { fetchvitas, vitas } from './commands';

export const Command: { [key:string]: (command:ICommand, msg:Discord.Message) => string | void} = {
    vitas: (command:ICommand, msg:Discord.Message) => new CustomCommand(command, msg).execute(vitas, msg),
    fetchvitas: (command:ICommand, msg:Discord.Message) => new CustomCommand(command, msg).execute(fetchvitas, msg),
};