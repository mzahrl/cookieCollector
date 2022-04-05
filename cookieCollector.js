require('dotenv').config();
const tmi = require('tmi.js');

const tchannel = process.env.TWITCH_CHANNEL;
//get cookie every 2h1m
let cookieTimer = setInterval(getCookie, 7260000);
let cdrAvailable = true;

const options = {
    options: {
        debug: true,
    },
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: process.env.TWITCH_USERNAME,
        password: process.env.TWITCH_OAUTH_TOKEN
    },
    channels: [tchannel]
};

const client = new tmi.client(options);

client.connect()

client.on('connected', (address, port) => {
    //get cookie every 2h1m
    getCookie();
});

function getCookie() {
    client.say(tchannel, `${process.env.CHANNEL_PREFIX}cookie`);
    //check if cdr is available
    if (process.env.CDR === "Y" && cdrAvailable) {
        cdr();
    }
}

async function cdr() {
    await sleep(10000);
    client.say(tchannel, `${process.env.CHANNEL_PREFIX}cdr`);
    cdrAvailable = false;
    setTimeout(() => {
        cdrAvailable = true;
    }, 10800000);
    await sleep(10000);
    client.say(tchannel, `${process.env.CHANNEL_PREFIX}cookie`);
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}