<a id="top"></a>
# Cipher

* [Overview](#overview)

* [Premise](#premise)

* [How to run](#executing)

* [How does this work?](#top-1)

* [Options](#options)

* [Areas for Improvement](#areas-for-improvement)

* [Making a Front End](#making-a-frontend)

<a id="overview"></a>
## Overview [top](#top)
This is to decode an encrypted file, encrypted.txt, using the language patterns found in the sample file, plain.txt.

To build and run (it is assumed that you have Node installed on your computer):

```
git clone ...
npm install
npm run watch
```
<a id="premise"></a>
## Premise [top](#top)

Given a sample file named `plain.txt` that contains a (large) sample of a Roman-based language[*](#note-1) and an encrypted[**](#note-2) file named `encrypted.txt`, this command line program will figure out the cipher key and decrypt the file.

<a id="executing"></a>
## How to run [top](#top)

To run the program, first get the code and build it as described above.  Next, get your files (encrypted.txt and plain.txt) and put them in the directory with the code.  Then, run the program:

```
node cipher.js
```
When it gets done, the decoded text will be in decoded.txt.  The cipher key will be printed on the terminal.  The cipher key is a letter-for-letter substitution.


You can also run it continuously if you have nodemon installed on your computer like this:
```
npm run watch
```

Nodemon will watch for any changes in the \*.js files and start the program over if it sees one.

<a id="top-1"></a>
## How does this work? [top](#top)
This is a Geek-worthy solution that optionally uses recursion and will analyze the file to correctness. It uses the following steps:

-  Analyze
-  Find Key
-  Decode

### Analyze [How](#top-1)

The letters in the `plain.txt` file are read and counted.  Also, the pairs of letters are counted, for example, 'aa', 'ab',...  Usually the most common letter combination in the English language is 'th'.  Anyway, all the frequencies of the occurences of the letters and the pairs are calculated and saved for the next phase ...

### Find Key [How](#top-1)

The `encrypted.txt` is also analyzed to find its character and pair frequencies.  By sorting the encrypted letter frequencies in the same order as the plain text frequencies, you can get a cipher key that is enough to help you figure out what the text is, but it likely won't be accurate.  It's hard to distinguish between letters that have very similar frequencies.

Here is a table of the letter frequencies in the English language:

| Letter | Frequency 
| ------------- | ------------- |
| E | 12.7 |
| T | 9.1 |
| A | 8.2 |
| O | 7.5 |
| I | 7.0 |
| N | 6.7 |
| S | 6.3 |
| H | 6.1 |
| R | 6.0 |
| D | 4.3 |
| L | 4.0 |
| U | 2.8 |
| C | 2.8 |
| M | 2.4 |
| W | 2.4 |
| F | 2.2 |
| Y | 2.0 |
| G | 2.0 |
| P | 1.9 |
| B | 1.5 |
| V | 1.0 |
| K | 0.9 |
| X | 0.2 |
| J | 0.2 |
| Q | 0.1 |
| Z | 0.1 |

The pairs can also be used to figure out if the decryption key is correct.  As already mentioned, 'th' is a popular pair.  So the encrypted key can be used to compare the pair frequencies.

There is a collections of functions that analyze and score the 'likenesses' of the pair frequencies.  A few language specific rules can be added, but for the most part, the way the pairs are compared is *language agnostic*.

An example of a language specific scoring function would be to look for 'q', which only appears in conjunction with 'u' in the English language.  Another handy one is that 'ee' is often repeated, but 'aa' is very rare.  'ea' is about ten times more likely than 'ae'.

Knowing that sorting by letter frequencies will give an approximation of a correct cipher key, sections of the sorted key are permuted and scored.  The permutation with the highest score wins.

### Decode [How](#top_1)
Once the cipher key is found, it's just a matter of substituting letter for letter what the text is.

<a id="options"></a>
## Options [top](#top)
There is a file modules/initialization that has some 'flags' and variables that can be modified to change the functioning of the program.  Here's what they do:

| Variable/Flag | Description 
| ------------- | ------------- |
| bLogConsole | If it's true, output status messages to the console.  This doesn't work right because the programmer (that's me) didn't use the log function consistently. |
| bAnalyze | If analysis has already been done and the data is available, the analysis phase can be skipped.  The point is a bit moot because I never made a way to save the output of the aanalysis |
| bDecode | Set this to false if you want to skip the decoding phase.  Why would you do that?  That's no fun. |
| bInDepthDecode | Set this to true if you want to do the permutations and scoring to get a better cipher code |
| bOutputConsole | Set this to true if you want to output the decoded text to the console rather than to a file |
| sAnalyzeFile | This is the file to analyze.  The default is `plain.txt` |
| sEncryptedFile | This is the file to decrypt. The default is `encrypted.txt` |
| sDecodedFile | This is the file to output the decrypted text to.  The default is  `decoded.txt` |

<a id="areas-for-improvement"></a>
## Areas for Improvement [top](#top)
*NOTE*:  I designed it to be run as a command-line program.  To me, the challenge was being able to figure out how to get the correct key.  The endpoints are called in succession by the main file `cipher.js`.
* Add command line parameters that can control all the options
* Tighten up the logging to console so that bLogConsole actually controls that
* Grow up and `Promise`-ize this code.  I was forced to use it in decode when I get the cipher key.  The thing would return before it had the cipher key and the replacement stream would error out.  `Promises` should be used consistently for more reliability--prevent the race conditions, rather than fixing them after they happen.
* Tighten up what version of JavaScript standard is adhered to.  I started out with good intentions to us ES2015, but as I got more involved, I fell into old habits.
* Try it on a different language.  Will it work?  I think it will.  *Oh, hey* a *language* option could be added to choose a specific language.  There could be different scoring functions for different languages.
* Move the stuff from `modules/decode.js` about finding the cipher key to `modules/findKey.js`. That way it can be more modularized. 
* *TDD* It's kind of like closing the barn door after the horse got out, but this project really could have benefited from some test driven development.  I spent a whole bunch of time chasing really stupid and obvious bugs.  C'est la vie.  Live and learn.

<a id="making-a-frontend"></a>
## Making a Front End [top](#top)
I'm currently working in eCommerce.  When you buy products online, there is sort of a multi-step process, right?  You add items to a 'cart', you fill in your shipping information, you choose a shipment option (regular mail, 2nd-day, crazy expensive overnight...), you include payment information.  Behind the scenes there is an object that gets completed with more and more infomation:  products, shipping address, customer information, shipping option, and finally payment.

This project reminded me of that.  There are steps: analyze, find the cipher key, decode.  It occured to me that the user might wish to use the same cipher key on another encrypted file.  Or, they might not want to analyze text again.

So, I made this object called `oConfig` that gets passed between the different stages, collecting more information at each step.

I think this project would lend itself to a widget with steps. Each step could fill out more information in the `oConfig`:

1. Analyze - choose a plain.txt file or use frequency analysis that has already been done.
2. FindKey - choose an encrypted file to get a key for, *or* choose a previously used cipher key.
3. Decode - If there wasn't a file chosen in step 2, choose a file, or enter some text to decode
4. Finish - decoded text is downloaded or displayed as desired.

These steps could each use as endpoints the exported function from the file with the step's name.

The whole thing could benefit from a little MongoDB database on the backend to store some information:

* Frequency analysis of language specific text.
* Cipher keys
* __Maybe__ language rules.  Not sure how to accomplish that since they are functions that the find key stage runs.


<a id="note-1"></a>\* A Roman-based language is based on the Roman alphabet a-z, with 26 lower case letters and 26 upper case letters.

<a id="note-2"></a>\*\* Encrypted means a letter for letter substitution.

