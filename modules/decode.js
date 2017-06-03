'use strict'
const fs          = require('fs');

const analyze     = require('./analyze');
const log         = require('./log');
const terminate   = require('./terminate');
const test        = require('./test');

module.exports = function(oConfig, cb) {
  log('decode', oConfig);

  if (oConfig.bDecode) {
    analyze.encrypted(oConfig,
      function (err, aoLetterCounter, aoPairCounter, oConfig) {
        log('return from analyze.encrypted', oConfig);
      });
  }
}

