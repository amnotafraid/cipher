'use strict'
const fs          = require('fs');
const path        = require('path');

const log         = require('./log');

module.exports = (cb) => {
  var oConfig = {
    bLogConsole: true,
    bAnalyze: false,
    bDecode: false,
    sInputFile: '../input.json',
    sOutputFile: '../output.json',
  };

  log('initialize', oConfig);

  let sAnalyzeFile = 'plain.txt';
  let sAnalyzeFilePath = (path.join(__dirname), '../', sAnalyzeFile);
  log(`sAnalyzeFile = ${sAnalyzeFile}`, oConfig);
  if (fs.existsSync(sAnalyzeFilePath)) {
    oConfig.bAnalyze = true;
    oConfig.sAnalyzeFilePath = sAnalyzeFilePath;
  }
  oConfig.fZnalyze = false;

  let sEncryptedFile = 'encrypted.txt';
  let sEncryptedFilePath = (path.join(__dirname), '../', sEncryptedFile);
  log(`sEncryptedFile = ${sEncryptedFile}`, oConfig);
  if (fs.existsSync(sEncryptedFilePath)) {
    oConfig.bDecode = true;
    oConfig.sEncryptedFilePath = sEncryptedFilePath;
  }
  oConfig.bDecode = true;

  log('oConfig = ' + JSON.stringify(oConfig, null, 2), oConfig);
  cb(null, oConfig);
}

