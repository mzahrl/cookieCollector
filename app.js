require('dotenv').config();
const tmi = require('tmi.js');

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
    channels: [ process.env.CHANNEL_NAME ]
};

const client = new tmi.client(options);

client.connect();

let bossArray = [];
let boss = false;
let entries = {};
let currentBoss;


setInterval(bossAppeared, 10000);

client.on('connected', (address, port) => {
    client.action(process.env.CHANNEL_NAME , 'Hello, ' + process.env.BOT_USERNAME + ' is now connected');
    initializeBossArray();
});

client.on('message', (channel, tags, message, self) => {
    const command = message.split(' ').shift().toLowerCase();
    console.log(command);
    if (command === '!boss') {
        if (boss) {
            entries[tags.username] = tags.username;
            client.action(channel, `You have joined the fight @${tags.username}`);
        }
        else client.action(channel, `No boss has appeared @${tags.username}`);
    } else if(command === '!currentBoss') {
        if (boss) {
            client.action(channel, `The current boss is ${currentBoss.name} @${tags.username}`);
        }
        else client.action(channel, `No boss has appeared @${tags.username}`);
    } else if(command === '!commands') {
        client.action(channel, `This bot obeys the commands: !boss, !currentBoss !leaderboard and !commands @${tags.username}`);
    } else if(command === '!leaderboard') {
        //TODO: Update leaderboard command when databse implemented
        client.action(channel, `Leaderboards soon TM COPIUM @${tags.username}`);
    }
});

function bossAppeared() {
    boss = true;
    currentBoss = bossArray[Math.floor(Math.random() * bossArray.length)];
    client.action(process.env.CHANNEL_NAME, `${currentBoss.name} has appeared, type !boss to join the fight`);
    setInterval(bossDisappear, 4900);
}

function bossDisappear() {
    if(boss) {
        client.action(process.env.CHANNEL_NAME, 'Bossfight time!');
        boss = false;
        fightResults();
        entries = {};
    }
}

function fightResults() {
    const entriesArr = Object.values(entries);
    if(entriesArr.length === 0) {
        client.action(process.env.CHANNEL_NAME, `No one stood up to the ${currentBoss.name}!`);
    } else {
        let winners = [];
        currentBoss = new Boss('maode', 2, 100);
        for (let i = 0; i < currentBoss.survivors; i++) {
            winners.push(entriesArr[Math.floor(Math.random() * entriesArr.length)]);
        }
        const winnerSet = new Set(winners);
        let outputString = `Survivors:`;
        winnerSet.forEach(winner => {
            outputString += ` @${winner} (${currentBoss.points} points)`;
            //TODO: write here to the database
        });
        client.action(process.env.CHANNEL_NAME, outputString);
    }
}

function initializeBossArray() {
    bossArray.push(new Boss('maode', 2, 500));
    bossArray.push(new Boss('emptyFjeld', 2, 500));
}

class Boss {
    constructor(name, survivors, points) {
        this.name = name;
        this.survivors = survivors;
        this.points = points;
    }
}