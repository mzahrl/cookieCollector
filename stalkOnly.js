require('dotenv').config();
const tmi = require('tmi.js');
require('dotenv').config();
const mariadb = require('mariadb');



//Initialize Pool
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_USER_PW,
    database: process.env.DB_NAME,
    connectionLimit: 100,
});

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
    channels: channels
};

const client = new tmi.client(options);

client.connect()

client.on('connected', (address, port) => {

});

try {
    client.on('message', (channel, tags, message, self) => {
        if (!messageValidator(message) || tags.username.toLowerCase() === process.env.BOT_USERNAME.toLowerCase()) {
            return;
        }
        message = cleanUpMessage(message);
        setLastMessage(channel.substring(1), tags, message);
    });
} catch (err) {
    console.log(err);
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

async function getChannels(channels) {
    let conn;
    try {
        conn = await fetchConn();
        const rows = await conn.query("SELECT * FROM Channels WHERE stalkOnly=true");
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