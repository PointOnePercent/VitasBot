import Markov from 'markov-strings';
import { mongo } from './mongo';

let markovCorpus;

class MarkovCorpus {
    public corpus: any;
    public chanceToSwapNicknames: 30; //those things don't refresh now
    public chanceToSwapNouns: 55;
    public chanceToSwapProperNouns: 30;

    constructor() {        
        if (markovCorpus)
            return markovCorpus;
        markovCorpus = this;
        return markovCorpus;
    }

    init = async () => {
        const options:any = await mongo.getCollection('vitas', 'options');
        const vitas:any = await mongo.getCollection('vitas', 'vitas');
        const stateSize = options.find(option => option.option === 'stateSize') 
            ? options.find(option => option.option === 'stateSize').value 
            : 2;
        const data = vitas.map(v => v.vitas);

        this.corpus = new Markov(data, { stateSize });
        this.corpus.buildCorpus();
        this.chanceToSwapNouns = options.find(option => option.option === 'chanceToSwapNouns') 
            ? options.find(option => option.option === 'chanceToSwapNouns').value 
            : 30;
        this.chanceToSwapProperNouns = options.find(option => option.option === 'chanceToSwapProperNouns') 
            ? options.find(option => option.option === 'chanceToSwapProperNouns').value 
            : 55;
        this.chanceToSwapNicknames = options.find(option => option.option === 'chanceToSwapNicknames') 
            ? options.find(option => option.option === 'chanceToSwapNicknames').value 
            : 30;
    }
}

export const markov = new MarkovCorpus();