'use strict'
const fs          = require('fs');
const through2    = require('through2');

const analyze     = require('./analyze');
const c           = require('./constants');
const log         = require('./log');
const terminate   = require('./terminate');
const test        = require('./test');

/*
 * string replace I copied from a bathroom wall
 */
String.prototype.replaceAll = function(str1, str2, ignore) 
  {
      return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),(ignore?"gi":"g")),(typeof(str2)=="string")?str2.replace(/\$/g,"$$$$"):str2);
  }


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

  log('plainSorted = ' + JSON.stringify(aoPlainSorted, null, 2), oConfig);
  log('encryptedSorted = ' + JSON.stringify(aoEncryptedSorted, null, 2), oConfig);

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
      oCode[aoEncryptedSorted[i].letter.toUpperCase()] = 
        aoPlainSorted[i].letter.toUpperCase();
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
        console.log('aoPairFrequency = ' + JSON.stringify(aoPairFrequency, null, 2));
        // use letter frequencies to make a cipher
        getLetterCipherKey(aoLetterFrequency, oConfig,
          function (err, oCode, sCipher, oConfig) {
            if (err) {
              // getPairCipherKey goes here
              cb (err, oConfig);
            }

            log('oCode = ' + JSON.stringify(oCode, null, 2), oConfig);
            log(`sCipher = ${sCipher}`, oConfig);

            let outputFile = fs.createWriteStream(oConfig.sDecodedFilePath);
            fs.createReadStream(oConfig.sEncryptedFilePath, {
              encoding: 'utf8'
            })
            .on('error', function(err) {
              cb(err, oConfig)
            })
            .pipe(through2((data, enc, cb) => {
              let str = data.toString();

              for (let key of Object.keys(oCode)) {
                str = str.replaceAll(key, oCode[key]);
              }
              
              cb(null, new Buffer(str));
              })
            )
            .on('error', function(err) {
              cb(err, oConfig)
            })
            .pipe(outputFile)
            .on('error', function(err) {
              cb(err, oConfig);
            })
            .on('finish', function () {
              console.log('\nfinish');
              cb (null, oConfig);
            });
          }); //getLetterCipherKey
      });
  }

  cb(null, oConfig);
}
