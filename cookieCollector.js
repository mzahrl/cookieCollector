require('dotenv').config();
const tmi = require('tmi.js');

const tchannel = process.env.TWITCH_CHANNEL;

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

//get cookie every 2h1m
setInterval(getCookie, 7260000);

function getCookie() {
    client.say(tchannel, `${process.env.CHANNEL_PREFIX}cookie`)
}
