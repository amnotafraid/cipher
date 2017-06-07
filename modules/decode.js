/*
 * You have to fix aSorted.  You need an array to keep track of the
 * scores with the oCode and the aoEncryptedSorted that works the best
 *
 * Sometimes aSorted refers to the Encrypted letters used to make oCode.
 * Sometimes aSorted refers to the array of score keeping
 *
 * You fixed the above.  Take a look at aoEncryptedSorted.  I don't think
 * it should be an global.  I think it needs to be a local since it
 * will change so much.
 *
 * Maybe every time you use it, you need to print it out.
 *
 * After you permute and score a section, you are not using the
 * array that it made in the next stage.
 */
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
 * aoScores has objects like this:
 * {
 *    iScore: 9,
 *    aoES: array
 * }
 */
var aoScores = [];
var aoPlainSorted = [];
var aoEPF = []; /* aoEncryptedPairFrequency */

/*
 * string replace I copied from a bathroom wall
 */
String.prototype.replaceAll = function(str1, str2, ignore) {
      return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),(ignore?"gi":"g")),(typeof(str2)=="string")?str2.replace(/\$/g,"$$$$"):str2);
}

/*
 * swapArrayElements I copied from another bathroom wall
 */
var swapArrayElements = function (a, x, y) {
  if (a.length === 1) return a;
  a.splice(y, 1, a.splice(x, 1, a[y])[0]);
  return a;
};

/*
 * Scoring function have oCode as a parameter
 * and return an integer
 *
 * They have to be declared ABOVE the aScoringFunctions
 * declaration.
 */
var aNeverPairs = [];
var neverPairs = function (oCode) {
  let iScore = 0;
  aNeverPairs.forEach(function(pair) {
    let pairEncrypted = getEncryptedPair(oCode, pair[0], pair[1]);
    let index = getEFPIndex(pairEncrypted);
    if (aoEPF[index].frequency === 0) {
      iScore++;
    }
  });

//  console.log(`neverPairs = ${iScore}`);
  return iScore;
}

var aVeryCommonPairs = [];
var veryCommonPairs = function (oCode) {
  let iScore = 0;
  aVeryCommonPairs.forEach(function(pair) {
    let pairEncrypted = getEncryptedPair(oCode, pair[0], pair[1]);
    let index = getEFPIndex(pairEncrypted);
    if (aoEPF[index].frequency > 0.02) {
      iScore+=4;
    }
  });

//  console.log(`veryCommonPairs = ${iScore}`);
  return iScore;
}

var aCommonPairs = [];
var commonPairs = function (oCode) {
  let iScore = 0;
  aCommonPairs.forEach(function(pair) {
    let pairEncrypted = getEncryptedPair(oCode, pair[0], pair[1]);
    let index = getEFPIndex(pairEncrypted);
    if (aoEPF[index].frequency > 0.01 && 
        aoEPF[index].frequency < 0.02) {
      iScore+=3;
    }
  });

//  console.log(`commonPairs = ${iScore}`);
  return iScore;
}

var aLikelyPairs = [];
var likelyPairs = function (oCode) {
  let iScore = 0;
  aLikelyPairs.forEach(function(pair) {
    let pairEncrypted = getEncryptedPair(oCode, pair[0], pair[1]);
    let index = getEFPIndex(pairEncrypted);
    if (aoEPF[index].frequency > 0.005 && 
        aoEPF[index].frequency < 0.01) {
      iScore+=2;
    }
  });

//  console.log(`veryLikelyPairs = ${iScore}`);
  return iScore;
}

var rarePairs = function (oCode) {
  let iScore = 0;
  [ 'aa','bp','cj','cp','dx','fj','gz','ij','jm','mk','rx','uq','vc','ww','yy' ].forEach(function(pair) {
    let pairEncrypted = getEncryptedPair(oCode, pair[0], pair[1]);
    let index = getEFPIndex(pairEncrypted);
    if (aoEPF[index].frequency < 0.000001) {
      iScore++;
    }
  });

//  console.log(`rarePairs = ${iScore}`);
  return iScore;
}

var ae = function (oCode) {
  let iScore = 0;
  let pAA = getEncryptedPair(oCode, 'a', 'a');
  let i = getEFPIndex(pAA);
  if (aoEPF[i].frequency < 0.0001) {
    let pEA = getEncryptedPair(oCode, 'e', 'a');
    let iEA = getEFPIndex(pEA);
    let pAE = getEncryptedPair(oCode, 'a', 'e');
    let iAE = getEFPIndex(pAE);
    if ((aoEPF[iAE] * 10) < aoEPF[iEA]) {
      iScore+=7;
    }
  }

//  console.log(`commonPairs = ${iScore}`);
  return iScore;
}

