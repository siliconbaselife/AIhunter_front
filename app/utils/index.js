const Request = require('./Request');
const { JOB_PRIORITY_ENUM } = require('../Config')

/**
 * uuid
 * @param {number} len 
 * @param {number} radix 
 * @returns {string}
 */
const uuid = (len, radix) => {
  let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
  let uuid = [], i;
  radix = radix || chars.length;

  if (len) {
    for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
  } else {
    let r;

    // rfc4122 requires these characters
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4';
    for (i = 0; i < 36; i++) {
      if (!uuid[i]) {
        r = 0 | Math.random() * 16;
        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
      }
    }
  }

  return uuid.join('');
}

const sleep = (ms, random = true) => {
  return new Promise(resolve => setTimeout(resolve, random ? parseInt(ms + Math.random() * ms) : ms));
};

const sendNotice = (options) => {
  const { ...others } = options;
  return Request({
    url: 'https://wpage.test.com/notice/btalk/w/send/v1',
    method: 'POST',
    data: {
      ...others
    },
    headers: {
      "Content-Type": 'application/json',
    }
  })
    .then(data => {
      console.log('sendNotice', data)
    })
    .catch(e => {
      console.log('sendNotice error', e)
    })
}

const doingHigherPriorityJob = (job) => {
  if (process.doingJob && process.doingJob < job) {
    return true;
  }
  return false
}

module.exports = {
  uuid,
  sleep,
  sendNotice,
  doingHigherPriorityJob
}
