'use strict'

// TO DO - move all the code from decode, getLetterCipherKey 
//         to here.  Make it more modular
//
// Need to change cipher to put this in a call step
// between analyze and decode

module.exports = function(oConfig, cb) {
  log('findKey', oConfig);
  if (oConfig.bDecode) {
  } // endif

  cb(null, oConfig);
}

