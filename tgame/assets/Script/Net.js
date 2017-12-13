var gateHost = "127.0.0.1";
var gatePort = 3014;

var Global = cc.Class({
    extends: cc.Component,
    statics: {
        ip:"",
        isConnected:false,
        isPinging:false,
        fnDisconnect:null,
        handlers:{},
        addHandler:function(event,fn){
            if(this.handlers[event]){
                console.log("event:" + event + "' handler has been registered.");
                return;
            }
            var handler = function(data){
                if(event != "disconnect" && typeof(data) == "string"){
                    data = JSON.parse(data);
                }
                fn(data);
            };
            this.handlers[event] = handler;
            if(this.isConnected){
                console.log("register:function " + event);
                pomelo.on(event,handler);
            }
        },
        connect:function(fnConnect,fnError,uid) {
            var route = 'gate.gateHandler.queryEntry';
            var self = this;
            pomelo.init({
                host: gateHost,
                port: gatePort
            }, function() {
                pomelo.request(route, {uid: uid}, function(data) {
                    //pomelo.disconnect();
                    console.log("ret :"+data.host + data.port+ data.code);
                    pomelo.disconnect(function () {
                        pomelo.init({host: data.host, port: data.port,  reconnect:true}, function() {
                            self.isConnected = true;
                            // todo action
                            for(var key in self.handlers){
                                var value = self.handlers[key];
                                if(typeof(value) == "function"){
                                    if(key == 'disconnect'){
                                        self.fnDisconnect = value;
                                    }
                                    else{
                                        console.log("register:function " + key);
                                        pomelo.on(key,value);
                                    }
                                }
                            }
                              fnConnect();
                        });
                    });


                });
            });
        },
        close:function(){
            pomelo.disconnect();
            this.isConnected = false;
            if(this.fnDisconnect){
                this.fnDisconnect();
                this.fnDisconnect = null;
            }
        },
        
        test:function(fnResult){
            var xhr = null;
            var fn = function(ret){
                fnResult(ret.isonline);
                xhr = null;
            }
            
            var arr = this.ip.split(':');
            var data = {
                account:cc.vv.userMgr.account,
                sign:cc.vv.userMgr.sign,
                ip:arr[0],
                port:arr[1],
            }
            xhr = cc.vv.http.sendRequest("/is_server_online",data,fn);
            setTimeout(function(){
                if(xhr){
                    xhr.abort();
                    fnResult(false);                    
                }
            },1500);
        }
    },
});