const argv = process.argv.slice(2);
const isMaster = argv[0] === 'master';
const logger = require('../Logger');
const TOPIC_PREFIX = 'TOPIC:';
const { v4: UUID } = require('uuid');
const _ = require('lodash');

const pm2 = require('pm2');
const getProcessInfo = async () => {
  return new Promise((resolve) => {
    let masterInfo = {};
    const clusterIdInfo = {};
    const clusterPidInfo = {};
    pm2.connect(function (e) {
      if (e) {
        resolve({
          status: -1,
          msg: 'getProcessInfo pm2.connect error',
          error: e
        })
      }
      // 列出正在运行的进程并获取它们的名称/ID
      pm2.list(function (err, processes) {
        if (err) {
          resolve({
            status: -2,
            msg: 'getProcessInfo pm2.list error',
            error: err
          })
        }
        try {
          for (let item of processes) {
            const { name, pm_id, pid } = item;
            if (name === 'Slave') {
              clusterIdInfo[pm_id] = {
                pid,
                instance: item
              };
              clusterPidInfo[pid] = {
                pm_id,
                instance: item
              };
            } else if (name === 'Master') {
              masterInfo = {
                pm_id,
                pid,
                instance: item
              }
            }
          }
          resolve({
            status: 0,
            data: {
              masterInfo,
              clusterIdInfo,
              clusterPidInfo
            }
          })
        } catch (error) {
          resolve({
            status: -3,
            msg: 'getProcessInfo pm2.list logic error',
            error
          })
        }
      });
    });
  })
}
const NOOP = () => {};
const buildTopic = (packet) => ({...packet, topic: `${TOPIC_PREFIX}${packet.topic}`});
const buildCallback = (callback, id) => {
  return (error) => callback(error, id)
}
const sendBroadcastMessage = async (packet, errorCallback = NOOP) => {
  const { status, data, msg } = await getProcessInfo();
  if (status !== 0) {
    logger.error(`发送广播消息异常：${msg}`);
    return;
  }
  const { clusterIdInfo, masterInfo } = data;
  const ids = Object.keys(clusterIdInfo);
  for (let id of ids) {
    pm2.sendDataToProcessId(id, buildTopic(packet), buildCallback(errorCallback, id));
  }
  // pm2.sendDataToProcessId(masterInfo.pm_id, buildTopic(packet), buildCallback(errorCallback, masterInfo.pm_id));
}
const sendMessageToMaster = async (packet, errorCallback = (error, id) => {
  logger.error('sendMessageToMaster error: ' + error)
}) => {
  const { status, data, msg } = await getProcessInfo();
  if (status !== 0) {
    logger.error(`发送消息异常：${msg}`);
    return;
  }
  const { masterInfo } = data;
  if (!masterInfo) {
    logger.error(`发送消息异常：master不存在`);
    return;
  }
  logger.info(`发送消息给主进程 pid ${masterInfo.pm_id} packet: ${JSON.stringify(packet)}`);

  pm2.sendDataToProcessId(masterInfo.pm_id, buildTopic(packet), buildCallback(errorCallback, masterInfo.pm_id));
}


const sendMessageById = async (ids, packet, errorCallback = NOOP) => {
  logger.info(`发送消息给进程：${ids} ${JSON.stringify(packet)}`);

  if (!Array.isArray(ids)) {
    ids = [ids];
  }
  for (let id of ids) {
    pm2.sendDataToProcessId(id, buildTopic(packet), buildCallback(errorCallback, id));
  }
}


const sendMessageByPid = async (pids, packet, errorCallback = NOOP) => {
  if (!Array.isArray(pids)) {
    pids = [pids];
  }
  const { status, data, msg } = await getProcessInfo();
  if (status !== 0) {
    logger.error(`发送消息异常：${msg}`);
    return;
  }
  const { clusterPidInfo } = data;
  for (let pid of pids) {
    const item = clusterPidInfo[pid];
    if (item) {
      pm2.sendDataToProcessId(item.pm_id, buildTopic(packet), buildCallback(errorCallback, item.pm_id));
    } else {
      logger.error(`发送消息异常：未找到pid ${pid} 的pm2实例化进程`);
    }
  }
}
const analysisMessage = (packet) => {
  if (!packet || !_.isPlainObject(packet)) {
    return false;
  }
  if (_.isString(packet.topic) && packet.topic.startsWith(TOPIC_PREFIX)) {
    return {
      ...packet,
      topic: packet.topic.replace(TOPIC_PREFIX, '')
    };
  }
  return false;
}

module.exports = {
  sendMessageToMaster,
  sendBroadcastMessage,
  sendMessageById,
  sendMessageByPid,
  isMaster,
  TOPIC_PREFIX,
  analysisMessage,
  getProcessInfo
}
