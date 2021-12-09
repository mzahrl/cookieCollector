require('dotenv').config();
const tmi = require('tmi.js');

const tchannel = '#ThePositiveBot';

const options = {
    options: {
        debug: true,
    },
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: 'punlshment',
        password: 'oauth:xl8l1bw4pntzgkkukmd36fwnv3mwlv'
    },
    channels: [tchannel]
};

const client = new tmi.client(options);

client.connect()

client.on('connected', (address, port) => {
    //get cookie every 2h1m
    getCookie();
});

setInterval(getCookie, 7260000);

function getCookie() {
    client.say(tchannel, `!cookie`)
}
