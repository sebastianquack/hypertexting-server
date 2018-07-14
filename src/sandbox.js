const {VM} = require('vm2');

module.exports.processMessage = async function(msg, script, callback) {
	let sentResponse = false;

  let t = setTimeout(()=>{
  	sentResponse = true;
    callback("timeout"); // timeout for awaiting async script effects
  }, 10000);

  let result = {
    outputs: [],
    moveTo: null
  };
  
  const vm = new VM({
    timeout: 1000, // timeout for script exeuction
    sandbox: {
      input: msg,
      player: {
        justArrived: !msg ? true : false
      },
      api: {
        output: (msg, name="robot") => { result.outputs.push({message: msg, name: name}); },
        moveTo: (room) => { result.moveTo = room; }
      }
    }
  });

  try {
    let output = await vm.run(script);
    console.log("script output: " + output);
    console.log(result);
    clearTimeout(t);
    if(!sentResponse) {
      callback(result);	
    }
  } catch (err) {
    clearTimeout(t);
    console.error('script execution failed!', err);
    if(!sentResponse) {
      callback({error: err.toString()});	
    }
  }
}

