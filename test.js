require('dotenv').config();
const tmi = require('tmi.js');
const {Translate} = require('@google-cloud/translate').v2;
const mariadb = require('mariadb');
const fs = require('fs');

const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const request = require('superagent');
const connect4_parser = require('./games/connect4Parser');
let bId;

const header = {
    'Client-ID': process.env.CLIENT_ID,
    'Authorization': 'Bearer'
};

//Initialize Pool
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_USER_PW,
    database: process.env.DB_NAME,
    connectionLimit: 100,
});

let streamerURL = 'https://api.twitch.tv/helix/streams?user_id='
const post = 'https://id.twitch.tv/oauth2/token?client_id=' + process.env.CLIENT_ID + '&client_secret=' + process.env.CLIENT_SECRET + '&grant_type=client_credentials';
const archillect = 'https://archillect.com/';

let channels = [];
getChannels(channels);

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
    channels: [ '#punlshment']
};

const client = new tmi.client(options);
let commandCooldownSet;
let onlineMap;
let languages;
const eightBallAnswers = ["It is certain.", "It is decidedly so.",
    "Without a doubt.", "Yes, definitely.", "You may rely on it.", "As I see it, yes.", "Most likely.",
    "Outlook good.", "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.",
    "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.", "Don't count on it.",
    "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful."];
const helpLink = 'https://docs.google.com/document/u/1/d/e/2PACX-1vQeYcqlXw7KUl5ICdBv2dH_wqNEzebX0RbqbYrNp56h7TkLf8aRt2r9SLcZPPCnUp_-I1pQO73EKjt6/pub';
let streamerOffline = false;

// Configuration for the client
const translate = new Translate({
    credentials: GOOGLE_CREDENTIALS,
    projectId: GOOGLE_CREDENTIALS.project_id
});

client.connect()

client.on('connected', (address, port) => {
    commandCooldownSet = new Set();
    onlineMap = new Map();
    fetchLanguages();
});

try {
    client.on('message', (channel, tags, message, self) => {
        if (!messageValidator(message) || tags.username.toLowerCase() === process.env.BOT_USERNAME.toLowerCase()) {
            return;
        }
        message = cleanUpMessage(message);
        setLastMessage(channel.substring(1), tags, message);
        userHasReminders(client, channel, tags);
        userWasInactive(client, channel, tags);

        const words = message.split(' ');
        if (words[0] === '$fuck') {
            if (words.length === 2 && words[1] !== '') {
                client.say(channel, `You fucked ${words[1]}'s brains out! gachiHYPER`);
            }
        }
        if (words[0] === '$remind') {
            if (words.length >= 3) {
                let recipient = words[1].toLowerCase();
                if (recipient.startsWith('@')) {
                    recipient = recipient.substring(1);
                }
                if (recipient !== (process.env.BOT_USERNAME).toLowerCase()) {
                    const message = words.slice(2).join(' ');
                    setReminder(client, channel, tags, recipient, message);
                }
            }
        }
        if (words[0] === '$afk') {
            setInactive(client, channel, tags, words.slice(1).join(' '), 'afk');
        }
        if (words[0] === '$gn') {
            setInactive(client, channel, tags, words.slice(1).join(' '), 'sleeping');
        }

        if (words[0] === '$shower') {
            setInactive(client, channel, tags, words.slice(1).join(' '), 'showering');
        }
        if (words[0] === '$rafk') {
            inactiveAgain(client, channel, tags);
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


        if (words[0] === '$fill') {
            const message = words.slice(1).join(' ');
            if (noWideEmotes(message)) {
                let fillMessage = "";
                while (fillMessage.length < (300 - message.length)) {
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
                    getLastMessage(client, channel, tags, user);
                }
            }
        }

        if (words[0] === '$8ball') {
            if (words.length >= 2) {
                const answer = eightBallAnswers[Math.floor(Math.random() * eightBallAnswers.length)];
                client.say(channel, `@${tags.username} ${answer}`);
            }
        }

        if (words[0] === '$help') {
            client.say(channel, `@${tags.username} ${helpLink}`);
        }
        if (words[0] === '$ra') {
            const pictureNumber = Math.floor(Math.random() * 356997);
            const outputMessage = archillect + pictureNumber;
            client.say(channel, `@${tags.username} ${outputMessage}`);
        }
        if (words[0] === '$suggestion') {
            fs.appendFile("suggestions.txt", tags.username + " " + words.slice(1).join(' ') + '\n', (err) => {
                if (err) console.log(err);
            });
            client.say(channel, `@${tags.username} I have forwarded the suggestion, thanks for your input.`);
        }
        if (words[0] === '$report') {
            fs.appendFile("report.txt", tags.username + " " + words.slice(1).join(' ') + '\n', (err) => {
                if (err) console.log(err);
            });
            client.say(channel, `@${tags.username} I have forwarded the bug/misuse, thank you for reporting it.`);
        }

        //TODO: maybe fix issue with then not working properly
        streamerIsOffline(channel.substring(1)).then((res) => {
            if (!res) {
                connect4_parser.connect4Checker(client, channel, tags, message, pool);
            }
        });
    });
} catch (err) {
    console.log(err);
}
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
        'FLASHBANG',
        'Wide'];
    for (let fillBan of fillBans) {
        if (message.includes(fillBan)) {
            return false;
        }
    }
    return true;
}

