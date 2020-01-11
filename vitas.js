import '@babel/polyfill';
import Discord from 'discord.js';
import { log } from './log';
import { classifyMessage } from './lib/message';
import { mongo } from './lib/mongo';
import { markov } from './lib/markov';
import { cache } from './cache';
import config from './config.json';

let isReady = false;

const bot = new Discord.Client();
const ready = async () => {
    log.INFO('Awaiting the start of the bot...');
    await mongo.init();
    await markov.init();
    start();
}
const start = async () => {
    cache["bot"] = bot;
    cache["options"] = await mongo.getCollection('vitas', 'options');
    cache["commands"] = await mongo.getCollection('vitas', 'commands');
    cache["reactions"] = await mongo.getCollection('vitas', 'reactions');
    cache["customTags"] = await mongo.getCollection('vitas', 'customTags');
    cache["customWords"] = await mongo.getCollection('vitas', 'customWords');
    isReady = true;
    log.INFO(`${new Date().toLocaleString()} - Vitas starts working!`);
}
bot.on('ready', ready);
bot.on('message', msg => classifyMessage(msg, isReady));
bot.login(config.DISCORD_TOKEN);
