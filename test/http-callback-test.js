var expect = require('expect.js'),
    callback = require('../'),
    http = require('http'),
    request = require('request');

describe('http calback', function() {

  var subject;

  describe('Server', function() {
    beforeEach(function() {
      subject = new callback.Server({
        id: 'xxx',
        port: 607701,
        ip: '127.0.0.1'
      });
    });

    describe('initialization', function() {
      it('should set id', function() {
        expect(subject.id).to.be('xxx');
      });

      it('should set port', function() {
        expect(subject.port).to.be(607701);
      });

      it('should set .url', function() {
        var url = 'http://127.0.0.1:607701/callback?TOKEN=xxx';
        expect(subject.url).to.be(url);
      });
    });

    describe('.run', function() {
      beforeEach(function() {
        subject.run();
      });

      afterEach(function() {
        subject.httpServer.close();
      });

      it('should be running', function() {
        expect(subject.running).to.be(true);
      });

      it('should start http server', function() {
        expect(subject.httpServer).to.be.a(http.Server);
      });
    });

  });


  describe('.create', function() {
    var calledWith = null;

    afterEach(function() {
      if (subject && subject.httpServer) {
        try {
          subject.httpServer.close();
        } catch (e) {
          // we don't care
        }
      }
    });

    function createSubject() {
      var args = Array.prototype.slice.call(arguments);

      beforeEach(function(done) {
        calledWith = null;

        function onServer(err, server) {
          if (err) {
            return done(err);
          }
          subject = server;
          subject.on('callback', function(data) {
            calledWith = data;
          });
          done();
        }

        args.push(onServer);
        callback.apply(this, args);
      });
    }

    describe('when callback times out', function() {
      var calledWith;
      createSubject({ timeout: 250 });

      it('should send timeout error', function(done) {
        subject.on('error', function(err) {
          expect(err.message).to.match(/time/i);
          done();
        });
      });
    });

    describe('without options', function() {
      createSubject();

      it('should fire callback when sent a http request', function(done) {
        //force localhost
        var url = subject.url.replace(subject.ip, 'localhost');
        request.post({
          uri: url,
          qs: { magic: '1' },
          headers: { 'X-Magic': true },
          body: 'zomg'
        });

        subject.on('callback', function() {
          expect(subject.running).to.be(false);
          expect(calledWith.query.magic).to.eql(1);
          expect(calledWith.headers['x-magic']).to.equal('true');
          expect(calledWith.body).to.equal('zomg');
          done();
        });
      });
    });


  });

});
