require('dotenv').config();
const tmi = require('tmi.js');
const {Translate} = require('@google-cloud/translate').v2;
require('dotenv').config();
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const request = require('superagent');
const connect4_parser = require('./connect4Parser');
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
let bId;

const header = {
    'Client-ID': client_id,
    'Authorization': 'Bearer'
};
let streamerURL = 'https://api.twitch.tv/helix/streams?user_id='
const post = 'https://id.twitch.tv/oauth2/token?client_id=' + client_id + '&client_secret=' + client_secret + '&grant_type=client_credentials';

const options = {
    options: {
        debug: true,
    },
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: process.env.BOT_USERNAME,
        password: process.env.OAUTH_TOKEN
    },
    channels: [ '#punlshment' ]
};

const client = new tmi.client(options);

client.connect();

let reminderMap;
let afkMap;
let showerMap;
let lastMessageMap;
let reminder;
let fullReminderMessage;
let gnMap;
let commandCooldownSet;
let languages;
const eightBallAnswers = ["It is certain.", "It is decidedly so.",
    "Without a doubt.", "Yes, definitely.", "You may rely on it.", "As I see it, yes.", "Most likely.",
    "Outlook good.", "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.",
    "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.", "Don't count on it.",
    "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful."];
const helpLink = 'link will come soon tm';
let streamerOffline = false;

// Configuration for the client
const translate = new Translate({
    credentials: GOOGLE_CREDENTIALS,
    projectId: GOOGLE_CREDENTIALS.project_id
});



client.on('connected', (address, port) => {
    reminderMap = new Map();
    afkMap = new Map();
    gnMap = new Map();
    showerMap = new Map();
    lastMessageMap = new Map();
    commandCooldownSet = new Set();
    fetchLanguages();
    getBroadcasterId();
});

