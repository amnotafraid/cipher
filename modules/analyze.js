'use strict'
const fs          = require('fs');
const through2    = require('through2');

const c           = require('./constants');
const log         = require('./log');
const test        = require('./test');

/*
 * getZeroedLetterCounter
 *
 * returns an object like this:
 *
 *  {
 *    iTotalCount: 0,
 *    oLetterCounts: {
 *      a:0,
 *      b:0,
 *      ...
 *      z:0
 *    }
 *  }
 */
function getZeroedLetterCounter() {
  let oLetterCounter = {};

  oLetterCounter.iTotalCount = 0;
  oLetterCounter.oLetterCounts = {};

  for (let i = 0; i < c.abc.length; i++) {
    let letter = c.abc[i];
    oLetterCounter.oLetterCounts[letter] = 0;
  }

  return oLetterCounter;
};

/*
 * getZeroedPairCounter
 *
 * returns an object like this:
 *
 *  {
 *    iTotalCount: 0,
 *    oPairCounts: {
 *      aa:0,
 *      ab:0,
 *      ac:0,
 *      ...
 *      mp:0,
 *      mq:0,
 *      mr:0,
 *      ...
 *      zx:0,
 *      zy:0,
 *      zz:0,
 *    }
 *  }
 */
function getZeroedPairCounter() {
  let oPairCounter = {};

  oPairCounter.iTotalCount = 0;
  oPairCounter.oPairCounts = {};

  for (let i = 0; i < c.abc.length; i++) {
    let letter1 = c.abc[i];
    for (let j = 0; j < c.abc.length; j++) {
      let letter2 = c.abc[j];
      oPairCounter.oPairCounts[letter1+letter2] = 0;
    }
  }

  return oPairCounter;
};

/*
 * this is a filter for a pipe.  It is going to:
 *
 *    1.) only allow letters and white space
 *    2.) change all white space to one space
 *    3.) get to lower case
 */
var lowerCaseNSpace = through2((data, enc, cb) => {
  cb(null, new Buffer(data.toString()
                          .replace(/[^a-zA-Z\s]/g, '')
                          .replace(/\s+/g,' ')
                          .toLowerCase()));
});

/*
 * this is a filter for a pipe.  It keeps track of how
 * many letters there are.  It also counts pairs of letters.
 */
var countLetters = through2((data, enc, cb) => {
  let str = data.toString();

  for (let i = 0, x = 0; i < str.length; i++, x++) {
    // If x = 0, it is the beginning of a word
    if (str[i] === ' ') {
      x = 0;
    }
    else {
      oLetterCounter.iTotalCount++;
      if (oLetterCounter.iTotalCount % 1024 === 0) {
        process.stdout.write('. ');
      }
      oLetterCounter.oLetterCounts[str[i]]++;
      if (x > 0) {
        oPairCounter.iTotalCount++;
        oPairCounter.oPairCounts[str[i-1]+str[i]]++;
      }
    }
  }
  cb();
});
  
/*
 * Now that all the letters and pair are counted, this will
 * divide the total count by the individual count and save
 * them in arrays that look like this:
 *
 *    [
 *      {
 *        letter: 'a',
 *        frequency: 0.03
 *       },
 *       {
 *         letter: 'b',
 *         frequency: 0.0198
 *       },
 *       ...
 *    ]
 *
 * -or-
 *    [
 *      {
 *        pair: 'aa',
 *        frequency: 0
 *      },
 *      ...
 *    ]
 *
 * oPairFrequency is like this:
 * {
 *   aa: frequency,
 *   ab: frequency,
 *   ...
 *   zy: frequency,
 *   zz: frequency
 * }
 *
 * Later on, you can do an array sort on the fequency
 *
 * The callback looks like this:
 *
 *  cb(null, aoLetterFrequency, oPairFrequency, aoSortablePairFrequency)
 */
var calculateFrequency = (oConfig, cb) => {
  log('\ncalculateFrequency', oConfig);
  var aoLetterFrequency = [];
  var aoPairFrequency = [];
  var oAllPairFrequency = {};

  if (oLetterCounter.iTotalCount > 26) {
    for (let i = 0; i < c.abc.length; i++) {
      let oLetterFrequency = {};
      oLetterFrequency.letter = c.abc[i];
      oLetterFrequency.frequency = oLetterCounter.oLetterCounts[c.abc[i]] /
                                    oLetterCounter.iTotalCount;
      aoLetterFrequency.push(oLetterFrequency);

      for (let j = 0; j < c.abc.length; j++) {
        let oPairFrequency = {};
        let pair = c.abc[i]+c.abc[j];
        oPairFrequency.pair = pair;
        oPairFrequency.frequency = oPairCounter.oPairCounts[pair] /
                                    oPairCounter.iTotalCount;

        oAllPairFrequency[pair] = oPairFrequency.frequency;
        aoPairFrequency.push(oPairFrequency);
      }
    }

    cb(null, aoLetterFrequency, oAllPairFrequency, aoPairFrequency);
  }
  else {
    cb(`There are only ${oLetterCounter.iTotalCount} letters to analyze.  It's not enough to figure it out.  Sorry. :-(`, null, null);
  }
};

