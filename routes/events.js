module.exports = function(Apio){

	return {
        create: function(req, res) {
            Apio.Util.log("HTTP event.create")
            var e = req.body.event;
            e.apioId = Apio.System.getApioIdentifier();
            Apio.Event.create(e,function(err,response){
                if (err){

                    console.log("Routes.Events.create Error")
                    res.status(500).send({})
                }
                else {
                    if(Apio.Configuration.remote.enabled==true){
	                    Apio.Remote.socket.emit("apio.server.event.create", e);
                    }
                    res.send(response)
                }
            });
            

        },
        update: function(req, res) {
            Apio.Util.log("HTTP event.update")
            Apio.Event.update(req.params.name,req.body.eventUpdate,function(err,response){
                if (err)
                    res.status(500).send(response)
                else {
	                if(Apio.Configuration.remote.enabled==true){
		                Apio.Remote.socket.emit('apio.server.event.update',{name: req.params.name,eventUpdate:req.body.eventUpdate})
	                }
                    
                    res.send(response);
                }
            })
        },
        delete: function(req, res) {
            Apio.Util.log("HTTP event.delete")
            Apio.Event.delete(req.params.name,function(err){
                if (err)
                    res.status(500).send(err)
                else{
	                
	                if(Apio.Configuration.remote.enabled==true){
		                Apio.Remote.socket.emit("apio.server.event.delete", {
                                name: req.params.name
                    	});
		            }
                    
                    res.send();
                }
            })
        },
        getByName: function(req, res) {
            Apio.Util.log("HTTP event.getByName")
            Apio.Event.getByName(req.params.name,function(err,data){
                if (err)
                    res.status(500).send(err)
                else
                    res.send(data);
            })
        },
        list: function(req, res) {
            Apio.Util.log("HTTP event.list")
            Apio.Event.list(function(err,data){
                if (err)
                    res.status(500).send(err)
                else
                res.send(data);
            })
        },
        launch: function(req, res) {
            Apio.Util.log("HTTP event.launch")
            //  Vado a vedere se l'evento esiste
            //  Vado a prendere gli stati da scatenare
            //  Applico gli stati
            //  Profit
            Apio.System.launchEvent(req.query.eventName, function(err) {
                if (err)
                    res.status(500).send({
                        error: true
                    });
                else
                    res.send({
                        error: false
                    });
            })
        }

    }
}