client.on('message', (channel, tags, message, self) => {
    setLastMessage(tags.username, message);
    if (!messageValidator(message) || tags.username.toLowerCase() === process.env.BOT_USERNAME.toLowerCase()) {
        return;
    }
    message = cleanUpMessage(message);

    if (afkMap.has((tags.username))) {
        const afkMessage = afkMap.get(tags.username);
        if (!afkMessage.startsWith('?!?')) {
            const messageParts = afkMessage.split(' ');
            const start = messageParts[0];
            const timeString = timeStampGenerator(start);
            const originalMessage = messageParts.slice(1).join(' ');
            client.say(channel, `@${tags.username} is no longer afk: ${originalMessage} (${timeString})`);
            afkMap.set(tags.username, ('?!?' + afkMessage));
        }
    }

    if (gnMap.has((tags.username))) {
        const gnMessage = gnMap.get(tags.username);
        if (!gnMessage.startsWith('?!?')) {
            const messageParts = gnMessage.split(' ');
            const start = messageParts[0];
            const timeString = timeStampGenerator(start);
            const originalMessage = messageParts.slice(1).join(' ');
            client.say(channel, `@${tags.username} is no longer sleeping: ${originalMessage} (${timeString})`);
            gnMap.set(tags.username, ('?!?' + gnMessage));
        }
    }

    if (showerMap.has((tags.username))) {
        const showerMessage = showerMap.get(tags.username);
        const messageParts = showerMessage.split(' ');
        const start = messageParts[0];
        const timeString = timeStampGenerator(start);
        const originalMessage = messageParts.slice(1).join(' ');
        client.say(channel, `@${tags.username} is no longer showering: ${originalMessage} (${timeString})`);
        showerMap.delete(tags.username);
    }

    reminder = false;
    fullReminderMessage = '';
    let senderUser = tags.username.toLowerCase();
    while (reminderMap.has(senderUser)) {
        reminder = true;
        const remindermessage = reminderMap.get(senderUser);
        const sender = remindermessage.split(' ');
        const message = sender.slice(1).join(' ');
        fullReminderMessage = fullReminderMessage + ' reminder from ' + sender[0] + ': ' + message;
        //client.say(channel, `@${tags.username} reminder from ${sender[0]}: ${message}`);
        reminderMap.delete(senderUser);
        senderUser = senderUser + '_';
    }
    if (reminder) {
        client.say(channel, `@${tags.username} ${fullReminderMessage}`);
    }

    const words = message.split(' ');
    if (words[0] === '$fuck') {
        if (words.length === 2 && words[1] !== '') {
            client.say(channel, `You fucked ${words[1]}'s brains out! gachiHYPER`);
        }
    }
    if (words[0] === '$remind') {
        if (words.length >= 3) {
            let user = words[1].toLowerCase();
            if (user.startsWith('@')) {
                user = user.substring(1);
            }
            if (user !== (process.env.BOT_USERNAME).toLowerCase()) {
                let sender = tags.username;
                const message = sender + ' ' + words.slice(2).join(' ');
                reminderMap.set(user, message);
                client.say(channel, `@${tags.username} I will remind ${user} the next time they are in chat`);
                while (reminderMap.has(user)) {
                    user = user + '_';
                }
            }
        }
    }
    if (words[0] === '$afk') {
        const start = Date.now();
        const message = words.slice(1).join(' ');
        afkMap.set(tags.username, start + ' ' + message);
        client.say(channel, `@${tags.username} is now afk: ${message}`);
    }
    if (words[0] === '$rafk') {
        let afkMessage;
        let gnMessage;
        let hasAfk = false;
        let hasGn = false;
        if (afkMap.has(tags.username)) {
            hasAfk = true;
            afkMessage = afkMap.get(tags.username);
            afkMessage = afkMessage.substring(3);
        }
        if (gnMap.has(tags.username)) {
            hasGn = true;
            gnMessage = gnMap.get(tags.username);
            gnMessage = gnMessage.substring(3);
        }
        if (hasAfk && hasGn) {
            const gnTimeStamp = gnMessage.split(' ');
            const afkTimeStamp = afkMessage.split(' ');
            if (gnTimeStamp[0] > afkTimeStamp[0]) {
                hasAfk = false;
            } else {
                hasGn = false;
            }
        }
        if (hasAfk) {
            afkMap.set(tags.username, afkMessage);
            const messageParts = afkMessage.split(' ');
            const originalMessage = messageParts.slice(1).join(' ');
            client.say(channel, `@${tags.username} is now afk again: ${originalMessage}`);
        } else if (hasGn) {
            gnMap.set(tags.username, gnMessage);
            const messageParts = gnMessage.split(' ');
            const originalMessage = messageParts.slice(1).join(' ');
            client.say(channel, `@${tags.username} is now sleeping again: ${originalMessage}`);
        }
    }
    if (words[0] === '$tuck') {
        if (words.length >= 2 && words[1] !== '') {
            let user = words[1].toLowerCase();
            if (user.startsWith('@')) {
                user = user.substring(1);
            }
            if (user !== (process.env.BOT_USERNAME).toLowerCase()) {
                let sender = tags.username;

                client.say(channel, `@${tags.username} you tucked ${user} to bed Bedge`);
            }
        }
    }

    if (words[0] === '$gn') {
        const start = Date.now();
        const message = words.slice(1).join(' ');
        gnMap.set(tags.username, start + ' ' + message);
        client.say(channel, `@${tags.username} is now sleeping: ${message}`);
    }


    if (words[0] === '$fill') {
        const message = words.slice(1).join(' ');
        if (noWideEmotes(message)) {
            let fillMessage = "";
            while (fillMessage.length < (499 - message.length)) {
                fillMessage += ' ' + message;
            }
            /*
            for (let i = 0; i < 30; i++) {
                fillMessage += message;
            }

             */
            client.say(channel, `${fillMessage}`);
        }
    }

    if (words[0] === '$translate') {
        if (words.length >= 2) {
            let targetLanguageCode = 'en';
            let targetLanguageName = 'English'
            if (words[1].startsWith('to:')) {
                var BreakException = {};
                const requestedLanguage = words[1].substring(3);
                try {
                    languages.forEach((language) => {
                        if ((language.name).toLowerCase() === requestedLanguage.toLowerCase()) {
                            targetLanguageCode = language.code;
                            targetLanguageName = language.name;
                            throw BreakException;
                        }
                    });
                } catch (e) {
                    if (e !== BreakException) throw e;
                }
            }


            if (!commandCooldownSet.has('$translate')) {
                let message = words.slice(1).join(' ') + ' ';
                if (message.startsWith('to:')) {
                    message = words.slice(2).join(' ') + ' ';
                }
                translateMessage(message, targetLanguageCode).then((res) => {
                    client.say(channel, `@${tags.username} translated to ${targetLanguageName}: ${res}`);
                }).catch((err) => {
                    console.log(err);
                });
                commandCooldownSet.add('$translate');
                setTimeout(() => {
                    commandCooldownSet.delete('$translate');
                }, 15000);
            } else {
                client.say(channel, `@${tags.username} translated is on 15 seconds cooldown try again later`);
            }
        }
    }

    if (words[0] === '$stalk') {
        if (words.length >= 2 && words[1] !== '') {
            let user = words[1].toLowerCase();
            if (user.startsWith('@')) {
                user = user.substring(1);
            }
            if (user !== (process.env.BOT_USERNAME).toLowerCase() && user !== tags.username) {
                if (lastMessageMap.has(user)) {
                    const lastMessage = lastMessageMap.get(user);
                    const messageParts = lastMessage.split(' ');
                    const start = messageParts[1];
                    const timeString = timeStampGenerator(start);
                    client.say(channel, `@${tags.username} the user ${user} was last seen in ${messageParts[0].substring(1)}'s channel (${timeString} ago) their last message was: ${messageParts.slice(2).join(' ') + ' '}`);
                } else {
                    client.say(channel, `@${tags.username} I don't have ${user} logged in my system`);
                }
            }
        }
    }

    if (words[0] === '$shower') {
        const start = Date.now();
        const message = words.slice(1).join(' ');
        showerMap.set(tags.username, start + ' ' + message);
        client.say(channel, `@${tags.username} is now showering: ${message}`);
    }

    if (words[0] === '$8ball') {
        if (words.length >=2) {
            const answer = eightBallAnswers[Math.floor(Math.random()*eightBallAnswers.length)];
            client.say(channel, `@${tags.username} ${answer}`);
        }
    }

    if (words[0] === '$help') {
        client.say(channel, `@${tags.username} ${helpLink}`);
    }

    if (words[0] === '$ra') {
        const pictureNumber = Math.floor(Math.random() * 356997);
        const outputMessage = 'https://archillect.com/' + pictureNumber;
        client.say(channel, `@${tags.username} ${outputMessage}`);
    }

    if (words[0] === '$suggestion') {

    }

    if (words[0] === '$report') {

    }

    //offline section of bot
    if (streamerOffline) {
        connect4_parser.connect4Checker(client, channel, tags, message);
    }

});

