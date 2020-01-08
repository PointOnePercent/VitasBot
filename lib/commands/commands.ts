import Discord from "discord.js";
import Markov from 'markov-strings';
import nlp from 'compromise';
import { uniq, flatten, flattenDeep } from 'lodash';
import { chooseRandom, happensWithAChanceOf } from '../rng';
import { insertData } from '../db';
import { log } from '../../log';
import { cache } from '../../cache';
import { updateCache } from '../db';
import config from '../../config.json';

// INITIALIZATION
let markovInit;
const initMarkov = async dataArrays => {
    const stateSize = cache["options"] 
        ? cache["options"].find(option => option.option === 'stateSize').value 
        : 2;
    const data = [].concat(...dataArrays);
    markovInit = new Markov(data, { stateSize })
    markovInit.buildCorpus();
}
let nlpPlugin = (Doc, world) => {
    const customWords = {};
    const customTags = {};

    cache["customTags"].map(tag => {
        tag.notA
            ? customTags[tag.tag] = { 
                isA: tag.isA,
                notA: tag.notA
            }
            : customTags[tag.tag] = { 
                isA: tag.isA
            }
    });
    cache["customWords"].map(word => customWords[word.word] = word.tag);

    world.addWords(customWords);
    world.addTags(customTags);
}
let normalize = (content, include?, exclude?) => {
    nlp.extend(nlpPlugin);
    let prepare:nlp.Document = nlp(content);
    let normalized:any = prepare.normalize();
    let final:string = normalized.out('text');
    let nounObject:any = nlp(final)
        .nouns()
        .unique()
        .out('tags')
    let filtered = nounObject.map(noun => Object.entries(noun).map(([key, value]) => ({ key, value })));
    let filteredFlatten = flatten(filtered)
        .filter(noun => {
            let legit = noun.value 
                && !noun.value.includes('IgnoreThis');
            if (exclude && exclude.length > 0) 
                legit = legit && exclude.filter(tagToExclude => noun.value.includes(tagToExclude)).length === 0;
            if (include && include.length > 0) 
                legit = legit && include.filter(tagToInclude => !noun.value.includes(tagToInclude)).length === 0;
            if (legit) {
                const tryAgain = nlp(noun.key.toLowerCase()).nouns().out('array')
                if (tryAgain.length === 0)
                    return false;
                else
                    return true;
            }
            else
                return false;
    })
    nounObject = filteredFlatten;
    let nounArray = nounObject.map(noun => noun.key);
    return nounArray;
}

