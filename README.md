# SocketAuth
Wrapper for OAuth2 authentication implementations (Facebook, Google, etc.) around Socket.io real time apps in NodeJS    
Demo live at https://socketauth.herokuapp.com    
Enables users to authenticate with social media accounts. 
Removes security hazards from your app as no passwords or emails need to be stored on your backend.   
## Implementation Details
Client retrieves access token from third party login API upon successful login. This access token is passed over HTTPS to the server during
the socket handshake. Server uses this token to retrieve information (i.e. userID) about the user from the relevant API for identification.
Upon validating the user's identity, a JWT token is sent to the client. The server periodically checks to make sure all connected
sockets are authenticated by forcing clients to reply with their issued JWT token. Upon successful verification of these tokens,
refresh tokens are issued. If a client fails to provide a valid token within a reasonable amount of time, the server closes
the socket connection with that user.