//check if the streamer is currently streaming
async function streamerIsOffline(channel) {
    //only check if once every 6 minutes
    if (!commandCooldownSet.has(channel)) {
        request.post(post).end((err, res) => {
            if (err) console.log(err);
            header.Authorization = 'Bearer ' + res.body.access_token;
            commandCooldownSet.add(channel);
            //set how long the token is valid
            setTimeout(() => {
                commandCooldownSet.delete(channel);
            }, (res.body.expires_in));
            getBIdFromName(channel).then(function(res) {
                request.get(streamerURL + res).set(header).end((err, res) => {
                    if (err) console.log(err);
                    if(res.body.data.length === 0) {
                        onlineMap.set(channel, false);
                        return new Promise((resolve => { resolve(true)}));
                    } else {
                        onlineMap.set(channel, true);
                        return new Promise((resolve => { resolve(false)}));
                    }
                });
            });
        });
    } else {
        return new Promise((resolve => { resolve(onlineMap.get(channel))}));
    }
}

async function setInactive(client, channel, tags, message, reason) {
    let conn;

    try {
        conn = await fetchConn();

        await conn.query("INSERT INTO Inactive (username, text, reason, active) VALUES (?, ?, ?, true) ON DUPLICATE KEY UPDATE text=?, reason=?, active=true, started=now()",
            [tags.username, message, reason, message, reason],
            function (err) {
                if (err) console.log(err);
            });
        client.say(channel, `@${tags.username} is now ${reason}: ${message}`);
    } catch (err) {
        // Manage Errors
        console.log(err);
    } finally {
        // Close Connection
        if (conn) conn.end();
    }
}

async function inactiveAgain(client, channel, tags) {
    let conn;

    try {
        conn = await fetchConn();
        const rows = await conn.query("SELECT * FROM Inactive WHERE username=?", [tags.username]);
        if (rows.length !== 0) {
            await conn.query("UPDATE Inactive SET active=true WHERE username=?", [tags.username]);
            client.say(channel, `@${tags.username} is now ${rows[0].reason} again: ${rows[0].text} `);
        }
    } catch (err) {
        // Manage Errors
        console.log(err);
    } finally {
        // Close Connection
        if (conn) conn.end();
    }
}

