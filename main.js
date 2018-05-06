var fs = require('fs');
var https = require('https');

var express = require('express');
var app = express();

var options = {
  key: fs.readFileSync('./security/file.pem'),
  cert: fs.readFileSync('./security/file.crt')
};
var serverPort = 8443;

var server = https.createServer(options, app);
var io = require('socket.io')(server);

var request = require('request')

const expiryTime = 15;

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/index.html');
});

server.listen(serverPort, function() {
  console.log('Started server on port %s', serverPort);
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

function emitError(socket, type, message){
	socket.emit('exception', {type: type, message: message});
}


function authSucceeded(socket, userid){
	//TODO: Generate JWT token
	revokeOldAuthentication(userid);
	UserList[userid] = {socket: socket, expiresIn: expiryTime}; //TODO: Replace with token
	socket.emit('authSucceeded', 'insert jwt token here');
}

function revokeOldAuthentication(userid){
	if(UserList[userid]){
		UserList[userid].socket.emit('duplicateConnection');
		UserList[userid].socket.disconnect(true);
	}
}

function emitAll(type, data){
	io.emit(type, data);
}

//Test real time authentication
var testVal = 0;
setInterval(function(){
	testVal++;
	emitAll('testrealtime', testVal);
}, 1000/10);