const translateMessage = async (text, targetLanguage) => {
    try {
        let [response] = await translate.translate(text, targetLanguage);
        return response;
    } catch (error) {
        console.log(`Error at translateText --> ${error}`);
        return 0;
    }
};

async function detectLanguage(message) {
    let detections = await translate.detect(message);
    languages.forEach((language) => {
        if (language.code === detections[0].language) {
            return ('from ' + language.name + ' with a confidence of ' + detections[0].confidence + '%');
        }
    });
}

async function fetchLanguages() {
    [languages] = await translate.getLanguages();
}

async function setLastMessage(user, message) {
    const timeStamp = Date.now();
    const fullMessage = process.env.CHANNEL_NAME + " " + timeStamp + " " + message;
    lastMessageMap.set(user, fullMessage);
}

function timeStampGenerator(start) {
    const end = Date.now();
    let difference = end - start;
    const daysDifference = Math.floor(difference / 1000 / 60 / 60 / 24);
    difference -= daysDifference * 1000 * 60 * 60 * 24

    const hoursDifference = Math.floor(difference / 1000 / 60 / 60);
    difference -= hoursDifference * 1000 * 60 * 60

    const minutesDifference = Math.floor(difference / 1000 / 60);
    difference -= minutesDifference * 1000 * 60

    const secondsDifference = Math.floor(difference / 1000);

    let timeString = '';
    if (daysDifference > 0) timeString += daysDifference > 1 ? daysDifference + ' days ' : daysDifference + ' day ';
    if (hoursDifference > 0) timeString += hoursDifference > 1 ? hoursDifference + ' hours ' : hoursDifference + ' hour ';
    if (minutesDifference > 0) timeString += minutesDifference > 1 ? minutesDifference + ' minutes ' : minutesDifference + ' minute ';
    if (secondsDifference > 0) timeString += secondsDifference > 1 ? secondsDifference + ' seconds' : secondsDifference + ' second';
    if (timeString === '') timeString = '0 seconds'
    return timeString;
}