async function userWasInactive(client, channel, tags) {
    let conn;
    try {
        conn = await fetchConn();
        const rows = await conn.query("SELECT * FROM Inactive WHERE username=? AND active=true", [tags.username]);
        //user was inactive
        if (rows.length !== 0) {
            const timeString = timeStampGenerator(rows[0].started);
            client.say(channel, `@${tags.username} is no longer ${rows[0].reason}: ${rows[0].text} (${timeString})`);
            await conn.query("UPDATE Inactive SET active=false WHERE username=?", [tags.username]);
        }
    } catch (err) {
        // Manage Errors
        console.log(err);
    } finally {
        // Close Connection
        if (conn) conn.end();
    }
}

async function setReminder(client, channel, tags, recipient, message) {
    let conn;

    try {
        conn = await fetchConn();

        await conn.query("INSERT INTO Reminders (sender, recipient, text) VALUES (?, ?, ?)",
            [tags.username, recipient, message],
            function (err) {
                if (err) console.log(err);
            });
        client.say(channel, `@${tags.username} is will remind ${recipient} the next time they are in chat`);
    } catch (err) {
        // Manage Errors
        console.log(err);
    } finally {
        // Close Connection
        if (conn) conn.end();
    }
}

async function userHasReminders(client, channel, tags) {
    let conn;
    try {
        conn = await fetchConn();
        const rows = await conn.query("SELECT * FROM Reminders WHERE recipient=?", [tags.username]);
        let reminderMessage;
        if (rows.length > 1) {
            reminderMessage = 'reminders from';
        } else {
            reminderMessage = 'reminder from';
        }
        for (let i = 0; i < rows.length; i++) {
            reminderMessage += ' ' + rows[i].sender + ': ' + rows[i].text + ',';
        }
        if (rows.length !== 0) {
            reminderMessage = reminderMessage.slice(0, -1);
            client.say(channel, `@${tags.username} ${reminderMessage}`);
            await conn.query("DELETE FROM Reminders WHERE recipient=?", [tags.username]);
        }
    } catch (err) {
        // Manage Errors
        console.log(err);
    } finally {
        // Close Connection
        if (conn) conn.end();
    }
}

async function getBIdFromName(channel) {
    let conn;
    try {
        conn = await fetchConn();
        const rows = await conn.query("SELECT * FROM Channels WHERE name=?", channel);
        if (rows.length > 0) {
            return rows[0].bId;
        } else {
            return null;
        }
    } catch (err) {
        // Manage Errors
        console.log(err);
    } finally {
        // Close Connection
        if (conn) conn.end();
    }
}

// Fetch Connection
async function fetchConn() {
    let conn = await pool.getConnection();
    return conn;
}

async function setLastMessage(channel, tags, message) {
    let conn;

    try {
        conn = await fetchConn();

        await conn.query("INSERT INTO Last_Messages (username, channel, text) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE channel=?, text=?, sentAt=now()",
            [tags.username, channel, message, channel, message],
            function (err) {
                if (err) console.log(err);
            });
    } catch (err) {
        // Manage Errors
        console.log(err);
    } finally {
        // Close Connection
        if (conn) conn.end();
    }
}

async function getLastMessage(client, channel, tags, user) {
    let conn;
    try {
        conn = await fetchConn();
        const rows = await conn.query("SELECT * FROM Last_Messages WHERE username=?", [user]);
        if (rows.length !== 0) {
            const timeString = timeStampGenerator(rows[0].sentAt);
            client.say(channel, `@${tags.username} the user ${rows[0].username} was last seen in ${rows[0].channel}'s channel (${timeString} ago) their last message was: ${rows[0].text}`);
        } else {
            client.say(channel, `@${tags.username} I don't have the user ${user} logged in my system`);
        }
    } catch (err) {
        // Manage Errors
        console.log(err);
    } finally {
        // Close Connection
        if (conn) conn.end();
    }
}

async function getChannels(channels) {
    let conn;
    try {
        conn = await fetchConn();
        const rows = await conn.query("SELECT * FROM Channels WHERE stalkOnly=false");
        for (let i = 0; i < rows.length; i++) {
            channels.push('#' + rows[i].name);
        }
    } catch (err) {
        // Manage Errors
        console.log(err);
    } finally {
        // Close Connection
        if (conn) conn.end();
    }
}