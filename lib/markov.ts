import Markov from 'markov-strings';
import { log } from '../log';
import { mongo } from './mongo';

let markovCorpus;

class MarkovCorpus {
    public corpus: any;

    constructor() {        
        if (markovCorpus)
            return markovCorpus;
        markovCorpus = this;
        return markovCorpus;
    }

    init = async () => {
        log.INFO(`Building Markov chain corpus...`)
        const options:any = await mongo.getCollection('vitas', 'options');
        const vitas:any = await mongo.getCollection('vitas', 'vitas');
        const stateSize = options.find(option => option.option === 'stateSize') 
            ? options.find(option => option.option === 'stateSize').value 
            : 2;
        const data = vitas.map(v => v.vitas);

        this.corpus = new Markov(data, { stateSize });
        this.corpus.buildCorpus();
        log.INFO(`Markov chain corpus built!`);
    }
}

export const markov = new MarkovCorpus();