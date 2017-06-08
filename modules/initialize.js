'use strict'
const fs          = require('fs');
const path        = require('path');
const now         = require('performance-now');

const log         = require('./log');

// TO DO - add command line parser to set these parameters:

module.exports = (cb) => {
  var oConfig = {
    bLogConsole: true,
    bAnalyze: true,
    bDecode: true,
    bInDepthDecode: true,
    bOutputConsole: false,
    tStart: now(),
  };

  log('initialize', oConfig);

  let sAnalyzeFile = 'plain.txt';
  let sAnalyzeFilePath = (path.join(__dirname), '../', sAnalyzeFile);
  log(`sAnalyzeFile = ${sAnalyzeFile}`, oConfig);
  if (fs.existsSync(sAnalyzeFilePath)) {
    oConfig.bAnalyze = true;
    oConfig.sAnalyzeFilePath = sAnalyzeFilePath;
  }

  let sEncryptedFile = 'encrypted.txt';
  let sEncryptedFilePath = (path.join(__dirname), '../', sEncryptedFile);
  log(`sEncryptedFile = ${sEncryptedFile}`, oConfig);
  if (fs.existsSync(sEncryptedFilePath)) {
    oConfig.bDecode = true;
    oConfig.sEncryptedFilePath = sEncryptedFilePath;
  }

  let sDecodedFile = 'decoded.txt';
  let sDecodedFilePath = (path.join(__dirname), '../', sDecodedFile);
  log(`sDecodedFile = ${sDecodedFile}`, oConfig);
  oConfig.sDecodedFilePath = sDecodedFilePath;

  log('oConfig = ' + JSON.stringify(oConfig, null, 2), oConfig);
  cb(null, oConfig);
}

