import Discord from "discord.js";
import nlp from 'compromise';
import { uniq, uniqBy, orderBy, flatten } from 'lodash';
import { createEmbed } from '../helpers';
import { chooseRandom, happensWithAChanceOf } from '../rng';
import { mongo } from '../mongo';
import { markov } from '../markov';
import { log } from '../../log';
import { cache } from '../../cache';

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

export const refresh = async (msg:Discord.Message) => { 
    msg.channel.startTyping();
    cache["options"] = await mongo.getCollection('vitas', 'options');
    cache["commands"] = await mongo.getCollection('vitas', 'commands');
    cache["reactions"] = await mongo.getCollection('vitas', 'reactions');
    cache["customTags"] = await mongo.getCollection('vitas', 'customTags');
    cache["customWords"] = await mongo.getCollection('vitas', 'customWords');
    msg.channel.send('Done!');
    msg.channel.stopTyping();
}

export const fetch = (msg:Discord.Message) => {
    const channelId = cache["options"] 
        ? cache["options"].find(option => option.option === 'channelToFetch').value 
        : '572793751202955264'
    const userId = cache["options"] 
        ? cache["options"].find(option => option.option === 'personToFetch').value.id
        : '361185720477679616';
    const userName = cache["options"] 
        ? cache["options"].find(option => option.option === 'personToFetch').value.nickname
        : 'vitas';
    const fetchLimit = cache["options"] 
        ? cache["options"].find(option => option.option === 'fetchLimit').value
        : 1;
    const msgs:string[] = [];

    // @ts-ignore:next-line
    const channel = cache.bot.channels.find(channel => channel.id === channelId)
    
    if (!channel) {
        msg.channel.send('Invalid channel.');
        return;
    }
    
    const fetchMoar = (index, lastMsgId) => {
        channel.fetchMessages({ limit: 100, before: lastMsgId })
            .then(messages => {
                log.INFO(`fetching part ${index} of ${fetchLimit}...`)
                messages.map(msg => {
                    if (msg.content != '' && msg.author.id === userId && !msg.content.startsWith('http'))
                        msgs.push(msg.content.endsWith('.') || msg.content.endsWith('?') || msg.content.endsWith('!') ? msg.content : `${msg.content}.`)
                    })
                if (index <= fetchLimit) {
                    setTimeout(() => fetchMoar(index + 1, messages.lastKey()), 1000);
                }
                else
                    finish()
                })
            .catch(err => console.log(err));
    }
    
    const finish = () => {
        const normalizedMsgs = uniq(msgs)
            .map(msg => ({ [userName]: msg }));
        mongo.insertMany('vitas', userName, normalizedMsgs, err =>
            err
                ? console.log(err)
                : null
        )
        msg.channel.send('Done!');
        msg.channel.stopTyping();
    }
    msg.channel.startTyping();
    fetchMoar(0, null);
}
export const fetchlocal = (msg:Discord.Message) => {
    msg.channel.startTyping();

    let logs;
    let filtered;
    try { 
        logs = require('../../data.json');
    }
    catch(err) { 
        log.WARN(err);
        msg.channel.send('Data file not found.');
        return;
    }

    if (logs.length > 0 && typeof logs[0] === 'string') { // just an array of quotes
        filtered = logs
            .map(msg => msg.endsWith('.') || msg.endsWith('?') || msg.endsWith('!') ? msg : `${msg}.`);
    }
    else { // object fetched from Discord's search function
        const userId = '361185720477679616';
        const flattened = logs.map(log => flatten(log.messages));
        const flattenedMore = flatten(flattened);
        filtered = flattenedMore
            .filter(msg => msg.author.id === userId && msg.content != '' && !msg.content.startsWith('http'))
            .map(msg => msg.content.endsWith('.') || msg.content.endsWith('?') || msg.content.endsWith('!') ? msg.content : `${msg.content}.`);
    }
    const normalizedMsgs = uniq(filtered);
    normalizedMsgs.map(msg => mongo.insertData('vitas', 'vitas', 'vitas', msg, err =>
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
    const chanceToSwapNouns = cache["options"] 
        ? cache["options"] .find(option => option.option === 'chanceToSwapNouns').value 
        : 30;
    const chanceToSwapProperNouns = cache["options"] 
        ? cache["options"].find(option => option.option === 'chanceToSwapProperNouns').value 
        : 55;
    const chanceToSwapNicknames = cache["options"]
        ? cache["options"] .find(option => option.option === 'chanceToSwapNicknames').value 
        : 30;
    const options = {
        maxTries: 50,
        maxLength: 300,
        minWords: 2,
        prng: Math.random,
        filter: result => result.string.endsWith('.')
    }
    // @ts-ignore:next-line
    let invoker:{id:string, name:string, summons:number} = await mongo.getDocument('vitas', 'invokers', { id: msg.author.id });
    if (!invoker)
        invoker = ({ 
            id: msg.author.id,
            name: msg.author.username,
            summons: 0
        });
    let content = '';
    const usersTalking:string[] = [];
    const updatedInvoker = { ...invoker, summons: invoker.summons + 1 };

    mongo.upsertOne('vitas', 'invokers', { id: msg.author.id }, updatedInvoker, err => err && log.WARN(err));

    await msg.channel.fetchMessages({ limit: 10, before: msg.id })
        .then(async messages => {
            const limit = reaction ? sentencesReaction : sentencesCommand;
            for (let i = 0; i < limit; i++) 
                content += await markov.corpus.generate(options).string + ' ';
            
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
            msg.channel.stopTyping();
            msg.channel.send(content);
        })
        .catch(err => {
            console.trace(err)
            msg.channel.stopTyping();
        });
}
export const invokers = async (msg:Discord.Message) => {
    let invokers = await mongo.getCollection('vitas', 'invokers');
    if (!invokers) {
        msg.channel.send('Something went wrong.');
        return;
    }
    msg.channel.startTyping();
    const top = 10;
    invokers = orderBy(invokers, ['summons'], ['desc']).slice(0, top);
    let content = '';
    // @ts-ignore:next-line
    invokers.map((invoker, index) => content = `${content}\`\`${index + 1}.\`\` __${invoker.name}__ - **${invoker.summons}** summons\n`);
    const embed = createEmbed(`Top ${top} Vitas summoners`, [{ title: '\_\_\_', content }])
    msg.channel.send(embed);
    msg.channel.stopTyping();
}


// this is not added to the list of commands
export const getInvokers = (msg:Discord.Message) => {
    msg.channel.startTyping();

    let logs;
    try { 
        logs = require('../../data.json');
    }
    catch(err) { 
        log.WARN(err);
        msg.channel.send('Data file not found.');
        return;
    }
    type TFinal = {
        name: string,
        summons: number,
        id: string
    }
    const final:TFinal[] = [];
    const flattened = logs.map(log => flatten(log.messages));
    const flattenedMore = flatten(flattened);
    let filtered = flattenedMore
        .filter(msg => msg.embeds && msg.embeds[0] && msg.embeds[0].fields && msg.embeds[0].fields[1] && msg.embeds[0].fields[1].value.startsWith("```$vitas"))
        .map(msg => {
            let name = msg.embeds[0].fields[0].value;
            name = name.substring(name.indexOf('**Author:** ') + 12, name.indexOf('#')).trim();
            return {
                id: msg.id,
                name: name
                }
            }
        );
    filtered = uniqBy(filtered, 'id')
        .map(msg => {
            const alreadyExists = final.findIndex(user => user.name === msg.name);
            if (alreadyExists === -1)
                final.push({
                    name: msg.name,
                    summons: 1,
                    id: ""
                })
            else 
                final[alreadyExists] = {
                    name: msg.name,
                    summons: final[alreadyExists].summons + 1,
                    id: ""
                }
        });
    mongo.insertMany('vitas', 'invokers', final, err =>
        err
            ? console.log(err)
            : null
    )
    msg.channel.send('Done!');
    msg.channel.stopTyping();
}