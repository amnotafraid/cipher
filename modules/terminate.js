'use strict'
const fs          = require('fs');
const now         = require('performance-now');

const log         = require('./log');

module.exports = function(err, oConfig) {
  log('terminate', oConfig);
  oConfig.tEnd = now();
  let t = oConfig.tEnd - oConfig.tStart;
  log(`Executed in ${t} msec`, oConfig);
}