var th = function(oCode) {
  let iScore = 0;
  let pTH = getEncryptedPair(oCode, 't', 'h');
  let iTH = getEFPIndex(pTH);
  if (aoEPF[iTH].frequency > 0.02) {
    iScore+=5;
  }

//  console.log(`th = ${iScore}`);
  return iScore;
}

var q = function(oCode) {
  let iScore = 0;
  let bIsQ = true;
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function(p2) {
    let pqX = getEncryptedPair(oCode, 'q', p2);
    let iqX = getEFPIndex(pqX);
    if (aoEPF[iqX].frequency !== 0) {
      bIsQ = false;
    }
  });

  if (bIsQ) {
    iScore = 3;
  }

//  console.log(`q = ${iScore}`);
  return iScore;
}

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

var aScoringFunctions = [neverPairs,veryCommonPairs,commonPairs,likelyPairs,rarePairs,ae,th,q];

/*
 * makePairProbability
 *
 * Given oConfig.aoPairFrequency, which is the frequency
 * of pairs in a plain text object, get these arrays:
 *
 * aNeverPairs - these pairs never occur
 * aVeryCommonPairs - pair frequency > .02
 * aCommonPairs - pair frequency > .01
 * aLikelyPairs - pair frequency > .005
 *
 * Yes, this is bad form, but it was close to midnight
 * It should be all in one nice recursive function that makes
 * an array of arrays and then the scoring functions should
 * be parameterized...
 *
 * Sorry.  I have to go to work tomorrow.  You know?  The
 * job that pays me?
 *
 * As fun as coding challenges are, they don't pay the bills.
 */
function makePairProbability(oConfig) {
  let aoPPF = oConfig.aoPairFrequency;
  let aoPPFReduce = R.clone(aoPPF);

  for (let i = 0; i < aoPPF.length; i++) {
//    console.log(`aoPPF[${i}] = ` + JSON.stringify(aoPPF[i], null, 2));
    if (aoPPF[i].frequency === 0) {
//      console.log('found a never');
      aNeverPairs.push(aoPPF[i].pair);
      aoPPFReduce.splice(i, 1);
    }
  }

  let aoPPFReduce1 = R.clone(aoPPFReduce);
  for (let i = 0; i < aoPPFReduce.length; i++) {
    if (aoPPF[i].frequency > 0.02) {
      aVeryCommonPairs.push(aoPPFReduce[i].pair);
      aoPPFReduce1.splice(i, 1);
    }
  }

  let aoPPFReduce2 = R.clone(aoPPFReduce1);
  for (let i = 0; i < aoPPFReduce1.length; i++) {
    if (aoPPF[i].frequency > 0.01) {
      aCommonPairs.push(aoPPFReduce1[i].pair);
      aoPPFReduce2.splice(i, 1);
    }
  }

  let aoPPFReduce3 = R.clone(aoPPFReduce2);
  for (let i = 0; i < aoPPFReduce2.length; i++) {
    if (aoPPF[i].frequency > 0.01) {
      aLikelyPairs.push(aoPPFReduce2[i].pair);
      aoPPFReduce3.splice(i, 1);
    }
  }
}

function score(oCode) {
  var iTotalScore = 0;
  for (let i = 0; i < aScoringFunctions.length; i++) {
    iTotalScore += aScoringFunctions[i](oCode);
  }

//  console.log('iTotalScore = ' + iTotalScore);
  return iTotalScore;
}

function getCipher(oCode) {
  let sCipher = '';
  for (let i = 0; i < c.abc.length; i++) {
    let letter = c.abc[i];
    sCipher += oCode[letter];
  }

  return sCipher;
}

function getCode(aoEncrypted, aoPlain) {
  console.log('aoEncrypted[0] = ' + JSON.stringify(aoEncrypted[0], null, 2));
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
  let oCode = getCode(a, aoPlainSorted);
  obj.iScore = score(oCode);
  obj.aoES = a;

  let sCipher = getCipher(oCode);
  let s = getString(a);
//  console.log(`string ${s} score = ${obj.iScore}`);
//  console.log('iScore = ' + obj.iScore);
  aoScores.push(obj);
//  console.log('# of arrays = ' + aoScores.length);
}

function getString(a) {
  let str = '';
  for (let i = 0; i < a.length; i++) {
    str += a[i].letter;
  }
  return str;
}

