import Discord from "discord.js";
import Markov from 'markov-strings';
import nlp from 'compromise';
import { uniq, flatten } from 'lodash';
import { chooseRandom, happensWithAChanceOf } from '../rng';
import { createEmbed } from '../helpers';
import { insertData } from '../db';
import { log } from '../../log';
import { cache } from '../../cache';

// INITIALIZATION
let markovInit;
const initMarkov = async dataArrays => {
    const stateSize = 1;
    const data = [].concat(...dataArrays);
    markovInit = new Markov(data, { stateSize })
    markovInit.buildCorpus();
}
let nlpPlugin = (Doc, world, ) => {
    const customWords = cache["customWords"].map(word => ({ [word.word]: word.tag }));
    world.addWords(...customWords);
}
let normalize = (content, filterBy?) => {    
    nlp.extend(nlpPlugin);
    let prepare:nlp.Document = nlp(content);
    let normalized:any = prepare.normalize();
    let final:string = normalized.out('text');
    let nounObject:any = nlp(final)
        .nouns()
        .unique()
        .out('tags')
    if (filterBy) {
        let filtered = nounObject.map(noun => Object.entries(noun).map(([key, value]) => ({ key, value })));
        let filteredFlatten = flatten(filtered)
            .filter(noun => noun.value.includes(filterBy) 
                && !noun.value.includes('Demonym')
                && !noun.value.includes('Acronym')
                && !noun.value.includes('Honorific')
                && !noun.value.includes('IgnoreThis')
            )
        nounObject = filteredFlatten;
        let nounArray = nounObject.map(noun => noun.key);
        return nounArray;
    }
    else {
        let nounArray = nounObject.map(noun => Object.entries(noun).map(([key, value]) => key ));
        let flattenedNounArray = flatten(nounArray);
        return flattenedNounArray;
    }
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
        normalizedMsgs.map(msg => insertData('fetus', 'vitas', 'vitas', msg, err =>
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
export const vitas = async (msg:Discord.Message, reaction?) => {
    const sentencesCommand = 5;
    const sentencesReaction = 3;
    const options = {
        maxTries: 50,
        maxLength: 300,
        minWords: 2,
        prng: Math.random,
        filter: result => result.string.endsWith('.')
    }
    const normalizedMsgs:string[] = cache["vitas"].map(vitas => vitas.vitas);
    const chanceToSwapNouns = 30;
    const chanceToSwapProperNouns = 55;
    const chanceToSwapNicknames = 30;
    let content = '';

    msg.channel.startTyping();
    initMarkov(normalizedMsgs);

    if (reaction) { // Vitas was invoked by command //TOCHANGE - THERE SHOULD BE !reaction
        for (let i = 0; i < sentencesCommand; i++) 
            content += await markovInit.generate(options).string + ' ';
        const embed = createEmbed(`Vitas says`, [{ title: '\_\_\_', content }])
        msg.channel.send(embed)
        msg.channel.stopTyping();
    }
    else { // Vitas was invoked by reaction
        const usersTalking:string[] = [];
        await msg.channel.fetchMessages({ limit: 10, before: msg.id })
            .then(async messages => {
                for (let i = 0; i < sentencesReaction; i++) 
                    content += await markovInit.generate(options).string + ' ';
                console.log(`original: ${content}`)
                messages = messages.filter(message => !message.author.bot);
                messages.map(message => usersTalking.push(message.author.username));

                let aggregatedMessages = messages.reduce((acc, value) => `${acc}. ${value}`);
                let recentNouns = normalize(aggregatedMessages);
                let vitasNouns = normalize(content);
                let recentProperNouns = normalize(aggregatedMessages, 'ProperNoun');
                let vitasProperNouns = normalize(content, 'ProperNoun');

                console.log("vitasNouns");
                console.log(vitasNouns);
                vitasNouns.map(nounToSwap => {
                    if (happensWithAChanceOf(chanceToSwapNouns)) {
                        const replaceWith = chooseRandom(recentNouns);
                        content = content.replace(nounToSwap, replaceWith);
                    }
                })
                console.log("vitasProperNouns")
                console.log(vitasProperNouns)
                vitasProperNouns.map(properNounToSwap => {
                    if (happensWithAChanceOf(chanceToSwapProperNouns)) {
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
            })
            .catch(err => log.WARN(err));
        msg.channel.send(content)
        msg.channel.stopTyping();        
    }
}