var oLetterCounter;
var oPairCounter;

/*
 * This is to analyze the sample text that's used to decode
 * the encrypted stuff.
 *
 * The callback looks like this:
 *
 * cb(null, oConfig); // the null is for an error
 */
exports.plain = (oConfig, cb) => {
  log('analyzePlain', oConfig);

  oLetterCounter = getZeroedLetterCounter();
  oPairCounter = getZeroedPairCounter();

  if (oConfig.bAnalyze) {
    fs.createReadStream(oConfig.sAnalyzeFilePath, {
      encoding: 'utf8'
    })
    .on('error', function(err) {
      cb(err, oConfig)
    })
    .pipe(through2((data, enc, cb) => {
      cb(null, new Buffer(data.toString()
                              .replace(/[^a-zA-Z\s]/g, '')
                              .replace(/\s+/g,' ')
                              .toLowerCase()));
      })
    )
    .on('error', function(err) {
      cb(err, oConfig)
    })
    .pipe(through2((data, enc, cb) => {
      let str = data.toString();

      for (let i = 0, x = 0; i < str.length; i++, x++) {
        // If x = 0, it is the beginning of a word
        if (str[i] === ' ') {
          x = 0;
        }
        else {
          oLetterCounter.iTotalCount++;
          if (oLetterCounter.iTotalCount % 1024 === 0) {
            process.stdout.write('. ');
          }
          oLetterCounter.oLetterCounts[str[i]]++;
          if (x > 0) {
            oPairCounter.iTotalCount++;
            oPairCounter.oPairCounts[str[i-1]+str[i]]++;
          }
        }
      }
      cb();
    }))
    .on('error', function(err) {
      cb(err, oConfig)
    })
    .on('finish', function () {
      calculateFrequency(oConfig, 
        function(err, aoLetterFrequency, oPairFrequency, aoPairFrequency) {
          if (err) {
            cb(err, oConfig);
          }

          oConfig.aoLetterFrequency = aoLetterFrequency;
          oConfig.oPairFrequency = oPairFrequency;
          oConfig.aoSortablePairFrequency = aoPairFrequency;

          let aoPlainSorted = oConfig.aoLetterFrequency.sort(
            function(obj1, obj2) {
              return obj1.frequency - obj2.frequency;
            }
          );

          test.letterFrequency(aoPlainSorted, 
            function (err, fMinDiff) {
              if (err) {
                cb (err, oConfig);
              }

              cb (null, oConfig);
            });
        });
    });
  }
  else {
    cb(null, oConfig);
  }
}

/*
 * This is to analyze the text that needs to be decoded.
 * It assumes that there is indeed a file to analyze.
 *
 * The letter and pair counter frequencies are returned
 * as parameters:
 *
 * cb(null, oLetterCounter, oPairCounter, oConfig);
 */
exports.encrypted = (oConfig, cb) => {
  log('analyzeEncrypted', oConfig);

  oLetterCounter = getZeroedLetterCounter();
  oPairCounter = getZeroedPairCounter();

  console.log(`encrypted file = ${oConfig.sEncryptedFilePath}`);
  fs.createReadStream(oConfig.sEncryptedFilePath, {
    encoding: 'utf8'
  })
  .on('error', function(err) {
    console.log('error1 = ' + error);
    cb(err, null, null, oConfig);
  })
  .pipe(through2((data, enc, cb) => {
    cb(null, new Buffer(data.toString()
                            .replace(/[^a-zA-Z\s]/g, '')
                            .replace(/\s+/g,' ')
                            .toLowerCase()));
    })
  )
  .on('error', function(err) {
    console.log('error2 = ' + err);
    cb(err, null, null, oConfig);
  })
  .pipe(through2((data, enc, cb) => {
    let str = data.toString();

    for (let i = 0, x = 0; i < str.length; i++, x++) {
      // If x = 0, it is the beginning of a word
      if (str[i] === ' ') {
        x = 0;
      }
      else {
        oLetterCounter.iTotalCount++;
        if (oLetterCounter.iTotalCount % 1024 === 0) {
          process.stdout.write('. ');
        }
        oLetterCounter.oLetterCounts[str[i]]++;
        if (x > 0) {
          oPairCounter.iTotalCount++;
          oPairCounter.oPairCounts[str[i-1]+str[i]]++;
        }
      }
    }
    cb();
  }))
  .on('error', function(err) {
    console.log('error3 = ' + err);
    cb(err, null, null, oConfig);
  })
  .on('finish', function () {
    console.log('\nfinish');
    calculateFrequency(oConfig, 
      function(err, aoLetterFrequency, oPairFrequency, aoPairFrequency) {
        console.log('callback calculatedFrequency');
        if (err) {
          console.log('err = ' + err);
          cb(err, null, null, oConfig);
        }

        console.log('non error callback to decode');
        cb (null, aoLetterFrequency, oPairFrequency, aoPairFrequency, oConfig);
      });
  });
}
