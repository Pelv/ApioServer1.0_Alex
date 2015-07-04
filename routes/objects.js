module.exports = function(Apio){

	return {
        create: function(req, res) {

        },
        delete: function(req, res) {

        },
        update: function(req, res) {
            var object = req.body.object;
            Apio.Logger.log({
                source : 'ApioOS',
                event : 'update',
                value : object
            })
            Apio.Remote.socket.emit('apio.server.object.update', object);
            if (object.writeToDatabase === true)
                Apio.Database.updateProperty(object, function() {
                    //Connected clients are notified of the change in the database
                    Apio.io.emit("apio_server_update", object);

                });
            else
                Apio.Util.debug("Skipping write to Database");


            //Invio i dati alla seriale se richiesto
            if (object.writeToSerial === true && ENVIRONMENT == 'production') {
                Apio.Serial.send(object);
            } else
                Apio.Util.debug("Skipping Apio.Serial.send");




        },
        getById: function(req, res) {
            Apio.Database.getObjectById(req.params.id, function(result) {
                res.send(result);
            })
        },
        list: function(req, res) {
						//console.log("Richiesta")
            Apio.Object.list(function(err,data){
                if (err)
                    res.status(500).send(err);
                else
                    res.send(data);
            })
        }
    }
    }
