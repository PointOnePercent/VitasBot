import '@babel/polyfill';
import Discord from 'discord.js';
import { log } from './log';
import { classifyMessage } from './lib/message';
import { connectToDb } from './lib/db';
import { cache } from './cache';

import config from './config.json';

const bot = new Discord.Client();

const ready = bot => {
    config.DATABASES.map(db => connectToDb(db));

    cache.bot = bot;
    log.INFO(`${new Date().toLocaleString()} - Vitas working!`);
}

bot.on('ready', () => ready(bot));
bot.on('message', classifyMessage);

bot.login(config.DISCORD_TOKEN);