export const fetchvitas = (msg:Discord.Message) => {
    const channelId = '572793751202955264'
    const vitasId = '361185720477679616';
    const msgs:string[] = [];
    const fetchNumber = 130;

    // @ts-ignore:next-line
    const channel = cache.bot.channels.find(channel => channel.id === channelId)
    
    if (!channel)
        return msg.channel.send('Invalid channel.');
    
    const fetchMoar = (index, lastMsgId) => {
        console.log(lastMsgId);
        channel.fetchMessages({ limit: 100, before: lastMsgId })
            .then(messages => {
                messages.map(msg => {
                    if (msg.content != '' && msg.author.id === vitasId && !msg.content.startsWith('http'))
                        msgs.push(msg.content.endsWith('.') || msg.content.endsWith('?') || msg.content.endsWith('!') ? msg.content : `${msg.content}.`)
                    })
                if (index <= fetchNumber) {
                    setTimeout(() => fetchMoar(index + 1, messages.lastKey()), 1000);
                }
                else
                    finish()
                })
            .catch(err => console.log(err));
    }
    
    const finish = () => {
        const normalizedMsgs = uniq(msgs)
        normalizedMsgs.map(msg => insertData('vitas', 'vitas', 'vitas', msg, err =>
            err
                ? console.log(err)
                : null
        ))
        msg.channel.send('Done!');
        msg.channel.stopTyping();
    }
    msg.channel.startTyping();
    fetchMoar(0, null);
}
export const fetchvitaslocal = (msg:Discord.Message) => {
    msg.channel.startTyping();

    let logs;
    let filtered;
    try { 
        logs = require('../../data.json') 
    }
    catch { 
        return msg.channel.send('Data file not found.') 
    }

    if (Array.isArray(logs)) { // just an array of quotes
        filtered = logs
            .map(msg => msg.endsWith('.') || msg.endsWith('?') || msg.endsWith('!') ? msg : `${msg}.`);
    }
    else { // object fetched from Discord's search function
        const vitasId = '361185720477679616';
        const flattened = logs.map(log => flatten(log.messages));
        const flattenedMore = flatten(flattened);
        filtered = flattenedMore
            .filter(msg => msg.author.id === vitasId && msg.content != '' && !msg.content.startsWith('http'))
            .map(msg => msg.content.endsWith('.') || msg.content.endsWith('?') || msg.content.endsWith('!') ? msg.content : `${msg.content}.`);
    }
    const normalizedMsgs = uniq(filtered);
    normalizedMsgs.map(msg => insertData('vitas', 'vitas', 'vitas', msg, err =>
        err
            ? console.log(err)
            : null
    ))
    msg.channel.send('Done!');
    msg.channel.stopTyping();
}
export const vitas = async (msg:Discord.Message, reaction?) => {
    msg.channel.startTyping();
    const sentencesCommand = cache["options"] 
        ? cache["options"].find(option => option.option === 'sentencesCommand').value 
        : 5;
    const sentencesReaction = cache["options"] 
        ? cache["options"].find(option => option.option === 'sentencesReaction').value 
        : 3;
    const options = {
        maxTries: 50,
        maxLength: 300,
        minWords: 2,
        prng: Math.random,
        filter: result => result.string.endsWith('.')
    }
    const normalizedMsgs:string[] = cache["vitas"].map(vitas => vitas.vitas);
    const chanceToSwapNouns = cache["options"] ? cache["options"].find(option => option.option === 'chanceToSwapNouns').value : 30;
    const chanceToSwapProperNouns = cache["options"] ? cache["options"].find(option => option.option === 'chanceToSwapProperNouns').value : 55;
    const chanceToSwapNicknames = cache["options"] ? cache["options"].find(option => option.option === 'chanceToSwapNicknames').value : 30;
    let content = '';
    const usersTalking:string[] = [];

    initMarkov(normalizedMsgs); //this should be done only once!

    await msg.channel.fetchMessages({ limit: 10, before: msg.id })
        .then(async messages => {
            const limit = reaction ? sentencesReaction : sentencesCommand;
            for (let i = 0; i < limit; i++) 
                content += await markovInit.generate(options).string + ' ';
            
            messages = messages.filter(message => !message.author.bot);
            messages.map(message => usersTalking.push(message.author.username));

            if (messages.size === 0)
                return;

            let aggregatedMessages = messages.reduce((acc, value) => `${acc}. ${value}`);
            let recentNouns = uniq(normalize(aggregatedMessages, [], ['ProperNoun', 'Demonym', 'Acronym', 'Pronoun', 'Honorific']));
            let vitasNouns = uniq(normalize(content, [], ['ProperNoun', 'Demonym', 'Acronym', 'Pronoun', 'Honorific']));
            let recentProperNouns = uniq(normalize(aggregatedMessages, ['ProperNoun'], ['Demonym', 'Acronym', 'Pronoun', 'Honorific']));
            let vitasProperNouns = uniq(normalize(content, ['ProperNoun'], ['Demonym', 'Acronym', 'Pronoun', 'Honorific']));

            console.log(`${new Date().toLocaleString()} - ------------ [ ${reaction ? 'REACTION' : 'COMMAND'} ] ------------`);
            console.log(`${new Date().toLocaleString()} - [ORIGINAL] - ${content}`);
            console.log(`${new Date().toLocaleString()} - [NOUNS] - ${JSON.stringify(recentNouns)}`);
            console.log(`${new Date().toLocaleString()} - [VITAS NOUNS] - ${JSON.stringify(vitasNouns)}`);
            console.log(`${new Date().toLocaleString()} - [PROPER NOUNS] - ${JSON.stringify(recentProperNouns)}`);
            console.log(`${new Date().toLocaleString()} - [VITAS PROPER NOUNS] - ${JSON.stringify(vitasProperNouns)}`);

            vitasNouns.map(nounToSwap => {
                if (happensWithAChanceOf(chanceToSwapNouns) && recentNouns.length !== 0) {
                    const replaceWith = chooseRandom(recentNouns);
                    content = content.replace(nounToSwap, replaceWith);
                }
            })
            vitasProperNouns.map(properNounToSwap => {
                if (happensWithAChanceOf(chanceToSwapProperNouns) && recentProperNouns.length !== 0) {
                    const replaceWith = chooseRandom(recentProperNouns);
                    const regex = new RegExp(properNounToSwap, "gi");
                    content = content.replace(regex, replaceWith);
                }
                else if (happensWithAChanceOf(chanceToSwapNicknames)) {
                    const replaceWith = chooseRandom(usersTalking);
                    const regex = new RegExp(properNounToSwap, "gi");
                    content = content.replace(regex, replaceWith);
                }                    
            })
            content = content.replace(/<@.*?>/g, chooseRandom(usersTalking));
            console.log(`${new Date().toLocaleString()} - [RESULT] - ${JSON.stringify(content)}`);
            msg.channel.send(content);
            msg.channel.stopTyping();
        })
        .catch(err => console.trace(err));
}

export const refresh = (msg:Discord.Message) => {
    config.DATABASES.map(db => updateCache(db.symbol));
    msg.react('✔️');    
}