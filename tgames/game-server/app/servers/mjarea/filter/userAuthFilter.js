module.exports = function() {
  return new Filter();
}

var Filter = function() {
};

/**
 * 校验用户是否已登录
 * @param msg
 * @param session
 * @param next
 */
Filter.prototype.before = function (msg, session, next) {
  if (msg.lgAction == "login") {
       next();
  }
  //校验session是否绑定userId
    session.get("")
      next();

};


