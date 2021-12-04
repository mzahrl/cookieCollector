require('dotenv').config();
const tmi = require('tmi.js');
const {Translate} = require('@google-cloud/translate').v2;
require('dotenv').config();
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const mariadb = require('mariadb');

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

//Initialize Pool
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_USER_PW,
    database: process.env.DB_NAME,
    connectionLimit: 100,
});


const client = new tmi.client(options);

client.connect();

let bossArray = [];
let boss = false;
let entries = {};
let currentBoss;
let reminderMap;
let afkMap;
let reminder;
let fullReminderMessage;
let gnMap;
let commandCooldownSet;
let languages;
let con;

// Configuration for the client
const translate = new Translate({
    credentials: GOOGLE_CREDENTIALS,
    projectId: GOOGLE_CREDENTIALS.project_id
});



client.on('connected', (address, port) => {
    reminderMap = new Map();
    afkMap = new Map();
    gnMap = new Map();
    commandCooldownSet = new Set();
});

client.on('message', (channel, tags, message, self) => {
    if (tags.username.toLowerCase() === process.env.BOT_USERNAME.toLowerCase()) {
        return;
    }
    //check if the user was inactive
    userWasInactive(client, channel, tags);
    const words = message.split(' ');
    if (words[0] === '$afk') {
        const message = words.slice(1).join(' ');
        setInactive(client, channel, tags, message, 'afk');
    }
    if (words[0] === '$rafk') {
        inactiveAgain(client, channel, tags);
    }
});

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

// Fetch Connection
async function fetchConn() {
    let conn = await pool.getConnection();
    return conn;
}

/*
//Get list of contacts
async function get_contacts(conn) {
    return await conn.query("SELECT * FROM Inactive");
}

async function insertIntoDB(conn, sql) {
    return await conn.query(sql);
}

async function main() {
    let conn;

    try {
        conn = await fetchConn();

        // Use Connection
        var rows = await get_contacts(conn);
        for (i = 0, len = rows.length; i < len; i++) {
            console.log(`${rows[i]}`);
        }
    } catch (err) {
        // Manage Errors
        console.log(err);
    } finally {
        // Close Connection
        if (conn) conn.end();
    }
}

 */
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