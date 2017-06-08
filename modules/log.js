// To do - use this consistently so you can flip
// console logging on/off from the command line
// or .... output to a file
module.exports = function(s, oConfig) {
  if (oConfig.bLogConsole) {
    console.log(s);
  }
}

