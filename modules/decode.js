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

const ABCabc = c.abc + c.ABC;
/*
 * aoScores has objects like this:
 * {
 *    iScore: 9,
 *    aoES: array
 * }
 */
var aoScores = [];
var aoPlainSorted = [];
var aoEPF = []; /* aoSortableEncryptedPairFrequency */
var oEPF = {}; /* tricky - this is a key value where key is encrypted pair
                  and value is frequency */
var oPPF = {};

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
 * frequency difference:
 *
 * if a === b then return 0
 * else (a - b) / ((a + b) / 2)
 */
var diffPercent = function (a, b) {
	if (a === b) {
		return 0;
	}
	else {
		if ((a < 0.0001) || (c < 0.0001)) {
			return 0;
		}
		else {
			return (a - b) / ((a + b) / 2);
		}
	}
}

/*
 * Scoring function have oCode as a parameter
 * and return an integer
 *
 * They have to be declared ABOVE the aScoringFunctions
 * declaration.
 */
var comparePairs = function (oCode) {
	let iScore = 0;
	let pair = 'aa';
	for (let pair in oPPF) {
		let pairStr = String(pair);
		let pairEncrypted = getEncryptedPair(oCode, pairStr[0], pairStr[1]);
		let a = oPPF[pair];
		let b = oEPF[pairEncrypted];
		let x = Math.abs(diffPercent(a, b));
		if (x < 0.10) {
			iScore ++;
		}
	}

//  console.log(`comparePairs = ${iScore}`);
  return iScore;
}

var aNeverPairs = [];
var neverPairs = function (oCode) {
  let iScore = 0;
  aNeverPairs.forEach(function(pair) {
		let pairStr = String(pair);
		let pairEncrypted = getEncryptedPair(oCode, pairStr[0], pairStr[1]);
    let frequency = oEPF[pairEncrypted];
    if (frequency > 0.00001) {
      iScore--;
    }
  });

//  console.log(`neverPairs = ${iScore}`);
  return iScore;
}

