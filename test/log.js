'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noPreserveCache();

describe('log', function () {
  const req = {
    method: 'GET',
    originalUrl: '/things'
  };

  it('should not log if logging is disabled', () => {
    const logSpy = sinon.spy();
    logSpy.enabled = false;

    const mod = proxyquire('lib/log', {
      'debug': sinon.stub().returns(logSpy)
    })(req);

    mod('log a string');

    expect(logSpy.called).to.be.false;
  });

  it('should log if logging is enabled', () => {
    const logSpy = sinon.spy();
    logSpy.enabled = true;

    const mod = proxyquire('lib/log', {
      'debug': sinon.stub().returns(logSpy)
    })(req);

    mod('log a string');

    expect(logSpy.called).to.be.true;
    expect(logSpy.getCall(0).args[0]).to.equal('GET /things - log a string');
  });
});
