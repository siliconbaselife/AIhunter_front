const Request = require('./Request');
const { JOB_PRIORITY_ENUM } = require('../Config')

const sleep = (ms, random = true) => {
  return new Promise(resolve => setTimeout(resolve, random ? parseInt(ms + Math.random() * ms) : ms));
};

const sendNotice = (options) => {
  const { ...others } = options;
  return Request( {
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
  sleep,
  sendNotice,
  doingHigherPriorityJob
}