var aVeryCommonPairs = [];
var veryCommonPairs = function (oCode) {
  let iScore = 0;
  aVeryCommonPairs.forEach(function(pair) {
		let pairStr = String(pair);
		let pairEncrypted = getEncryptedPair(oCode, pairStr[0], pairStr[1]);
		let a = oPPF[pair];
		let b = oEPF[pairEncrypted];
//		console.log(`${pairEncrypted} frequency is ${a} => ${pair} = is ${b}`);
    let frequency = oEPF[pairEncrypted];
    if (frequency > 0.02) {
      iScore+=10;
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
    let frequency = oEPF[pairEncrypted];
    if (frequency > parseFloat(0.01) && 
        frequency < 0.02) {
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
    let frequency = oEPF[pairEncrypted];
    if (frequency > 0.005 && 
        frequency < 0.01) {
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
    let frequency = oEPF[pairEncrypted];
    if (frequency < 0.000001) {
      iScore++;
    }
  });

//  console.log(`rarePairs = ${iScore}`);
  return iScore;
}

var ae = function (oCode) {
  let iScore = 0;
  let pAA = getEncryptedPair(oCode, 'a', 'a');
  let frequency = oEPF[pAA];
  if (frequency < 0.0001) {
    let pEA = getEncryptedPair(oCode, 'e', 'a');
    let frequencyEA = oEPF[pEA];
    let pAE = getEncryptedPair(oCode, 'a', 'e');
    let frequencyAE = oEPF[pAE];
    if (frequencyAE * 10.0 < frequencyEA) {
      iScore+=20;
    }
  }

//  console.log(`commonPairs = ${iScore}`);
  return iScore;
}

var th = function(oCode) {
  let iScore = 0;
  let pTH = getEncryptedPair(oCode, 't', 'h');
  let frequency = oEPF[pTH];
  if (frequency > 0.02) {
    iScore = 20;
  }

//  console.log(`th = ${iScore}`);
  return iScore;
}

var q = function(oCode) {
  let iScore = 0;
  let bIsQ = true;
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function(p2) {
    let pqX = getEncryptedPair(oCode, 'q', p2);
    if (oEPF[pqX] !== 0) {
      bIsQ = false;
    }
  });

  if (bIsQ) {
    iScore = 20;
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

//var aScoringFunctions = [neverPairs,veryCommonPairs,commonPairs,likelyPairs,rarePairs,ae,th,q];
//var aScoringFunctions = [veryCommonPairs,ae,th,q];
/*--- IMPORTANT:  Below is a list of the scoring functions that will be used ---*/
var aScoringFunctions = [
				veryCommonPairs,
				neverPairs,
				ae,
				th,
				comparePairs,
			];

/*
 * makePairProbability
 *
 * Given oConfig.aoSortaablePairFrequency, which is the frequency
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
 */
function makePairProbability(oConfig) {
//  console.log('aoEPF = ' + JSON.stringify(oConfig.aoSortablePairFrequency, null, 2));
  let aoPPF = R.clone(oConfig.aoSortablePairFrequency);
  let aoPPFReduce = [];

	/* Find the never pairs */
  for (let i = 0; i < aoPPF.length; i++) {
    if (aoPPF[i].frequency === 0) {
      aNeverPairs.push(aoPPF[i].pair);
      aoPPFReduce.push(aoPPF[i]);
    }
  }

//  console.log('aNeverPairs = ' + JSON.stringify(aNeverPairs, null, 2));

  aoPPF = R.difference(aoPPF, aoPPFReduce);
  aoPPFReduce.splice(0,aoPPFReduce.length);

	/* Find the common pairs */
  for (let i = 0; i < aoPPF.length; i++) {
    if (aoPPF[i].frequency > 0.02) {
      aVeryCommonPairs.push(aoPPF[i].pair);
      aoPPFReduce.push(aoPPF[i]);
    }
  }

//  console.log('aVeryCommonPairs = ' + JSON.stringify(aVeryCommonPairs, null, 2));

  aoPPF = R.difference(aoPPF, aoPPFReduce);
  aoPPFReduce.splice(0,aoPPFReduce.length);
  for (let i = 0; i < aoPPF.length; i++) {
    if (parseFloat(aoPPF[i].frequency) > parseFloat(0.01)) {
      aCommonPairs.push(aoPPF[i].pair);
      aoPPFReduce.push(aoPPF[i]);
    }
  }

//  console.log('aCommonPairs = ' + JSON.stringify(aCommonPairs, null, 2));

  aoPPF = R.difference(aoPPF, aoPPFReduce);
  aoPPFReduce.splice(0,aoPPFReduce.length);
  for (let i = 0; i < aoPPF.length; i++) {
    if (parseFloat(aoPPF[i].frequency) > parseFloat(0.005)) {
      aLikelyPairs.push(aoPPF[i].pair);
      aoPPFReduce.push(aoPPF[i]);
    }
  }

//  console.log('aLikelyPairs = ' + JSON.stringify(aLikelyPairs, null, 2));

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
  var obj = {};
  let oCode = getCode(a, aoPlainSorted);
  obj.iScore = score(oCode);
  obj.aoES = R.clone(a);

  let sCipher = getCipher(oCode);
  let s = getString(a);
  console.log(`string ${s} score = ${obj.iScore}`);
  aoScores.push(obj);
}

function getString(a) {
  let str = '';
  for (let i = 0; i < a.length; i++) {
    str += a[i].letter;
  }
  return str;
}

function permuteAndScoreSection(a, beg, end) {
  if (beg === end) {
    return;
  }
  let s = getString(a);
  scoreAndSave(a);

  for (let j = beg; j <= end; j++) {
    permuteAndScoreSection(
      swapArrayElements (a, beg, j), beg + 1, end);
    a = swapArrayElements(a, j, beg);
  }
}

function getArrayWithBestScore() {
  let aoScoresSorted = aoScores.sort(
    function(obj1, obj2) {
      return obj2.iScore - obj1.iScore;
    }
  );

//	console.log(`bestScore = ${aoScoresSorted[0].iScore}`);
  let aoES = R.clone(aoScoresSorted[0].aoES);
	if (aoScoresSorted[0].iScores === aoScoresSorted[1].iScores) {
		console.log('WARNING - alternate permutations have same score, so it will not be possible to know what the accurate sCipher is.  What you can do is add more scoring functions. Please see  aScoringFunctions in modules/decode.js');
	}
  aoScores.splice(0,aoScores.length);
  return aoES;
}

/*
 * aoES means aoEncryptedSorted
 * 
 * This will call back when it's done.  The callback signature is
 *
 *     cb (err, oConfig, oCode);
 */

// To do -- What no errors handling?  Really?
// you need to do error checking
function permuteAndScore(aoES, oConfig, cb) {
	return new Promise((resolve, reject) => {
		if (!oConfig.bInDepthDecode) {
			let oCode = getCode(aoES, aoPlainSorted);
			oCode = addCodeUpperCase(oCode);
			oConfig.oCode = oCode;
			let iScore = score(oCode);
			console.log(`score = ${iScore}`);
			resolve (oConfig);
		}
		else {
			makePairProbability(oConfig);
			/*--- IMPORTANT - If it doesn't decrypt, change
         the lenSection to be larger --*/
			let lenSection = 7;
			let last = c.alphabetLength - lenSection;

			for (let i = 0; i < last; i++) {
				permuteAndScoreSection (aoES, i, i + lenSection)
				aoES = getArrayWithBestScore();
			}

			let oCode = getCode(aoES, aoPlainSorted);
			oCode = addCodeUpperCase(oCode);
			oConfig.oCode = oCode;
			let iScore = score(oCode);
			console.log(`score = ${iScore}`);
			resolve (oConfig);
		}
	});//end Promise
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
 * If it will build oCode that will look like this:
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
 * This returns a Promise. Data if all is well:
 *
 *		oConfig.oCode
 *		oConfig.sCipher 
 *
 */
function getLetterCipherKey(aoLetterFrequency, oConfig) {
	return new Promise((resolve, reject) => {
		if (!Array.isArray(oConfig.aoLetterFrequency)) {
			reject('Original (plain text) letter frequency analysis is missing');
		}
		if (!Array.isArray(aoLetterFrequency)) {
			reject('Encrypted letter frequency analysis is missing');
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

		if (aoPlainSorted.length !== c.abc.length || 
				aoEncryptedSorted.length !== c.abc.length) {
			reject(`The two letter frequency arrays lengths is wrong.  They should both be ${c.abc}`);
		}

		test.letterFrequency(aoEncryptedSorted, function (err, fMinDiff) {
			if (err) {
				reject(err);
			}

			permuteAndScore(aoEncryptedSorted, oConfig)
				.then (oConfig => {
					let sCipher = getCipher(oConfig.oCode);
					oConfig.sCipher = sCipher;
					resolve(oConfig);
				},
				function (error) {
					cb(error);
				});// end permuteAndScore
			});// end test.letter...
	});//end promise
}


/*
 * This file expects there to be analyze information in the 
 * oConfig:
 *
 *    oConfig.aoLetterFrequency
 *    oConfig.aoSortablePairFrequency
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
      function (err, aoEncryptedLetterFrequency, oEncryptedPairFrequency, aoSortableEncryptedPairFrequency, oConfig) {
        log('return from analyze.encrypted', oConfig);
        aoEPF = aoSortableEncryptedPairFrequency;
        oEPF = oEncryptedPairFrequency;
				oPPF = oConfig.oPairFrequency;
        // use letter frequencies to make a cipher
        getLetterCipherKey(aoEncryptedLetterFrequency, oConfig) 
					.then(function(oConfig)  {
						let oCode = oConfig.oCode;

						let outputFile = '';
						if (oConfig.bOutputConsole) {
							outputFile = process.stdout;
						}
					  else {
							outputFile = fs.createWriteStream(oConfig.sDecodedFilePath);
						}
						fs.createReadStream(oConfig.sEncryptedFilePath, {
							encoding: 'utf8'
						})
						.on('error', function(err) {
							cb(err, oConfig)
						})
						.pipe(through2((data, enc, cb) => {
							let str = data.toString();
							let str2 = '';

							for (let i = 0; i < str.length; i++) {
								if (ABCabc.indexOf(str[i]) === -1) {
									str2 += str[i];
								}
								else {
									str2 += oCode[str[i]];
								}
							}
							
							cb(null, new Buffer(str2));
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
							if (!oConfig.bOutputConsole) {
								console.log(`output file is ${oConfig.sDecodedFilePath}`);
							}
						  console.log(`sCipher = ${oConfig.sCipher}`);
							cb (null, oConfig);
						});
					}) // then
					.catch (function(err) {
						console.log(err);
						cb(err, oConfig);
					});
		});
  }
  cb(null, oConfig);
}
