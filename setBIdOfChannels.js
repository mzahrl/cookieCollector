require('dotenv').config();
const mariadb = require('mariadb');
const request = require('superagent');
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

const post = 'https://id.twitch.tv/oauth2/token?client_id=' + process.env.CLIENT_ID + '&client_secret=' + process.env.CLIENT_SECRET + '&grant_type=client_credentials';

async function getAndUpdateBroadcasterId(channel, isLast) {
    const getUID = 'https://api.twitch.tv/helix/users?login=' + channel;
    request.post(post).end((err, res) => {
        if (err) console.log(err);
        header.Authorization = 'Bearer ' +res.body.access_token;
        request.get(getUID).set(header).end((err, res) => {
            if (err) console.log(err);
            bId = res.body.data[0].id; //128856353
            setBroadCasterId(channel, bId);
            if (isLast) {
                process.exit(0);
            }
        });
    });
}

async function setBroadCasterId(channel, bId) {
    let conn;
    try {
        conn = await fetchConn();

        await conn.query("UPDATE Channels SET bId=? WHERE name=?",
            [bId, channel]);
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
            channels.push(rows[i].name);
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

async function main() {
    let channels = [];
    await getChannels(channels);
    for (let i = 0; i < channels.length; i++) {
        if (i === channels.length - 1) {
            await getAndUpdateBroadcasterId(channels[i], true);
        } else {
            await getAndUpdateBroadcasterId(channels[i], false);
        }
    }
}
main();
