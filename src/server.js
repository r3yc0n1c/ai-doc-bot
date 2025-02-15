const { driver } = require('@rocket.chat/sdk');
const respmap = require('./reply');
const config = require('../config/conf');
const { default: answerQuery } = require('../scripts/check_qna');

console.log(config)

let myUserId; // Declare user ID variable


const runbot = async () => {
    try {
        const conn = await driver.connect({
            host: config.ROCKETCHAT_HOST,
            useSsl: config.SSL,
            dm: config.RESPOND_TO_DM
        });
        myUserId = await driver.login({ username: config.CHAT_USER, password: config.ROCKETCHAT_PASSWORD });

        const subscribed = await driver.subscribeToMessages();
        console.log('subscribed');

        const msgloop = await driver.reactToMessages(processMessages);
        console.log('connected and waiting for messages');

    } catch (error) {
        console.error("Error:", error);
    }
};

// Process messages
const processMessages = async (err, message, messageOptions) => {
    if (!err) {
        if (message.u._id === myUserId) return;
        const roomname = await driver.getRoomName(message.rid);
        console.log('got message ' + message.msg);


        // var response;
        // if (message.msg in respmap) {
        //     response = respmap[message.msg];
        // } else {
        //     response = message.u.username + ', how can I' + ' help you with "' + message.msg + '"';
        // }

        const response = await answerQuery(message.msg);
        try {
            const sentmsg = await driver.sendToRoomId(response, message.rid);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    }
};

runbot()