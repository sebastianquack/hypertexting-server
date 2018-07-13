const express = require('express');

const app = express();
server = app.listen(3000, () => console.log('hypertexting-server listening on port 3000'));

const io = require('socket.io')(server);

const api = require('./src/api.js');
api.init(app, io);


