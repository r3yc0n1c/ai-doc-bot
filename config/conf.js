const dotenv = require('dotenv')

dotenv.config();

const config = {
    ROCKETCHAT_HOST: process.env.ROCKETCHAT_HOST,
    CHAT_USER: process.env.CHAT_USER,
    ROCKETCHAT_PASSWORD: process.env.ROCKETCHAT_PASSWORD,
    BOTNAME: process.env.BOTNAME,
    SSL: process.env.SSL,
    ROCKETCHAT_ROOM: process.env.ROCKETCHAT_ROOM,
    RESPOND_TO_DM: process.env.RESPOND_TO_DM,
}

for(const key in config){
    if(config[key] === 'true')
        config[key] = true;
    else if(config[key] === 'false')
        config[key] = false;
}

module.exports = config;