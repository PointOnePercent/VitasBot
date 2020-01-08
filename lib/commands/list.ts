import Discord from 'discord.js';

import { ICommand } from '../types/command';
import { 
    CustomCommand,
} from './logic';

import { fetchvitas, fetchvitaslocal, vitas, refresh } from './commands';

export const Command: { [key:string]: (command:ICommand, msg:Discord.Message) => string | void} = {
    vitas: (command:ICommand, msg:Discord.Message) => new CustomCommand(command, msg).execute(vitas, msg),
    fetchvitas: (command:ICommand, msg:Discord.Message) => new CustomCommand(command, msg).execute(fetchvitas, msg),
    fetchvitaslocal: (command:ICommand, msg:Discord.Message) => new CustomCommand(command, msg).execute(fetchvitaslocal, msg),
    refresh: (command:ICommand, msg:Discord.Message) => new CustomCommand(command, msg).execute(refresh, msg),
};