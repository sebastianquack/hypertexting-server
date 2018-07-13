const express = require('express');

const app = express();
server = app.listen(process.env.PORT || 3000);

const io = require('socket.io')(server);

const api = require('./src/api.js');
api.init(app, io);


