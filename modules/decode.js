'use strict'
const fs          = require('fs');
const through2    = require('through2');
const R           = require('ramda');

const analyze     = require('./analyze');
const c           = require('./constants');
const log         = require('./log');
const terminate   = require('./terminate');
const test        = require('./test');

/*
 * string replace I copied from a bathroom wall
 */
String.prototype.replaceAll = function(str1, str2, ignore) {
      return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),(ignore?"gi":"g")),(typeof(str2)=="string")?str2.replace(/\$/g,"$$$$"):str2);
}
Array.prototype.swapItems = function(a, b){
    this[a] = this.splice(b, 1, this[a])[0];
    return this;
}

var swapArrayElements = function (a, x, y) {
  if (a.length === 1) return a;
  a.splice(y, 1, a.splice(x, 1, a[y])[0]);
  return a;
};

/*
 * aoSorted has objects like this:
 * {
 *    oCode: {},
 *    iScore: 9
 * }
 */
var aoSorted = [];
var aoPlainSorted = [];
var aoEncryptedSorted = [];
var aoEPF = []; /* aoEncryptedPairFrequency */

/*
 * Scoring function have oCode as a parameter
 * and return an integer
 *
 * They have to be declared ABOVE the aScoringFunctions
 * declaration.
 */
var rarePairs = function (oCode) {
  let iScore = 0;
  /*
  [ 'aa','bp','cj','cp','dx','fj','gz','ij','jm','mk','rx','uq','vc','ww','yy' ].forEach(function(pair) {
    let pairEncrypted = getEncryptedPair(oCode, pair[0], pair[1]);
    let index = getEFPIndex(pairEncrypted);
    if (aoEPF[index].frequency < 0.000001) {
      iScore++;
    }
  });
 */

  console.log(`rarePairs ${iScore}`);
  return iScore;
}

var commonPairs = function (oCode) {
  let iScore = 0;
  [ 'ss', 'ee', 'tt'].forEach(function(pair) {
    let pairEncrypted = getEncryptedPair(oCode, pair[0], pair[1]);
    let index = getEFPIndex(pairEncrypted);
    if (aoEPF[index].frequency > 0.001) {
      iScore++;
    }
  });

  console.log(`commonPairs ${iScore}`);
  return iScore;
}

var ae = function (oCode) {
  let iScore = 0;
  let pAA = getEncryptedPair(oCode, 'a', 'a');
  let i = getEFPIndex(pAA);
  if (aoEPF[i].frequency < 0.0001) {
    iScore++;
  }
  let pEA = getEncryptedPair(oCode, 'e', 'a');
  let iEA = getEFPIndex(pEA);
  let pAE = getEncryptedPair(oCode, 'a', 'e');
  let iAE = getEFPIndex(pAE);
  if ((aoEPF[iAE] * 10) < aoEPF[iEA]) {
    iScore++;
  }
  
  console.log(`ae ${iScore}`);
  return iScore;
}

var th = function(oCode) {
  let iScore = 0;
  let pTH = getEncryptedPair(oCode, 't', 'h');
  let iTH = getEFPIndex(pTH);
  if (aoEPF[iTH].frequency > 0.01) {
    iScore++;
  }

  console.log(`th ${iScore}`);
  return iScore;
}

var aScoringFunctions = [rarePairs,ae,th,commonPairs];

function getKeyFromValue(oCode, value) {
  return Object.keys(oCode).find(key => oCode[key] === value);
}

function getEncryptedPair(oCode, a, b) {
  let x = getKeyFromValue(oCode, a);
  let y = getKeyFromValue(oCode, b);
  return x + y;
}

function getEFPIndex(pair) {
  let i = c.abc.indexOf(pair[0]);
  let j = c.abc.indexOf(pair[1]);

  return (j * 26) + i;
}

function score(oCode) {
  var iTotalScore = 0;
  for (let i = 0; i < aScoringFunctions.length; i++) {
    iTotalScore = aScoringFunctions[i](oCode);
  }

  return iTotalScore;
}

function getCode(aoEncrypted, aoPlain) {
  let oCode = {};
  for (let i = 0; i < c.alphabetLength; i++) {
    oCode[aoEncrypted[i].letter] = aoPlain[i].letter;
  }

  return oCode;
}

function addCodeUpperCase(oCode) {
  for (let i = 0; i < c.ABC.length; i++) {
    oCode[c.ABC[i]] = oCode[c.abc[i]].toUpperCase();
  }

  return oCode;
}

/*
 * scoreAndSave
 *
 *  input a - sorted array of encrypted characters
 *
 * Make an oCode, score it, and save it
 */
function scoreAndSave(a) {
//	console.log('a = ' + JSON.stringify(a, null, 2));
  var obj = {};
  obj.oCode = getCode(a, aoPlainSorted);
  obj.iScore = score(obj.oCode);

//  console.log('iScore = ' + obj.iScore);
  aoSorted.push(obj);
//  console.log('# of arrays = ' + aoSorted.length);
}

function permuteAndScoreSection(a, beg, end) {
  scoreAndSave(a);
  if (beg === end) {
    return;
  }
  else {
    for (let j = beg; j <= end; j++) {
      let aSwap = swapArrayElements (a, beg, j);
      permuteAndScoreSection(aSwap, beg + 1, end);
      a = swapArrayElements (aSwap, beg, j); 
    }
  }
}

function getCodeWithBestScore() {
  let aoReallySorted = aoSorted.sort(
    function(obj1, obj2) {
      return obj2.iScore - obj1.iScore;
    }
  );

	var oCode = aoReallySorted[0].oCode;
  console.log('oCode = ' + JSON.stringify(oCode));
  // fancy way to empty array
  aoSorted.splice(0,aoSorted.length);
  return oCode;
}

function permuteAndScore(aoSorted) {
  let lenSection = 4;
  let last = c.alphabetLength - lenSection;
	var oCode = {};

  for (let i = 0; i < last; i+=2) {
    permuteAndScoreSection (aoSorted, i, i + lenSection)
    oCode = getCodeWithBestScore();
  }

  return oCode;
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

  /*
   * obj2 - obj1 - sort descending biggest first
   * obj2 - obj2 - sort ascending
   */

  /*
   * aoPlainSorted, aoEncryptedSorted are global variables
   *
   * (yes, brilliant - seemingly totally arbritrary)
   */
  aoPlainSorted = oConfig.aoLetterFrequency.sort(
    function(obj1, obj2) {
      return obj2.frequency - obj1.frequency;
    }
  );

  aoEncryptedSorted = aoLetterFrequency.sort(
    function(obj1, obj2) {
      return obj2.frequency - obj1.frequency;
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

    var oCode = permuteAndScore(aoEncryptedSorted); 

    oCode = addCodeUpperCase(oCode);

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
//  console.log('oConfig.aoPairFrequency = ' + JSON.stringify(oConfig.aoPairFrequency, null, 2));
  if (oConfig.bDecode) {
    // get encrypted file's letter and pair frequencies
    analyze.encrypted(oConfig,
      function (err, aoEncryptedLetterFrequency, aoEncryptedPairFrequency, oConfig) {
        log('return from analyze.encrypted', oConfig);
        aoEPF = aoEncryptedPairFrequency;
        // use letter frequencies to make a cipher
        getLetterCipherKey(aoEncryptedLetterFrequency, oConfig,
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
