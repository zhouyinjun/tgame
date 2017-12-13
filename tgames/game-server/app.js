var bearcat = require('bearcat');
var pomelo = require('pomelo');

/**
 * Init app for client.
 */
var app = pomelo.createApp();

var Configure = function() {
    app.set('name', 'tgame');

    app.configure('production|development', 'gate', function() {
        app.set('connectorConfig', {
            connector: pomelo.connectors.hybridconnector
        });
    });

    app.configure('production|development', 'connector', function(){
        app.set('connectorConfig',
            {
                connector: pomelo.connectors.hybridconnector,
                heartbeat: 1000,
                useDict: true,
                useProtobuf: true
            });
    });
}

var contextPath = require.resolve('./context.json');
bearcat.createApp([contextPath]);

bearcat.start(function() {
    Configure();
    app.set('bearcat', bearcat);
    // start app
    app.start();
});

process.on('uncaughtException', function (err) {
  console.error(' Caught exception: ' + err.stack);
});
