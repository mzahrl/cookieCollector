# Automatic cookie collector for Twitch chat
This is a automatic cookie collector for Supibot in Twitch chat. The script will collect a cookie every 2 hours in the desired channel.
## How to host yourself
- Download and install nodejs
    - For windows https://nodejs.org/en/
    - For linux type command ```apt install nodejs```
- Change values in the .env file of the cookieCollector folder
    - <span style="color:green">TWITCH_CHANNEL</span>: Channel in which you want your cookies to be collector, with a # in front of the name, e.g. #Ninja
    - <span style="color:green">TWITCH_USERNAME</span>: Name of your twitch account
    - <span style="color:green">TWITCH_OAUTH_TOKEN</span>: OAuth token used for connecting your twitch account to the channel. See https://twitchapps.com/tmi/ for more information
    - <span style="color:green">CHANNEL_PREFIX</span>: Prefix used for the cookie command in the specified channel e.g. if the channel uses !cookie type !
- The dependencies are already preinstalled, if you wish to install them yourself or update them, install npm and run the command ```npm install``` in a terminal of the cookieCollector folder
- Run the script by typing ```node cookieCollector.js``` in a terminal of the cookieCollector folder
- Enjoy your cookies!
