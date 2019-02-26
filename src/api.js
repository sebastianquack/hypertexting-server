var bodyParser = require('body-parser')

const sandbox = require('./sandbox.js');
const db = require('./db.js');

async function joinRoom(io, socket, room) {
	console.log("joining " + room);
	await socket.join(room);
	// inform others in the new room 
	socket.room = room;
	let newNode = await db.findNode(room);
	if(newNode) {
		socket.emit('message', {system: true, message: "you are now in " + newNode.name});	
		socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human arrived"});
		handleScript(io, socket, newNode, null);
	} else {
		console.log("room " + room + " not found!");
	}
	
}

function init(app, io) {

	// setup socket api
	io.on('connection', function(socket) {
		console.log('Client connected');
		console.log("current room for this socket: " + socket.room);
		if(socket.handshake.query.currentRoomId && !socket.room) {
			console.log("query param found, rejoining room...");
			joinRoom(io, socket, socket.handshake.query.currentRoomId);
		}

		socket.on('disconnect', () => console.log('Client disconnected'));

		socket.on('joinRoom', async function(room) {
			console.log("signup request for room " + room);
			console.log("current room for this socket: " + socket.room);
			// check if socket already has a room
			if(socket.room) {
				if(socket.room != room) {
					console.log("socket already in another room " + socket.room + ", leaving...");
					await socket.leave(socket.room);
				}
			}
			// check if room needs to be changed
			if(socket.room != room) {
				joinRoom(io, socket, room);
			}
			
    	});

    	socket.on('leaveRoom', function(room) {
			console.log("removing socket from room " + room);
			socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human left"});
			socket.leave(room);
			socket.room = null;
    	});
    
		socket.on('message', async function(msg) {
			console.log('received message: ' + JSON.stringify(msg));

			if(socket.room != msg.room) {
				console.log("re-assigning to room");
				if(socket.room) {
					await socket.leave(socket.room);
				}
				await socket.join(msg.room);
				socket.room = msg.room;
			}

			socket.broadcast.in(socket.room).emit('message', {message: msg.message, name: "human"});	

			let currentNode = await db.findNode(socket.room);
			if(currentNode) {
				handleScript(io, socket, currentNode, msg.message);
			}
		});

	});

	// setup rest api
	app.use(bodyParser.json());

	app.use(function(req, res, next) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		next();
	});

	app.get('/node', async (req, res) => {
		let id = req.query.id;
		let node = await db.findNode(id)
		res.send(node);
	});

	app.post('/node', async (req, res) => {
		let id = req.body.id;
		if(id) {
			await db.updateNode(id, req.body);
		} else {
			id = await db.createNode(req.body);
		}
		let node = await db.findNode(id)
		res.send({status: "ok", node: node});
	});

	app.get('/nodes', async (req, res) => {
		let nodes = await db.getNodes();
		res.send({nodes: nodes});
	});

}

const timeout = ms => new Promise(res => setTimeout(res, ms))

async function handleScript(io, socket, currentNode, msg) {

	sandbox.processMessage(msg, currentNode.script, async (result)=>{
		if(result.error) {
			socket.emit('message', {system: true, message: result.error});
		}
		if(result.outputs) {
			await timeout(500); // the robot thinks
			for(let i = 0; i < result.outputs.length; i++) {
				io.in(socket.room).emit('message', result.outputs[i]);		
				await timeout(100 * result.outputs[i].message.length);
			}
			if(result.moveTo) {
				if(!msg) {
					console.log("move on enter is not allowed");					
					socket.emit('message', {system: true, message: "preventing automatic move on entry"});
					return;
				}
				let newNode = await db.findNodeByName(result.moveTo);
				if(newNode) {
					console.log("moving player to room " + newNode.name);
					if(newNode.id != currentNode.id) {
						await socket.leave(socket.room);

						// inform others in the old room 
						io.in(socket.room).emit('message', {system: true, message: "a human left to " + newNode.name});		

						socket.room = newNode.id;
						await socket.join(newNode.id);
						// inform sender of new room
						socket.emit('message', {system: true, moveTo: newNode});
						socket.emit('message', {system: true, message: "you are now in " + newNode.name});

						// inform others in the new room 
						socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human arrived from " + currentNode.name});		

						handleScript(io, socket, newNode, null);
					}	
				} else {
					console.log("node " + result.moveTo + " not found");
					socket.emit('message', {system: true, message: "node " + result.moveTo + " not found"});			
				}
			}
		}
	});

}

module.exports.init = init;