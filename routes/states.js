module.exports = function(Apio){

	return {
        update: function(req, res) {
            Apio.State.update(req.params.name,req.body.state,function(response){
                res.send(response);
                Apio.Remote.socket.emit("apio.server.state.update", {stateName:req.params.name,update:req.body.state});
            });

        },
        create: function(req, res) {

            Apio.State.create(req.body.state, req.body.event, function(response) {
                var state = req.body.state;
                state.apioId = Apio.System.getApioIdentifier();
                if(Apio.Configuration.remote.enabled==true){
	                Apio.Remote.socket.emit("apio.server.state.create", state);
                }
                //
                res.send(response);
            })
        },
        delete: function(req, res) {
            Apio.State.delete(req.params.name, function(response) {
	            if(Apio.Configuration.remote.enabled==true){
		            Apio.Remote.socket.emit("apio.server.state.delete", {
                        name: req.params.name
                    });
	            }

                res.send(response);
            })

        },
        //TODO:
        //E' implementata male bisogna verificarla e farla in maniera tale che rilancia una callback se tutto va bene cosi fa cagare
        apply: function(req, res) {
					Apio.State.apply(req.body.state.name,function(){
				Apio.Util.log("HTTP requested to apply state "+req.body.state.name)
				//Apio.Remote.socket.emit('apio.server.state.apply',{stateName : req.body.state.name});
				res.send();
		});

},


        getByName: function(req, res) {
            Apio.State.getByName(req.params.name,function(err,data){
                if (err) {
                    res.status(500).send({error:true})
                } else {
                    res.send(data);
                }
            })

        },
        list: function(req, res) {
            Apio.State.list(function(err,data){
                if (err) {
                    res.status(500).send({error:true})
                } else {
                    res.send(data);
                }
            })
        }
    }
   }
