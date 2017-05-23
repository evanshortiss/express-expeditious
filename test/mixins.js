'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('mixins', () => {
  let mod, getter, middleware, opts, cache;

  beforeEach(() => {
    getter = sinon.stub();
    middleware = {};
    opts = {
      defaultTtl: 60000,
      namespace: 'awesomeurls',
      statusCodeExpires: {
        404: 60 * 60 * 1000
      }
    };
    cache = {
      flush: sinon.stub()
    };

    mod = require('lib/mixins')(getter, middleware, opts, cache);
  });

  describe('#withTtl', () => {
    it('should invoke a new instance with ttl of 1 hour', () => {
      const newInstance = {};

      getter.returns(newInstance);

      const ret = mod.withTtl('1 hour');

      expect(
        getter.calledWith({
          defaultTtl: 60 * 60 * 1000,
          namespace: opts.namespace,
          statusCodeExpires: opts.statusCodeExpires
        })
      ).to.be.true;

      expect(ret).to.equal(newInstance);
    });
  });

  describe('#withTtlForStatus', () => {
    it('should invoke a new instance with updated statusCodeExpires', () => {
      const newInstance = {};

      getter.returns(newInstance);

      const ret = mod.withTtlForStatus(60 * 1000, 500);

      expect(getter.getCall(0).args[0]).to.deep.equal({
        defaultTtl: opts.defaultTtl,
        namespace: opts.namespace,
        statusCodeExpires: {
          404: 60 * 60 * 1000,
          500: 60 * 1000
        }
      });

      expect(ret).to.equal(newInstance);
    });

    it('should invoke a new instance with statusCodeExpires assigned', () => {
      const newInstance = {};

      getter.returns(newInstance);

      delete opts.statusCodeExpires; // test if no expires already exist

      const ret = mod.withTtlForStatus(60 * 1000, 500);

      expect(getter.getCall(0).args[0]).to.deep.equal({
        defaultTtl: opts.defaultTtl,
        namespace: opts.namespace,
        statusCodeExpires: {
          500: 60 * 1000
        }
      });

      expect(ret).to.equal(newInstance);
    });
  });

  describe('#withCondition', () => {
    it('should invoke a new instance with a new shouldCache entry', () => {
      const newInstance = {};
      const fn = () => {
        return true;
      };

      getter.returns(newInstance);

      const ret = mod.withCondition(fn);

      expect(getter.getCall(0).args[0]).to.deep.equal({
        defaultTtl: opts.defaultTtl,
        namespace: opts.namespace,
        statusCodeExpires: opts.statusCodeExpires,
        shouldCache: fn
      });

      expect(ret).to.equal(newInstance);
    });
  });

  describe('#withConfigOverrides', () => {
    it('should invoke a new instance overrides for the originals', () => {
      const newInstance = {};

      getter.returns(newInstance);

      const ret = mod.withConfigOverrides({
        namespace: 'newnamespace',
        defaultTtl: 10000
      });

      expect(getter.getCall(0).args[0]).to.deep.equal({
        defaultTtl: 10000,
        namespace: 'newnamespace',
        statusCodeExpires: opts.statusCodeExpires
      });

      expect(ret).to.equal(newInstance);
    });
  });

  describe('#withNamespace', () => {
    it('should invoke a new instance with a new namespace', () => {
      const newInstance = {};

      getter.returns(newInstance);

      const ret = mod.withNamespace('ns');

      expect(getter.getCall(0).args[0]).to.deep.equal({
        defaultTtl: opts.defaultTtl,
        namespace: 'ns',
        statusCodeExpires: opts.statusCodeExpires
      });

      expect(ret).to.equal(newInstance);
    });
  });

  describe('#withCacheKey', () => {
    it('should invoke a new instance the new genCacheKey function', () => {
      const newInstance = {};
      const fn = () => {
        return 'key';
      };

      getter.returns(newInstance);

      const ret = mod.withCacheKey(fn);

      expect(getter.getCall(0).args[0]).to.deep.equal({
        defaultTtl: opts.defaultTtl,
        namespace: opts.namespace,
        statusCodeExpires: opts.statusCodeExpires,
        genCacheKey: fn
      });

      expect(ret).to.equal(newInstance);
    });
  });

  describe('#withSessionAwareness', () => {
    it('should invoke a new instance with opts.sessionAware = false', () => {
      const newInstance = {};

      getter.returns(newInstance);

      const ret = mod.withSessionAwareness(false);

      expect(getter.getCall(0).args[0]).to.deep.equal({
        defaultTtl: opts.defaultTtl,
        namespace: opts.namespace,
        statusCodeExpires: opts.statusCodeExpires,
        sessionAware: false
      });

      expect(ret).to.equal(newInstance);
    });

    it('should invoke a new instance with opts.sessionAware = true', () => {
      const newInstance = {};

      getter.returns(newInstance);

      const ret = mod.withSessionAwareness(true);

      expect(getter.getCall(0).args[0]).to.deep.equal({
        defaultTtl: opts.defaultTtl,
        namespace: opts.namespace,
        statusCodeExpires: opts.statusCodeExpires,
        sessionAware: true
      });

      expect(ret).to.equal(newInstance);
    });

    it('should invoke a new instance with opts.sessionAware = true', () => {
      const newInstance = {};

      getter.returns(newInstance);

      const ret = mod.withSessionAwareness();

      expect(getter.getCall(0).args[0]).to.deep.equal({
        defaultTtl: opts.defaultTtl,
        namespace: opts.namespace,
        statusCodeExpires: opts.statusCodeExpires,
        sessionAware: true
      });

      expect(ret).to.equal(newInstance);
    });
  });

  describe('#flush', () => {
    it('should call flush on the underlying cache and succeed', (done) => {
      cache.flush.yields(null);

      mod.flush('ns', () => {
        expect(cache.flush.called).to.be.true;
        done();
      });
    });

    it('should call flush on the underlying cache and get an error', (done) => {
      cache.flush.yields(new Error('something went wrong'));

      mod.flush('ns', (err) => {
        expect(err.toString()).to.contain(
        `error flushing cache for namespace ${opts.namespace} : ns`
        );
        done();
      });
    });
  });

});
