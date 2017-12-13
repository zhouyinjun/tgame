var bearcat = require('bearcat');
var Code = require('../../../../../shared/code');

var EntryHandler = function(app) {
    this.app = app;
};


/**
 * New client entry.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
EntryHandler.prototype.entry = function(msg, session, next)
{
    var self = this;
    var userId = parseInt(msg.userId);

    session.bind(userId);
    session.set("userId",userId);
    session.on('closed', onUserLeave.bind(null, self.app));
    session.pushAll();

    this.app.rpc.mjarea.mjRemote.login(session, {
        userId: session.get('userId')
    }, null);

    next(null, {
        code: Code.OK
    });
};

var onUserLeave = function(app, session, reason) {
    if(!session || !session.uid) {
        return;
    }
        var sid = app.get('serverId');
        if(palyType == Code.PLAY_TYPE.HZMJ)
        {
            app.rpc.mjarea.mjRemote.playerLeave(session, {
                userId: session.get('userId'),
                sid:sid
            }, null);
        }
};

module.exports = function(app) {
    return bearcat.getBean({
        id: "entryHandler",
        func: EntryHandler,
        args: [{
            name: "app",
            value: app
        }]
    });
};