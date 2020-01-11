import Discord from 'discord.js';

type IBotCache = {
    bot?: Discord.Client,
    options?: []
}

let botCache:IBotCache = {
    bot: undefined,
    options: undefined
};

class BotCache {
    constructor() {
        if (botCache)
            return botCache;
        botCache = this;

        return botCache;
    }
}

export let cache = new BotCache();