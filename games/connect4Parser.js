const connect4 = require('./connect4');
const Elo = require('elo-calculator');
const elo = new Elo({
    rating: 1200,
    k: [40, 20, 10]
});

module.exports = {
    gameInit : false,
    gamePlayed : false,
    player1Draw: false,
    player2Draw: false,
    connect4Checker : function(client, channel, tags, message, pool, channelPrefix) {
        const gameTag = channelPrefix + 'c4'
        const words = message.split(' ');
        let gameTimeout = null;
        tags.username = tags.username.toLowerCase();
        if (words[0] === gameTag) {
            //init a new game
            if (words.length === 3) {
                if (words[1] === 'vs') {
                    if (!this.gamePlayed && !this.gameInit) {
                        if (words[2].startsWith('@')) {
                            words[2] = words[2].substring(1);
                        }
                        this.gameInit = true;
                        connect4.games[1] = {
                            player1: tags.username,
                            player2: words[2].toLowerCase(),
                            currentPlayer: tags.username,
                            moves: 0,
                            board: [[0, 0, 0, 0, 0, 0, 0],
                                [0, 0, 0, 0, 0, 0, 0],
                                [0, 0, 0, 0, 0, 0, 0],
                                [0, 0, 0, 0, 0, 0, 0],
                                [0, 0, 0, 0, 0, 0, 0],
                                [0, 0, 0, 0, 0, 0, 0]]
                        };
                        const game = connect4.games[1];
                        client.say(channel, `${game.player2} ${game.player1} challenged you to a game of connect4 accept with <${gameTag} accept> or decline with <${gameTag} decline>`);
                        //Game challenge only last 60 seconds
                        setTimeout(() => {
                            this.gameInit = false;
                        }, 60000);
                    } else {
                        client.say(channel, `${tags.username} there currently is a game going on or an open challenge, try again later`);
                    }
                }
            }

            if (words.length === 2) {
                if (words[1].toLowerCase() === 'help') {
                    client.say(channel, `${tags.username} once you are in a game type ${gameTag} <1-7> to place a chip in the corresponding column type <${gameTag} ff> to surrender or <${gameTag} draw> to offer a draw to your opponent,
                                also if you are using chatterino make sure to resize your window so that all columns align`);
                } else if (words[1].toLowerCase() === 'leaderboard') {
                    getLeaderBoard(client, channel, tags);
                } else if (words[1].toLowerCase() === 'stats') {
                    getConnectFourProfile(client, channel, tags);
                } else if (this.gamePlayed) {
                    const game = connect4.games[1];
                    let pid = 0;
                    if (checkForDraws(tags.username, game, this.player1Draw, this.player2Draw)) {
                        if (words[1].toLowerCase() === 'draw') {
                            updateC4(client, channel, game.player1, game.player2, true, game);
                            client.say(channel, `${game.player1} ${game.player2} the match has ended in a draw`);
                            this.gamePlayed = false;
                            clearTimeout(gameTimeout);
                            return;
                        } else {
                            this.player2Draw = false;
                            this.player1Draw = false;
                        }
                    }
                    if (isPartOfGame(tags.username, game) && words[1].toLowerCase() === 'ff') {
                        const winner = game.player1.toLowerCase() === tags.username.toLowerCase() ? game.player2 : game.player1;
                        const loser = game.player1.toLowerCase() !== tags.username.toLowerCase() ? game.player2 : game.player1;
                        updateC4(client, channel, winner, loser, false, game);
                        this.gamePlayed = false;
                        clearTimeout(gameTimeout);
                        return;
                    } else if (isPartOfGame(tags.username, game) && words[1].toLowerCase() === 'draw') {
                        const player2 = game.player1.toLowerCase() === tags.username.toLowerCase() ? game.player2 : game.player1;
                        this.player1Draw = game.player1.toLowerCase() === tags.username.toLowerCase();
                        this.player2Draw = !this.player1Draw;
                        client.say(channel, `@${player2} ${tags.username} is offering a draw accept the draw by also typing <${gameTag} draw>`);
                        return;
                    }
                    //current player is typing
                    if (game.currentPlayer.toLowerCase() === tags.username.toLowerCase()) {
                        if (game.player1.toLowerCase() === tags.username.toLowerCase()) {
                            pid = 1;
                        } else {
                            pid = 2;
                        }
                        const move_made = connect4.make_move(1, words[1], pid);
                        if (move_made) {
                            game.moves += 1;
                            let winner = connect4.check_for_win(game.board);
                            if (winner) {
                                const loser = game.currentPlayer === game.player1 ? game.player2 : game.player1;
                                updateC4(client, channel, game.currentPlayer, loser, false, game);
                                this.gamePlayed = false;
                                clearTimeout(gameTimeout);
                            } else {
                                game.currentPlayer = game.currentPlayer === game.player1 ? game.player2 : game.player1;
                                client.say(channel, `${connect4BoardString(game.board)} ${game.currentPlayer} its your turn`);
                            }
                            if (game.moves >= 42) {
                                updateC4(client, channel, game.player1, game.player2, true, game);
                                this.gamePlayed = false;
                                clearTimeout(gameTimeout);
                            }
                        } else {
                            client.say(channel, `${tags.username} invalid move`);
                        }
                        //check for surrender vote of non turn player
                    } else if (game.player1.toLowerCase() === tags.username.toLowerCase() || game.player2.toLowerCase() === tags.username.toLowerCase()) {
                        client.say(channel, `${tags.username} it is currently not your turn`);
                    }
                    //no game is being played
                } else {
                    const game = connect4.games[1];
                    if (this.gameInit && game.player2.toLowerCase() === tags.username.toLowerCase()) {
                        if (words[1].toLowerCase() === 'accept') {
                            this.gameInit = false;
                            this.gamePlayed = true;
                            const coinFlip = Math.floor(Math.random() * (3));
                            //randomize starting player
                            if (coinFlip === 2) {
                                const player1 = game.player1;
                                game.player1 = game.player2;
                                game.player2 = player1;
                                game.currentPlayer = game.player1;
                            }
                            //Max game lenght of 5 mins
                            gameTimeout = setTimeout(() => {
                                this.gamePlayed = false;
                            }, 300000);
                            client.say(channel, `${connect4BoardString(game.board)} ${game.currentPlayer} its your turn`);
                        } else if (words[1].toLowerCase() === 'decline') {
                            this.gameInit = false;
                            client.say(channel, `@${game.player1} ${game.player2} declined your challenge`);
                        } else {
                            client.say(channel, `${tags.username} unknown command check $help for available commands`);
                        }
                    }
                }
            }
        }
        // Fetch Connection
        async function fetchConn() {
            let conn = await pool.getConnection();
            return conn;
        }
        async function updateC4(client, channel, winner, loser, draw, game) {
            let conn;
            try {
                conn = await fetchConn();
                let changes = [];
                let eloP1;
                let eloP2;

                await conn.query("INSERT IGNORE INTO Connect_Four (username) Values (?), (?)",
                    [winner, loser]);
                const rows = await conn.query("SELECT * FROM Connect_Four WHERE username=? OR username=?", [winner, loser]);
                if (!draw) {
                    if (rows[0].username === winner) {
                        //first row is winner
                        eloP1 = elo.createPlayer(rows[0].mmr, rows[0].games)
                        eloP2 = elo.createPlayer(rows[1].mmr, rows[1].games)
                        const oldP1Mmr = rows[0].mmr;
                        const oldP2Mmr = rows[1].mmr;
                        elo.updateRatings([[eloP1, eloP2, 1]]);
                        changes.push(Math.round(eloP1.rating) - oldP1Mmr);
                        changes.push(Math.round(eloP2.rating) - oldP2Mmr);
                        await conn.query("UPDATE Connect_Four SET games = games + 1, mmr = ?, winStreak = winStreak +1 WHERE username = ?", [eloP1.rating, winner]);
                        await conn.query("UPDATE Connect_Four SET games = games + 1, mmr = ?, winStreak = 0 WHERE username = ?", [eloP2.rating, loser]);
                    } else {
                        //second row is winner
                        eloP1 = elo.createPlayer(rows[1].mmr, rows[1].games)
                        eloP2 = elo.createPlayer(rows[0].mmr, rows[0].games)
                        const oldP1Mmr = rows[1].mmr;
                        const oldP2Mmr = rows[0].mmr;
                        elo.updateRatings([[eloP1, eloP2, 1]]);
                        changes.push(Math.round(eloP1.rating) - oldP1Mmr);
                        changes.push(Math.round(eloP2.rating) - oldP2Mmr);
                        await conn.query("UPDATE Connect_Four SET games = games + 1, mmr = ?, winStreak = winStreak +1 WHERE username = ?", [eloP1.rating, winner]);
                        await conn.query("UPDATE Connect_Four SET games = games + 1, mmr = ?, winStreak = 0 WHERE username = ?", [eloP2.rating, loser]);
                    }
                    client.say(channel, `${connect4BoardString(game.board)} winner winner chicken dinner ${winner} PogU ${winner} (+${changes[0]} mmr), ${loser} (${changes[1]} mmr)`);
                } else {
                    eloP1 = elo.createPlayer(rows[0].mmr, rows[0].games)
                    eloP2 = elo.createPlayer(rows[1].mmr, rows[1].games)
                    const oldP1Mmr = rows[0].mmr;
                    const oldP2Mmr = rows[1].mmr;
                    elo.updateRatings([[eloP1, eloP2, .5]]);
                    changes.push(Math.round(eloP1.rating) - oldP1Mmr);
                    changes.push(Math.round(eloP2.rating) - oldP2Mmr);
                    await conn.query("UPDATE Connect_Four SET games = games + 1, mmr = ?, winStreak = winStreak +1 WHERE username = ?", [eloP1.rating, winner]);
                    await conn.query("UPDATE Connect_Four SET games = games + 1, mmr = ?, winStreak = 0 WHERE username = ?", [eloP2.rating, loser]);
                    client.say(channel, `${connect4BoardString(game.board)} the game has ended in a draw ${winner} (${changes[0]} mmr), ${loser} (${changes[1]} mmr)`);
                }
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

                const rows = await conn.query("SELECT * FROM Connect_Four c ORDER BY c.mmr DESC LIMIT 10");
                let leaderBoard = '';
                for (let i = 0; i < rows.length; i++) {
                    leaderBoard += i+1 + ': ' + rows[i].username + ' (' + rows[i].mmr + '), ';
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
        async function getConnectFourProfile(client, channel, tags) {
            let conn;

            try {
                conn = await fetchConn();

                const rows = await conn.query("SELECT * FROM (SELECT *, RANK() OVER ( ORDER BY mmr DESC) rank_no FROM Connect_Four) cr WHERE cr.username=?", tags.username);
                if (rows.length === 0) {
                    client.say(channel, `@${tags.username} you have not played a game of connect four yet`);
                } else {
                    client.say(channel, `@${tags.username} you are currently rank number ${rows[0].rank_no} with a ${rows[0].winStreak} game winstreak, you have played ${rows[0].games} ${rows[0].games > 1 ? 'games' : 'game'} and your current MMR is ${rows[0].mmr}`);
                }
            } catch (err) {
                // Manage Errors
                console.log(err);
            } finally {
                // Close Connection
                if (conn) conn.end();
            }
        }
    }
}


function connect4BoardString(board) {
    let boardState = ' ㅤ  ㅤ  ㅤ  ㅤ  ㅤ  ㅤ  ㅤ  ㅤ  ㅤ  ㅤ   ㅤ    ㅤ  ';
    for(let row = 0; row < board.length; row++){
        for(let col = 0; col < board[row].length; col++){
            boardState += '|'
            const selected = board[row][col];
            if (selected === 0) {
                boardState += String.fromCharCode(9898);
            } else if (selected === 1) {
                boardState += String.fromCharCode(55357) + String.fromCharCode(56628);
            } else if (selected === 2) {
                boardState += String.fromCharCode(55357) + String.fromCharCode(56629);
            }
        }
        boardState += '|';
        boardState += ' ㅤ  ㅤ  ㅤ  ㅤ  ㅤ  ㅤ   ㅤ  ';
    }
    return boardState;
}

function isPartOfGame(username, game) {
    return username.toLowerCase() === game.player1 || username.toLowerCase() === game.player2;

}

function checkForDraws(username, game, player1Draw, player2Draw) {
    if (game.player1.toLowerCase() === username.toLowerCase()) {
        if (player2Draw) {
            return true;
        }
    } else if (game.player2.toLowerCase() === username.toLowerCase()) {
        if (player1Draw) {
            return true;
        }
    }
    return false;
}
