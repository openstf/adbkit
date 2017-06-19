const {expect} = require('chai');

const Protocol = require('../../src/adb/protocol');

describe('Protocol', function() {

  it("should expose a 'FAIL' property", function(done) {
    expect(Protocol).to.have.property('FAIL');
    expect(Protocol.FAIL).to.equal('FAIL');
    return done();
  });

  it("should expose an 'OKAY' property", function(done) {
    expect(Protocol).to.have.property('OKAY');
    expect(Protocol.OKAY).to.equal('OKAY');
    return done();
  });

  describe('@decodeLength(length)', function() {

    it("should return a Number", function(done) {
      expect(Protocol.decodeLength('0x0046')).to.be.a('number');
      return done();
    });

    return it("should accept a hexadecimal string", function(done) {
      expect(Protocol.decodeLength('0x5887')).to.equal(0x5887);
      return done();
    });
  });

  describe('@encodeLength(length)', function() {

    it("should return a String", function(done) {
      expect(Protocol.encodeLength(27)).to.be.a('string');
      return done();
    });

    it("should return a valid hexadecimal number", function(done) {
      expect(parseInt(Protocol.encodeLength(32), 16)).to.equal(32);
      expect(parseInt(Protocol.encodeLength(9999), 16)).to.equal(9999);
      return done();
    });

    it("should return uppercase hexadecimal digits", function(done) {
      expect(Protocol.encodeLength(0x0abc)).to.equal('0ABC');
      return done();
    });

    it("should pad short values with zeroes for a 4-byte size", function(done) {
      expect(Protocol.encodeLength(1)).to.have.length(4);
      expect(Protocol.encodeLength(2)).to.have.length(4);
      expect(Protocol.encodeLength(57)).to.have.length(4);
      return done();
    });

    return it("should return 0000 for 0 length", function(done) {
      expect(Protocol.encodeLength(0)).to.equal('0000');
      return done();
    });
  });

  return describe('@encodeData(data)', function() {

    it("should return a Buffer", function(done) {
      expect(Protocol.encodeData(new Buffer(''))).to.be.an.instanceOf(Buffer);
      return done();
    });

    it("should accept a string or a Buffer", function(done) {
      expect(Protocol.encodeData('')).to.be.an.instanceOf(Buffer);
      expect(Protocol.encodeData(new Buffer(''))).to.be.an.instanceOf(Buffer);
      return done();
    });

    return it("should prefix data with length", function(done) {
      const data = Protocol.encodeData(new Buffer(0x270F));
      expect(data).to.have.length(0x270F + 4);
      expect(data.toString('ascii', 0, 4)).to.equal('270F');
      return done();
    });
  });
});
