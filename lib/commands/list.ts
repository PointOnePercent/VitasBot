import Discord from 'discord.js';

import { ICommand } from '../types/command';
import { 
    CustomCommand,
} from './logic';

import { vitas, invokers, refresh, fetch, fetchlocal } from './commands';

export const Command: { [key:string]: (command:ICommand, msg:Discord.Message) => string | void} = {
    vitas: (command:ICommand, msg:Discord.Message) => new CustomCommand(command, msg).execute(vitas, msg),
    invokers: (command:ICommand, msg:Discord.Message) => new CustomCommand(command, msg).execute(invokers, msg),
    
    refresh: (command:ICommand, msg:Discord.Message) => new CustomCommand(command, msg).execute(refresh, msg),
    fetch: (command:ICommand, msg:Discord.Message) => new CustomCommand(command, msg).execute(fetch, msg),
    fetchlocal: (command:ICommand, msg:Discord.Message) => new CustomCommand(command, msg).execute(fetchlocal, msg),
};