function cleanUpMessage(input) {
    let output = "";
    for (let i=0; i<input.length; i++) {
        if (input.charCodeAt(i) !== 56128 && input.charCodeAt(i) !== 56320) {
            output += input.charAt(i);
        }
    }
    if (output.endsWith(' ')) {
        output = output.substring(0, output.length - 1);
    }
    return output;
}

function messageValidator(message) {
    const badWords = ['anal',
        'anus',
        'arse',
        'ass',
        'ballsack',
        'balls',
        'bastard',
        'bitch',
        'biatch',
        'bloody',
        'blowjob',
        'blow job',
        'bollock',
        'bollok',
        'bum',
        'clitoris',
        'coon',
        'dildo',
        'dyke',
        'fag',
        'feck',
        'fellate',
        'fellatio',
        'felching',
        'fudgepacker',
        'fudge packer',
        'flange',
        'homo',
        'incel',
        'knobend',
        'knob end',
        'labia',
        'muff',
        'nigg',
        'prick',
        'pube',
        'queer',
        'retard',
        'scrotum',
        'simp',
        'slut',
        'smegma',
        'spunk',
        'turd',
        'whore'];
    message = message.toLowerCase();
    for (let word of badWords) {
        if (message.includes(word)) {
            return false;
        }
    }
    return true;
}

function noWideEmotes(message) {
    const fillBans = ['Joel',
        'THESE',
        'DIESOFCRINGE',
        'FLASHBANG',];
    for (let fillBan of fillBans) {
        if (message.includes(fillBan)) {
            return false;
        }
    }
    return true;
}

function streamerIsOffline() {
    //only check if once every 6 minutes
    if (!commandCooldownSet.has('streamerIsOffline')) {
        request.post(post).end((err, res) => {
            if (err) console.log(err);
            header.Authorization = 'Bearer ' +res.body.access_token;
            commandCooldownSet.add('streamerIsOffline');
            //set how long the token is valid
            setTimeout(() => {
                commandCooldownSet.delete('streamerIsOffline');
            }, (res.body.expires_in));
            request.get(streamerURL).set(header).end((err, res) => {
                if (err) console.log(err);
                if(res.body.data.length === 0) {
                    streamerOffline = true;
                    return streamerOffline;
                } else {
                    streamerOffline = false;
                    return streamerOffline
                }
            });
        });
    } else {
        return streamerOffline;
    }
    //check again if streamer is offline every 5 minutes
    setTimeout(() => {
        streamerIsOffline();
    }, 300000);
}

function getBroadcasterId() {
    const getUID = 'https://api.twitch.tv/helix/users?login=' + process.env.CHANNEL_NAME.substring(1);
    request.post(post).end((err, res) => {
        if (err) console.log(err);
        header.Authorization = 'Bearer ' +res.body.access_token;
        request.get(getUID).set(header).end((err, res) => {
            if (err) console.log(err);
            bId = res.body.data[0].id; //128856353
            streamerURL += bId;
            streamerIsOffline();
        });
    });
}

