'use strict'
const fs          = require('fs');

const analyze     = require('./analyze');
const c           = require('./constants');
const log         = require('./log');
const terminate   = require('./terminate');
const test        = require('./test');


/*
 * getLetterCipher key needs:
 *
 *  oConfig.aoLetterFrequency - the analysis of the letter frequency
 *                              of the sample file
 *
 *  aoLetterFrequency - the analysis of the encrypted file
 *
 * It will sort both of these in order of the frequency.  The idea is
 * that will reveal the cipher.
 *
 * If it works, it will build oCode that will look like this:
 *
 *    {
 *      a: z,
 *      b: y,
 *      c: x,
 *      ...
 *      A: Z,
 *      B: Y,
 *      C: X,
 *    }
 *
 * which can be used to substitute the letters in the encrypted file.
 *
 * In addition, it will make sCipher, which is the cipher string. This
 * is a lower case string. If it were a reverse encrypt, it would be
 * the alphabet in reverse.
 *
 * The callback looks like this:
 *
 *    cb (err, oCode, sCipher, oConfig)
 */
function getLetterCipherKey(aoLetterFrequency, oConfig, cb) {
  if (!Array.isArray(oConfig.aoLetterFrequency)) {
    cb('Original (plain text) letter frequency analysis is missing',
       null, null, oConfig);
  }
  if (!Array.isArray(aoLetterFrequency)) {
    cb('Encrypted letter frequency analysis is missing',
       null, null, oConfig);
  }

  let aoPlainSorted = oConfig.aoLetterFrequency.sort(
    function(obj1, obj2) {
      return obj1.frequency - obj2.frequency;
    }
  );

  let aoEncryptedSorted = aoLetterFrequency.sort(
    function(obj1, obj2) {
      return obj1.frequency - obj2.frequency;
    }
  );

  if (aoPlainSorted.length !== 26 || 
      aoEncryptedSorted.length !== 26) {
    cb('The two letter frequency arrays lengths is wrong.  They should both be 26', null, null, oConfig);
  }

  test.letterFrequency(aoEncryptedSorted, function (err, fMinDiff) {
    if (err) {
      cb(err, null, null, oConfig);
    }
    log(`fMinDiff for ${oConfig.sEncryptedFilePath} is ${fMinDiff}.  This is the minimum difference between the frequencies`, oConfig);

    let oCode = {};

    for (let i = 0; i < aoEncryptedSorted.length; i++) {
      oCode[aoEncryptedSorted[i].letter] = aoPlainSorted[i].letter;
    }

    let sCipher = '';

    for (let i = 0; i < c.abc.length; i++) {
      let letter = c.abc[i];
      sCipher += oCode[letter];
    }

    cb (null, oCode, sCipher, oConfig);
  });
}


/*
 * This file expects there to be analyze information in the 
 * oConfig:
 *
 *    oConfig.aoLetterFrequency
 *    oConfig.aoPairFrequency
 *
 * To run, it needs
 *
 *    oConfig.bDecode = true
 *    oConfig.sEncryptedFilePath = the path to the file to analyze
 *
 * So, it will get letter and pair frequecies on the encrypted file
 * and then compare the letter frequencies to the oConfigaoLetterFrequency.
 * If the letter frequency won't work, it will try to compare using
 * the pair frequencuies.
 *
 * At any rate, the goal is to get the cipher code and replace the text
 * in the encrypted file.
 *
 * The callback is like this:
 *
 * cb (null, oConfig); // first param is error message, if there is one
 */

module.exports = function(oConfig, cb) {
  log('decode', oConfig);

  if (oConfig.bDecode) {
    // get encrypted file's letter and pair frequencies
    analyze.encrypted(oConfig,
      function (err, aoLetterFrequency, aoPairFrequency, oConfig) {
        log('return from analyze.encrypted', oConfig);
        
        getLetterCipherKey(aoLetterFrequency, oConfig,
          function (err, oCode, sCipher, oConfig) {
            if (err) {
              // getPairCipherKey goes here
              cb (err, oConfig);
            }

            log('oCode = ' + JSON.stringify(oCode, null, 2), oConfig);
            log(`sCipher = ${sCipher}`, oConfig);

            cb (null, oConfig);
          });
      });
  }
}

