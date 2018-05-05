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

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/index.html');
});

io.on('connection', function(socket) {
  console.log('new connection');
  socket.emit('message', 'This is a message from the dark side.');
  socket.on('requestAuth', function(token){
  	socket.emit('authSucceed', token);
  });
});

server.listen(serverPort, function() {
  console.log('Started server on port %s', serverPort);
});

// //Temp user profile storage

// function authenticateUserFacebook(token){
// 	const options = {
// 		method: 'GET',
// 		uri: 'https://graph.facebook.com/v3.0/me',
// 		json: true,
// 		qs: {
// 			access_token: token,
// 		},
// 	}
// 	request(options, function(err, response, body){
// 		if(err){
// 			authFailed(body);
// 		} else {
// 			authSucceed();
// 		}
// 	});
// }

// function()