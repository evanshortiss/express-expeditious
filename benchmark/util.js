'use strict';

// Used to select a random continent from the above array
exports.getRandomInt = (min, max) => {
  return Math.floor( Math.random() * (max - 1 - min + 1) ) + min;
};
