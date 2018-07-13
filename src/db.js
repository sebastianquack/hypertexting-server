const mongoose = require('mongoose');

try {
	mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });	
}
catch(error) {
	console.error(error);
}

const ScriptNode = mongoose.model('ScriptNode', { 
	id: String,
	name: String,
	script: String
});

var shortid = require('shortid');

function getNodes() {
	return ScriptNode.find();
}

function findNode(id) {
	return ScriptNode.findOne({id: id});
}

function findNodeByName(name) {
	return ScriptNode.findOne({name: name});
}

async function createNode(nodeData) {
  	let id = shortid.generate();
  	await ScriptNode.create({
  		id: id,
  		name: nodeData.name,
  		script: nodeData.script
  	});
	return id;
}

async function updateNode(id, data) {
	await ScriptNode.update({id: id}, { $set: { name: data.name, script: data.script } });
}

module.exports.getNodes = getNodes;
module.exports.findNode = findNode;
module.exports.findNodeByName = findNodeByName;
module.exports.createNode = createNode;
module.exports.updateNode = updateNode;