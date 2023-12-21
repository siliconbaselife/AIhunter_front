const { ENV, ENV_ENUM, BROADCAST_MESSAGE_TOPIC, myIP } = require('../../Config');
const { sendBroadcastMessage, sendMessageByPid, sendMessageById, isMaster, TOPIC_PREFIX, analysisMessage } = require('../../ProcessControl');
const Request = require('../Request');
const EventEmitter = require('events').EventEmitter;
const { sleep } = require('../index');
const logger = require('../../Logger');

const DOMAIN_ENUM = {
  prod: 'http://prod.com/',
}
const CONSUMER_GROUP = myIP.replace(/\./g, '_');
const LOOP_TIME = 1000 * 3;

const LoopMQMessage = async (topic, timer) => {
  const domain = DOMAIN_ENUM.prod;
  let response;
  try {
    response = await Request({
      url: `${domain}wmqconsumer`,
      data: {
        topic,
        consumerGroup: CONSUMER_GROUP
      },
      headers: {
        token: '1312321',
        deviceid: '12312312'
      }
    })
  } catch (e) {
    logger.error('get mq info error', timer, e)
  }
  if (response) {
    const { status, data = [] } = response;
    if (status === 0 && Array.isArray(data) && data.length > 0) {
      for (let item of data) {
        await sendBroadcastMessage({
          topic,
          data: item,
        })
      }
    }
  }
  await sleep(timer, false);
  LoopMQMessage(topic, timer);
}

class WMQ extends EventEmitter{
  constructor() {
    super();
    process.on('message', (packet) => {
      if(!isMaster){
        const newPacket = analysisMessage(packet);
        logger.info(`slave on message: ${JSON.stringify(newPacket)}`);

        if (newPacket) {
          const { topic, data } = newPacket;
          logger.info(`on message topic: ${topic}, data ${JSON.stringify(data)}`);

          this.emit(topic, data);
        }
      }
      else {
        const newPacket = analysisMessage(packet);
        const { topic, data } = newPacket;
        logger.info(`master on message topic: ${topic}, data ${JSON.stringify(data)}`);
  
        switch(data.action) {
          case 'loginStatus':
            process.GetLoginStatus.push({
              ...data
            });
            if(process.GetLoginStatus.length == process.slaveCount) {
              process.GetLoginStatusPromiseResolve(); 
            }
            break;
          case 'bindResult':
            const { userId, platform } = data;
            process.bindResult = {
              platform,
              userId
            };
            break;
        }

      }
    })
  }

  register = (topic) => {
    if (isMaster) {
      // LoopMQMessage(topic, LOOP_TIME);
    }
    return this;
  }
}

module.exports = new WMQ();
