'use strict'
const fs          = require('fs');

const log         = require('./log');

module.exports = function(err, oConfig) {
  log('terminate', oConfig);
}

