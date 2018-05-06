var fs = require('fs');
var https = require('https');
var express = require('express');
var app = express();
var request = require('request')
var JWT = require('./server/jwthandler.js');
var io;

var localServerOptions = {
  key: fs.readFileSync('./security/file.pem'),
  cert: fs.readFileSync('./security/file.crt')
};

var serverPort = process.env.PORT || 8443;
var serverType = process.env.NODE_ENV;

//Starts server based on environment
if(serverType !== 'production'){
	var https = require('https');
	var server = https.createServer(localServerOptions, app);
	server.listen(serverPort, function() {
	 	console.log('Started server on port %s', serverPort);
	});
	io = require('socket.io')(server);
} else {
	var server = app.listen(serverPort, function(){
		console.log('Started server on port %s', serverPort);
	});
	io = require('socket.io')(server);
	//For Heroku: redirect all traffic to https
	app.use(function(req,res,next){
		if(req.headers['x-forwarded-proto'] !== 'https'){
			res.redirect(`https://${req.header('host')}${req.url}`);
		} else{
			next();
		}
	});
}

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/index.html');
});

io.on('connection', function(socket) {
  console.log('New socket with id: '+ socket.id);
  //Handle authorization
  authenticate(socket);
});

function authenticate(socket){
	var err;
	//Retrive token data from handshake
	var token, source;
	if (socket.handshake.query && socket.handshake.query.token && socket.handshake.query.authsource){
		token = socket.handshake.query.token;
		source = socket.handshake.query.authsource;
	} else{
		emitError(socket, 'authFailed', 'Bad request');
		socket.disconnect(true);
		return;
	}

	//Match authsource with corresponding handler function
	if(source === 'facebook'){
		err = authenticateUserFacebook(socket, token);
	} else{
		emitError(socket, 'authFailed', 'Bad request');
		socket.disconnect(true);
		return;
	}

	//Check if error occured
	if(err != null){
		emitError(socket, 'authFailed', err);
		socket.disconnect(true);
	}

	initSocketEvents(socket);
}

function initSocketEvents(socket){
	socket.on('verifyToken', function(token){
		verifyToken(socket, token);
	});
}

function emitAll(type, data){
	io.emit(type, data);
}

function emitError(socket, type, message){
	socket.emit('exception', {type: type, message: message});
}

//Temp user profile storage (replace with database)
var userData = {};

var UserList = {};

function authenticateUserFacebook(socket, token){
	const options = {
		method: 'GET',
		uri: 'https://graph.facebook.com/v3.0/me',
		json: true,
		qs: {
			access_token: token,
			fields: 'id, name',
		},
	};

	request(options, function(err, response, body){
		if(err){
			return err;
		} else if (body.error){
			return 'Invalid access token';
		} else {
			console.log('FB user authenticated with id: ' + body.id);
			authSucceeded(socket, body.id);
			return null;
		}
	});
}

function authSucceeded(socket, userid){
	var token = JWT.generateToken(userid, socket.id);
	revokeOldAuthentication(userid);
	socket.userid = userid;
	UserList[userid] = {socket: socket, token: token, verified: true}; //TODO: Replace with token
	socket.emit('authSucceeded', token);
}

function revokeOldAuthentication(userid){
	if(UserList[userid]){
		UserList[userid].socket.emit('duplicateConnection');
		UserList[userid].socket.disconnect(true);
	}
}

var verifictionCounter = 2;


function updateAuthorization(){
	verifictionCounter++;
	if(verifictionCounter >= 3){
		requestAllTokens();
		verifictionCounter = 0;
	}

	//Terminate connection to clients which failed to provide valid tokens
	if(verifictionCounter === 1){
		for(var uid in UserList){
			if(UserList[uid].verified === false){
				socket = UserList[uid].socket;
				emitError(socket, 'authRevoked', 'Token refresh failed');
				socket.disconnect();
				delete UserList[uid];
			}
		}
	}
}

function requestAllTokens(){
	emitAll('verifyToken', null)
	for(var uid in UserList){
		UserList[uid].verified = false;
	}
}

function verifyToken(socket, token){
	if(JWT.verifyToken(socket.userid, socket.id, token)){
		var refreshToken = JWT.generateRefreshToken(token);
		socket.emit('refreshToken', refreshToken);
		UserList[socket.userid].verified = true;
		UserList[socket.userid].token = refreshToken;
		//console.log('Refreshing with token: ' + refreshToken);
	} else{
		emitError(socket, 'verificationFailed', 'Invalid token');
	}
}

//Loop to periodically check users are properly authenticated
setInterval(function(){
	updateAuthorization();
}, 1000*5);


//Test real time authentication
var testVal = 0;
setInterval(function(){
	testVal++;
	emitAll('testrealtime', testVal);
}, 1000);

