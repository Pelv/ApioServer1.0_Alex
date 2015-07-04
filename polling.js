var request = require('request');

var o = {}
o.name;
var i = 0
setInterval(function(){
  if(i==0) {
    o.name = "Off";
    i=1;
  } else {
    o.name = "On"
    i=0;
  }
  var req_data = {
    json: true,
    uri: "http://localhost:8083/apio/state/apply",
    method: "POST",
    body: {
      state: {
        name: o.name
      }
    }
  }
  var req = request(req_data, function(error, response, body) {
    console.log(error);
    console.log(response);
    console.log(body);


  })
},500)
