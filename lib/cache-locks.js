'use strict';

module.exports = function () {

  const locks = {};

  const locker = {
    /**
     * Add a lock for a resource identified by the given key
     * @param {String} key
     */
    addLock: function (key) {
      locks[key] = true;
    },

    /**
     * Remove a lock on a resource identified by the given key
     * @param  {String} key
     */
    removeLock: function (key) {
      delete locks[key];
    },

    /**
     * Returns a boolean inidicating if the reosurce identified by key is
     * currently locked
     * @param  {String}  key
     * @return {Boolean}
     */
    isLocked: function (key) {
      return locks[key] ? true : false;
    }
  };

  return locker;
};
