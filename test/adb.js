const {expect} = require('chai');

const Adb = require('../src/adb');
const Client = require('../src/adb/client');
const Keycode = require('../src/adb/keycode');
const util = require('../src/adb/util');

describe('Adb', function() {

  it("should expose Keycode", function(done) {
    expect(Adb).to.have.property('Keycode');
    expect(Adb.Keycode).to.equal(Keycode);
    return done();
  });

  it("should expose util", function(done) {
    expect(Adb).to.have.property('util');
    expect(Adb.util).to.equal(util);
    return done();
  });

  return describe('@createClient(options)', () =>

    it("should return a Client instance", function(done) {
      expect(Adb.createClient()).to.be.an.instanceOf(Client);
      return done();
    })
  );
});
