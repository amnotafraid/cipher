'use strict'

const c           = require('./constants');

/*
 * letterFrequency needs a sorted aoLetterFrequency array.
 * It will test for the folllowing:
 *
 *  all the frequencies are non-zero
 *  there should be a frequency for each letter from a to z
 *  the frequencies should add up to about 1
 *  
 *  fMinDiff - must be greater than .01.  Largest difference between
 *             frequencies
 *
 *  
 * The callback is:
 * 
 *  cb(null, fMinDiff)
 *
 * the first will be an error if there is one
 */
exports.letterFrequency = (aoLetterSorted, cb) => {
  console.log('letterFrequency');
  let fMinDiff = 1.0;
  let fTotal = 0.0;
  let fLastFreq = 0.0;
  let abc = c.abc;

  let bAllLetters = true;

  let error = null;

  if (aoLetterSorted.length !== 26) {
    error = `There were ${aoLetterSorted.length} in the frequency counter, but there should have been 26`;
  }
  else {
    aoLetterSorted.forEach(obj => {
      if (obj.frequency < 0.000001) {
        error = `The frequency for ${obj.letter} was only ${obj.frequency}.  It's too small to make a cipher`;
      }
      fMinDiff = Math.min(fMinDiff, 
                          Math.abs(obj.frequency - fLastFreq));
      fLastFreq = obj.frequency;

      abc = abc.replace(RegExp(obj.letter), '');

      fTotal += obj.frequency;
    });
  }

  // It didn't find a frequency for each letter
  if (abc.length !== 0) {
    error = `A frequency for these letter(s) '${abc} was missing`;
  }

  if (Math.abs(1.0 - fTotal) > 0.000001) {
    error = `All the frequencys only added up to: ${fTotal}.  It should be closer to 1.0`;
  }

  cb(error, fMinDiff);
};