function permuteAndScoreSection(a, beg, end) {
  let s = getString(a);
//  console.log(`beg = ${beg}; end = ${end}; string = ${s}`);
  scoreAndSave(a);
  if (beg === end) {
    return;
  }
  else {
    for (let j = beg; j <= end; j++) {
      permuteAndScoreSection(
        swapArrayElements (a, beg, j), beg + 1, end);
//      let aSwap = swapArrayElements (a, beg, j);
//      permuteAndScoreSection(aSwap, beg + 1, end);
//      a = swapArrayElements (aSwap, beg, j); 
    }
  }
}

function getArrayWithBestScore() {
  let aoScoresSorted = aoScores.sort(
    function(obj1, obj2) {
      return obj2.iScore - obj1.iScore;
    }
  );
  console.log(JSON.stringify(aoScoresSorted[0], null, 2));

//	let oCode = aoScoresSorted[0].oCode;
//  let sCipher = getCipher(oCode);
  return aoScoresSorted[0].aoES;
  /*
  var aoES = R.clone(aoScoresSorted[0].aoES);
//  console.log('sCipher = ' + sCipher);
  console.log('score = ' + aoScoresSorted[0].iScore);
//  console.log('# of arrays = ' + aoReallySorted.length);
  // fancy way to empty array
  aoScores.splice(0,aoScores.length);
  return aoES;
 */
}

/*
 * aoES means aoEncryptedSorted
 */
function permuteAndScore(aoES) {
  console.log('permuteAndScore');
  let s = getString(aoES);
  console.log(`beginning array: ${s}`);
  let lenSection = 4;
  let last = c.alphabetLength - lenSection;

  for (let i = 0; i < last; i++) {
    console.log(`permuteAndScoreSection(${i}, ${i + lenSection})`);
    permuteAndScoreSection (aoES, i, i + lenSection)
    // BESSIE - this should not get a code.  It should get an array
    aoES = getArrayWithBestScore();
    console.log('IMPORTANT aoES typeof = ' + typeof aoES);
    s = getString(aoES);
    console.log(`section ${i} array: ${s}`);
  }

  console.log('before get final oCode');
  console.log('aoES = ' + JSON.stringify(aoES, null, 2));
  let oCode = getCode(aoES, aoPlainSorted);
  return addCodeUpperCase(oCode);
/*  console.log('aNeverPairs = ' + JSON.stringify(aNeverPairs, null, 2));
  console.log('aVeryCommonPairs = ' + JSON.stringify(aVeryCommonPairs, null, 2));
  console.log('aCommonPairs = ' + JSON.stringify(aCommonPairs, null, 2));
  console.log('aLikelyPairs = ' + JSON.stringify(aLikelyPairs, null, 2));
 */
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
   * aoPlainSorted is a global variable.  It will never
   * change.  It is the letters sorted by frequency.
   *
   * Meanwhile, aoEncryptedSorted is a local variable.
   * Arrays are immutable, which means that if you want
   * to sort it, you have to make a new one.  Many new
   * ones will be made as the letters are permuted and
   * the sort is scored to find the best one.
   *
   */
  aoPlainSorted = oConfig.aoLetterFrequency.sort(
    function(obj1, obj2) {
      return obj2.frequency - obj1.frequency;
    }
  );

  let aoEncryptedSorted = [];
  aoEncryptedSorted = aoLetterFrequency.sort(
    function(obj1, obj2) {
      return obj2.frequency - obj1.frequency;
    }
  );

//  log('plainSorted = ' + JSON.stringify(aoPlainSorted, null, 2), oConfig);
//  log('encryptedSorted = ' + JSON.stringify(aoEncryptedSorted, null, 2), oConfig);

  if (aoPlainSorted.length !== 26 || 
      aoEncryptedSorted.length !== 26) {
    cb('The two letter frequency arrays lengths is wrong.  They should both be 26', null, null, oConfig);
  }

  test.letterFrequency(aoEncryptedSorted, function (err, fMinDiff) {
    if (err) {
      cb(err, null, null, oConfig);
    }
    log(`fMinDiff for ${oConfig.sEncryptedFilePath} is ${fMinDiff}.  This is the minimum difference between the frequencies`, oConfig);

    /* analyze the plain pairs to find which pairs
     * are common
     */
    makePairProbability(oConfig);

    let oCode = permuteAndScore(aoEncryptedSorted); 

    let sCipher = getCipher(oCode);

    oCode = addCodeUpperCase(oCode);

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
