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
  //Define new method for each socket
  socket.on('requestAuth', function(token){
  	authenticateUserFacebook(socket, token);
  });
});

//Temp user profile storage (replace with database)
var userData = {};

var authenticatedUsers = {};

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
			authFailed(socket, err);
		} else if (body.error){
			authFailed(socket, 'Invalid access token');
		} else {
			console.log('FB user authenticated with id: ' + body.id);
			authSucceeded(socket, body);
		}
	});
}

function emitError(socket, type, message){
	socket.emit('err', {type: type, message: message});
}

function authFailed(socket, err){
	emitError(socket, 'authFailed', err)
}

function authSucceeded(socket, body){
	//Generate JWT token
	var userid = body.id; //FB userid
	deleteOldAuthentication(userid);
	authenticatedUsers[body.id] = {socket: socket, expiresIn: expiryTime}; //Replace with token
	socket.emit('authSucceeded', 'insert jwt token here');
}

function deleteOldAuthentication(userid){
	if(authenticatedUsers[userid]){
		authenticatedUsers[userid].socket.emit('duplicateConnection');
		delete authenticatedUsers[userid];
	}
}

//Test real time authentication
var testVal = 0;
setInterval(function(){
	testVal++;
	emitAllAuthenticated('testrealtime', testVal);
}, 1000/10);

function emitAllAuthenticated(type, data){
	for (var id in authenticatedUsers){
		authenticatedUsers[id].socket.emit(type, data);
	}
}