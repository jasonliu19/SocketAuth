var jwt = require('jsonwebtoken');
var constants = require('./constants.js')

var secret = 'changelateranddonotupdateongit'

var JWT = {};

var options = {
	expiresIn: constants.TOKENEXPIRETIME
};


JWT.generateToken = function(userid, socketid) {
	var payload = {
		uid: userid, 
		sid: socketid
	};
	return jwt.sign(payload, secret, options);
}

JWT.verifyToken = function(userid, socketid, token){
	var payload;
	try {
		payload = jwt.verify(token, secret);
	} catch(err) {
		return false;
	}

	if(payload.uid != userid || payload.sid != socketid){
		return false;
	}

	return true;
}

JWT.generateRefreshToken = function(){
	try {
		var payload = jwt.verify(token, secret);
		delete payload.iat;
	  	delete payload.exp;
	  	delete payload.nbf;
	  	delete payload.jti; 
	} catch(err) {
		return null;
	}
	return jwt.sign(payload, secret, options);
}

module.exports = JWT;
