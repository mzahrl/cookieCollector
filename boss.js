require('dotenv').config();
const tmi = require('tmi.js');

const mariadb = require('mariadb');
const fs = require('fs');


const request = require('superagent');

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
    connectionLimit: 70,
});

let streamerURL = 'https://api.twitch.tv/helix/streams?user_id='
const post = 'https://id.twitch.tv/oauth2/token?client_id=' + process.env.CLIENT_ID + '&client_secret=' + process.env.CLIENT_SECRET + '&grant_type=client_credentials';

let channels = [];
const channelMap = new Map();
getChannels(channels);
let bossArray = [];
let boss = false;
let entries = {};
let currentBoss;

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
    channels: channels
};

const client = new tmi.client(options);
let commandCooldownSet;
let offlineMap;
const helpLink = 'https://docs.google.com/document/u/1/d/e/2PACX-1vQeYcqlXw7KUl5ICdBv2dH_wqNEzebX0RbqbYrNp56h7TkLf8aRt2r9SLcZPPCnUp_-I1pQO73EKjt6/pub';


client.connect()

client.on('connected', (address, port) => {
    commandCooldownSet = new Set();
    offlineMap = new Map();
    initializeBossArray();
});

setInterval(bossAppeared, 10000);

try {
    client.on('message', (channel, tags, message, self) => {
        if (!messageValidator(message) || tags.username.toLowerCase() === process.env.BOT_USERNAME.toLowerCase()) {
            return;
        }
        let channelPrefix = channelMap.get(channel.substring(1)).prefix;
        message = cleanUpMessage(message);

        const words = message.split(' ');
        if (words[0] === channelPrefix + "boss") {
            if (boss) {
                entries[tags.username] = tags.username;
                client.say(channel, `You have joined the fight @${tags.username}`);
            }
        }

        if (words[0] === channelPrefix + "leaderboard") {
            getLeaderBoard(client, channel, tags);
        }
        if (words[0] === channelPrefix + "rank") {
            getBossRank(client, channel, tags);
        }
    });
} catch (err) {
    console.log(err);
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

function bossAppeared() {
    streamerIsOffline(channelMap.keys().next().value).then((res) => {
        if (!res && res !== undefined) {
            boss = true;
            currentBoss = bossArray[Math.floor(Math.random() * bossArray.length)];
            client.action('#' + channelMap.keys().next().value, `${currentBoss.name} has appeared, type ${channelMap.values().next().value.prefix}boss to join the fight`);
            setTimeout(() => {
                bossDisappear();
            }, 4000);
        }
    });
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
                        offlineMap.set(channel, true);
                        return new Promise((resolve => { resolve(true)}));
                    } else {
                        offlineMap.set(channel, false);
                        return new Promise((resolve => { resolve(false)}));
                    }
                });
            });
        });
    } else {
        return new Promise((resolve => { resolve(offlineMap.get(channel))}));
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

async function getChannels(channels) {
    let conn;
    try {
        conn = await fetchConn();
        const rows = await conn.query("SELECT * FROM Channels WHERE stalkOnly=false AND name='mande'");
        for (let i = 0; i < rows.length; i++) {
            /*
            channels.push('#' + rows[i].name);
            channelMap.set(rows[i].name, rows[i]);

             */
            channels.push('#punlshment');
            channelMap.set('punlshment', rows[i]);
        }
    } catch (err) {
        // Manage Errors
        console.log(err);
    } finally {
        // Close Connection
        if (conn) conn.end();
    }
}

function initializeBossArray() {
    bossArray.push(new Boss('Maode the great leader', 1000, 10000, 10, '', '', ''));
    bossArray.push(new Boss('RPR master of weebs', 100, 1000, 20, '', '',''));
    bossArray.push(new Boss('ImperialHal', 100, 1200, 15, '', '', ''));
    bossArray.push(new Boss('EMoney Swag', 10, 100, 20, '', 'paiN', ''));
    bossArray.push(new Boss('DrDisRespect DOCING', 200, 2000, 15, 'DocSleep ', 'docnotL', 'docWhat'));
    bossArray.push(new Boss('BatChest giver of chills', 50, 500, 20, '', '', 'batPls'));
    bossArray.push(new Boss('GIGACHAD', 500, 6000, 10, '', '', ''));
    bossArray.push(new Boss('Homeless swedish hobo forsenScotts', 400, 5000, 15, ' forsenLaughingAtYou ', 'forsenThinking', ' forsenLaughingAtYou '));
    bossArray.push(new Boss('Travis Scott SadChamp', 300, 3500, 20, '', '', ''));
}

class Boss {
    constructor(name, powerLevel, points, maxSurvivors, noEntries, fullWipe, undefeated) {
        this.name = name;
        this.powerLevel = powerLevel;
        this.points = points;
        this.maxSurvivors = maxSurvivors;
        this.noEntries = noEntries;
        this.fullWipe = fullWipe;
        this.undefeated = undefeated;
    }
}

function bossDisappear() {
    if(boss) {
        boss = false;
        /*
        for (let i = 1; i <= 20; i++) {
            entries['t' + i] = 't' + i;
        }
         */
        fightResults();
        entries = {};
    }
}

function fightResults() {
    const entriesArr = Object.values(entries);
    if(entriesArr.length === 0) {
        client.action('#' + channelMap.keys().next().value, `No one stood up to ${currentBoss.name} ${currentBoss.noEntries} !`);
    } else {
        let winnerSet = new Set();
        //currentBoss = new Boss('maode', 50, 100, 5);
        const fightProb = entriesArr.length / currentBoss.powerLevel;
        console.log('fightProb=' +fightProb);
        for (let i = 0; i < currentBoss.maxSurvivors; i++) {
            const winProb = Math.floor(Math.random() * 101) / 100;
            console.log('winProb=' + winProb);
            if (fightProb >= winProb && winProb !== 1) {
                winnerSet.add(entriesArr[Math.floor(Math.random() * entriesArr.length)]);
            }
        }
        let outputString = ``;
        const survRatio = winnerSet.size / currentBoss.maxSurvivors;
        if (survRatio === 1) {
            outputString += `The squad ganged up on ${currentBoss.name} ${currentBoss.fullWipe},`;
        } else if (survRatio > 0.5) {
            outputString += `The squad fought evenly against ${currentBoss.name},`;
        } else if (survRatio === 0) {
            outputString += `${currentBoss.name} wiped the floor with the squad and left no one Standing  ${currentBoss.undefeated}`;
        } else {
            if (winnerSet.size > 1) {
                outputString += `Only some people survived the encounter with ${currentBoss.name},`;
            } else {
                outputString += `Only one person survived the encounter with ${currentBoss.name},`;
            }
        }
        if (winnerSet.size > 1) {
            outputString += ' survivors: '
        } else if (winnerSet.size === 1) {
            outputString += ' lone survivor: '
        }
        //const winnerSet = new Set(winners);
        winnerSet.forEach(winner => {
            outputString += `${winner} (${currentBoss.points} points) | `;
            setPoints(winner, channelMap.keys().next().value, currentBoss.points);
        });
        outputString = outputString.substring(0, outputString.length - 2);
        client.say('#' + channelMap.keys().next().value, outputString);
    }
}

async function setPoints(name, channel, points) {
    let conn;

    try {
        conn = await fetchConn();

        await conn.query("INSERT INTO Boss_Points (username, channel, points) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE points=points+?",
            [name, channel, points, points],
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

async function getLeaderBoard(client, channel, tags) {
    let conn;

    try {
        conn = await fetchConn();

        const rows = await conn.query("SELECT * FROM Boss_Points b ORDER BY b.points DESC LIMIT 10");
        let leaderBoard = '';
        for (let i = 0; i < rows.length; i++) {
            leaderBoard += i+1 + ': ' + rows[i].username + ' (' + rows[i].points + '), ';
        }
        leaderBoard = leaderBoard.slice(0, -2);
        client.say(channel, `@${tags.username} ${leaderBoard}`);
    } catch (err) {
        // Manage Errors
        console.log(err);
    } finally {
        // Close Connection
        if (conn) conn.end();
    }
}

async function getBossRank(client, channel, tags) {
    let conn;

    try {
        conn = await fetchConn();

        const rows = await conn.query("SELECT * FROM (SELECT *, RANK() OVER ( ORDER BY points DESC) rank_no FROM Boss_Points) br WHERE br.username=?", tags.username);
        if (rows.length === 0) {
            client.say(channel, `@${tags.username} you have not participated in a fight yet!`);
        } else {
            client.say(channel, `@${tags.username} you are currently rank ${rows[0].rank_no} with ${rows[0].points} points`);
        }
    } catch (err) {
        // Manage Errors
        console.log(err);
    } finally {
        // Close Connection
        if (conn) conn.end();
    }
}