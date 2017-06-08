'use strict'

const analyze     = require('./modules/analyze');
const decode      = require('./modules/decode');
const initialize  = require('./modules/initialize');
const terminate   = require('./modules/terminate');

/*
 * There are two phases to figuring this out:
 *
 * 1.  Analyze some English text to for patterns.
 *     It counts all the letters and all the pairs of letters
 *     and then calculates the frequency at which they appear.
 *     So, the pattern is frequency of occurence.
 *
 * 2.  Decode the encrypted text.  There are three parts:
 *
 *     a.) Analyze the encrypted text.  This is the same as
 *         analyzing the English text.  Just count the letters
 *         and pairs, and then calculate the frequency of
 *         occurence.
 *
 *     b.) Figure out the cipher.  By putting the frequencies
 *         in order, you can figure out a one-to-one corresondence.
 *         If just doing the letter frequencies doesn't make it
 *         clear, you can do the pairs.
 *
 *      c.) Use the cipher to decrypt the encrypted text.
 *
 * This code has a big JSON object, oConfig, it carries around 
 * with it. At each stage more information is put in the oConfig object
 * until it has everything in it.
 *
 * This is designed so that by default it will analyze a file called
 * 'plain.txt', and decrypt a file called 'encrypted.txt'.  If those
 * files are in place, you can type:
 *
 *    node cipher.js
 *
 * from the command line, and it should work ... provided you have
 * node installed and have done npm install.
 */

// TO DO - Grow up! Use promises.:w


function step4(err, oConfig) { // JavaScript is upside down
  terminate(err, oConfig);
}

function step3(err, oConfig) {
  if (err) {
    terminate(err, oConfig);
  }

  decode(oConfig, step4);
}

function step2(err, oConfig) {
  if (err) {
    terminate(err, oConfig);
  }

  analyze.plain(oConfig, step3);
}

function step1() {
  initialize(step2)
}

step1();
