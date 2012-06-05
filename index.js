var http = require('http'),
    uuid = require('node-uuid'),
    openport = require('openport'),
    request = require('request'),
    url = require('url'),
    EventEmitter = require('events').EventEmitter;

function Server(options) {
  var key;

  if (typeof(options) === 'undefined') {
    options = {};
  }

  for (key in options) {
    if (options.hasOwnProperty(key)) {
      this[key] = options[key];
    }
  }

  this.url = [
    'http://', this.ip, ':', this.port,
    '/callback?TOKEN=', this.id
  ].join('');
}

Server.prototype = {

  __proto__: EventEmitter.prototype,

  run: function() {
    this.httpServer = new http.Server();
    this.running = true;
    this.httpServer.on('request', this.onRequest.bind(this));
    this.httpServer.listen(this.port);
  },

  onRequest: function(req, res) {
    var urlData = url.parse(req.url, true),
        buffer = '', self = this;

    if (urlData.query.TOKEN == this.id) {
      req.on('data', function(data) {
        buffer += data.toString();
      });

      req.on('end', function() {
        self.emit('callback', {
          body: buffer,
          query: urlData.query,
          host: urlData.host,
          headers: req.headers
        });
        res.writeHead(200);
        res.end();
        self.running = false;
        self.httpServer.close();
      });
    } else {
      res.writeHead(500);
      res.end();
    }
  }

};

function getPublicIp(callback) {
  request.get('http://ifconfig.me/ip', function(error, response, body) {
    if (!callback) {
      return;
    }

    if (!error) {
      callback(null, body.replace(/\s|\n/g, ''));
    } else {
      callback(error);
    }
  });
}

/**
 * Create a new instance of server.
 * Generates a uuid for the TOKEN id,
 * finds an open port for the http server
 */
function create(cb) {
  //generate uuid
  var id = uuid.v4(),
      ip,
      port,
      server,
      pending = 2,
      error;

  function next() {
    pending--;
    if (pending !== 0) {
      return;
    }

    if (error) {
      return cb(error);
    }

    server = new Server({
      ip: ip,
      id: id,
      port: port
    });

    server.run();
    cb(null, server);
  }

  //find ip
  getPublicIp(function(err, pubIp) {
    if (err) {
      error = err;
      return next();
    }
    ip = pubIp;
    next();
  });


  //find port
  openport.find({
    startingPort: 50000,
    endingPort: 60000
  }, function(err, availablePort) {
    if (err) {
      error = err;
      return next();
    }
    port = availablePort;
    next();
  });
}

create.Server = Server;

module.exports = create;
