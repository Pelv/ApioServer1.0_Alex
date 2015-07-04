//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************* LICENSE *******************************
*									 *
* This file is part of ApioOS.						 *
*									 *
* ApioOS is free software released under the GPLv2 license: you can	 *
* redistribute it and/or modify it under the terms of the GNU General	 *
* Public License version 2 as published by the Free Software Foundation. *
*									 *
* ApioOS is distributed in the hope that it will be useful, but		 *
* WITHOUT ANY WARRANTY; without even the implied warranty of		 *
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the		 *
* GNU General Public License version 2 for more details.		 *
*									 *
* To read the license either open the file COPYING.txt or		 *
* visit <http://www.gnu.org/licenses/gpl2.txt>				 *
*									 *
*************************************************************************/


var Apio = require("../apio.js");
var async = require('async');
var APIO_CONFIGURATION = {
    port : 8083
}
var ENVIRONMENT = "production";
if (process.argv.indexOf('--no-serial') > -1)
    ENVIRONMENT = "development"
if (process.argv.indexOf('--http-port') > -1) {
    var index = process.argv.indexOf('--http-port');
    APIO_CONFIGURATION.port = process.argv[index+1];
}
if (process.argv.indexOf('--serial-port') > -1) {
    var index = process.argv.indexOf('--serial-port');
    Apio.Serial.Configuration.port = process.argv[index+1];
}
module.exports = {
	serial : {
		send : function(req,res) {

		}
	},
	states : {
		create : function(req,res){

    Apio.Database.db.collection('States').findOne({name : req.body.state.name},function(err,data){
	        if (data) {
	            console.log("Esiste già uno stato con questo nome ("+req.body.state.name+")")
	            res.send({error : "STATE_NAME_EXISTS"});
	        }
	        else {
				console.log("objectId vale:");
				console.log(req.body.state.objectId);
				console.log("properties vale:");
				console.log(req.body.state.properties);
	            //Apio.Database.db.collection('States').aggregate({$match : {objectId : req.body.state.objectId, properties: req.body.state.properties}},function(err,result){
				Apio.Database.db.collection('States').findOne({objectId : req.body.state.objectId, properties: req.body.state.properties}, function(err, result){
					console.log("result vale:");
					console.log(result);
					if (result !== null) {
	                    console.log("Esiste già uno stato con queste proprietà");
	                    //res.send({error : 'STATE_PROPERTIES_EXIST', state : result[0]["name"]});
						res.send({error : 'STATE_PROPERTIES_EXIST', state : result.name});
	                }
	                else {
	                    if (req.body.hasOwnProperty('event')) {
	                        //se sono qui devo anchr creare un evento che ha come stato scatenante lo stato inviato
	                        var evt = {
	                            name : req.body.event.name,
	                            triggerState : req.body.state.name,
	                            type : 'stateTriggered'
	                        };
	                        Apio.Database.db.collection('Events').findOne({name : evt.name},function(err,data){
	                            if (err) {
	                                res.status(500).send();
	                                console.log('/apio/state error while checking event name availability');
	                            }
	                            if (data) {
	                                //Significa che ho già un evento con questo nome
	                                res.send({error:'EVENT_NAME_EXISTS'});
	                            } else {
	                                //Se sono qui significa che non c'è un evento con quel nome.
	                                Apio.Database.db.collection('States').insert(req.body.state,function(err,data){
	                                        if (!err) {
	                                            console.log("Stato ("+req.body.state.name+") salvato con successo")
	                                            Apio.io.emit("apio_state_new",req.body.state);
	                                            Apio.Database.db.collection('Events').insert(evt,function(error){
	                                                if (!error) {
	                                                    Apio.io.emit("apio_event_new",evt);
	                                                    console.log("Evento ("+evt.name+") relativo allo stato ("+req.body.state.name+"), salvato con successo")
	                                                    res.send({error : false});
	                                                }

	                                            });
	                                        } else {
	                                            console.log("Apio.Database.Error unable to save the new state");
	                                            res.send({error : 'DATABASE_ERROR'});
	                                        }
	                                })
	                            }
	                        })
	                    } else {
	                        //Se non devo salvare eventi
	                                Apio.Database.db.collection('States').insert(req.body.state,function(err,data){
	                                        if (!err) {
	                                            console.log("Stato ("+req.body.state.name+") salvato con successo")
	                                            Apio.io.emit("apio_state_new",req.body.state);
	                                            res.send({error : false})
	                                        } else {
	                                            console.log("Apio.Database.Error unable to save the new state");
	                                            res.send({error : 'DATABASE_ERROR'});
	                                        }
	                                })
	                    }


	                }
	        })//states aggregate
	    }

	})
},
		delete : function(req,res) {

		},
		applyOld : function(req,res){

    function pause(millis) {
        var date = new Date();
        var curDate = null;
        do{
            curDate = new Date();
        }while(curDate-date < millis);
    }

    var incomingState = req.body.state;

        var stateHistory = {};

        var getStateByName = function(stateName,callback) {
            Apio.Database.db.collection('States').findOne({name : stateName},callback);
        }

    var arr = [];
    var applyStateFn = function(stateName, callback, eventFlag) {
        console.log("***********Applico lo stato "+stateName+"************");
        if (!stateHistory.hasOwnProperty(stateName)) { //se non è nella history allora lo lancio
            getStateByName(stateName,function(err,state){
                if (err) {
                    console.log("applyState unable to apply state");
                    console.log(err);
                }
                else if(eventFlag){
                    arr.push(state);
                    Apio.Database.db.collection('States').update({name : state.name},{$set : {active : true}},function(err){
                        if (err) {
                            //console.log("Non ho potuto settare il flag a true");
                        }
                        else {
                            var s = state;
                            s.active = true;
                            Apio.io.emit('apio_state_update',s);
                        }
                    });
                    console.log("Lo stato che sto per applicare è "+state.name);
                    //console.log(state);
                    Apio.Database.updateProperty(state,function(){
                        stateHistory[state.name] = 1;
                        //Connected clients are notified of the change in the database
                        Apio.io.emit("apio_server_update",state);
                        Apio.Database.db.collection("Events").find({triggerState : state.name}).toArray(function(err,data){
                            if (err) {
                                console.log("error while fetching events");
                                console.log(err);
                            }
                            //console.log("Ho trovato eventi scatenati dallo stato "+state.name);
                            //console.log(data);
                            if(callback && data.length == 0){
                                callback();
                            }
                            //data è un array di eventi
                            data.forEach(function(ev,ind,ar){
                                var states = ev.triggeredStates;
                                //console.log("states vale:");
                                //console.log(states)
                                states.forEach(function(ee,ii,vv){
                                    applyStateFn(ee.name, callback, true);
                                })
                            })
                        });
                    });
                }
                else{
                    if (state.active == true){
                        Apio.Database.db.collection('States').update({name : state.name},{$set : {active : false}},function(errOnActive){
                            if (errOnActive) {
                                console.log("Impossibile settare il flag dello stato");
                                res.status(500).send({error : "Impossibile settare il flag dello stato"})
                            } else {
                                var s = state;
                                s.active = false;
                                Apio.io.emit('apio_state_update',s);
                            }
                        })
                    }
                    else {
                        arr.push(state);
                        Apio.Database.db.collection('States').update({name : state.name},{$set : {active : true}},function(err){
                            if (err) {
                                console.log("Non ho potuto settare il flag a true");
                            }
                            else {
                                var s = state;
                                s.active = true;
                                Apio.io.emit('apio_state_update',s);
                            }
                        });
                        //console.log("Lo stato che sto per applicare è ");
                        //console.log(state);
                        Apio.Database.updateProperty(state,function(){
                            stateHistory[state.name] = 1;
                            //Connected clients are notified of the change in the database
                            Apio.io.emit("apio_server_update",state);
                            Apio.Database.db.collection("Events").find({triggerState : state.name}).toArray(function(err,data){
                                if (err) {
                                    //console.log("error while fetching events");
                                    //console.log(err);
                                }
                                //console.log("Ho trovato eventi scatenati dallo stato "+state.name);
                                //console.log(data);
                                if(callback && data.length == 0){
                                    callback();
                                }
                                //data è un array di eventi
                                data.forEach(function(ev,ind,ar){
                                    var states = ev.triggeredStates;
                                    //console.log("states vale:");
                                    //console.log(states)
                                    /*states.forEach(function(ee,ii,vv){
                                        applyStateFn(ee.name, callback, true);
                                    })*/
                                    async.each(states, function(state, thecallback) {
                                      applyStateFn(state.name, callback, true);
                                    },function(err){
                                      if (err)
                                        console.log("ERRORE")
                                      res.send();
                                      console.log("NON FACIO ALTRO PADRONE")
                                    })

                                })

                            });
                        });
                    }
                }
            })
        } else {
            //console.log("Skipping State application because of loop.")
        }
    }; //End of applyStateFn
        applyStateFn(incomingState.name, function(){
            console.log("applyStateFn callback")
            if(ENVIRONMENT == "production") {
                var pause = function (millis) {
                    var date = new Date();
                    var curDate = null;
                    do {
                        curDate = new Date();
                    } while (curDate - date < millis);
                };
                //console.log("arr vale:");
                //console.log(arr);
                for (var i in arr) {
                    //console.log("Mando alla seriale la roba numero "+i)
                    Apio.Serial.send(arr[i], function () {
                        pause(100);
                    });

                }
                console.log("RES.SEND01")
                //res.send({});
                arr = [];
            } else {
            	console.log("RES.SEND02")
              //res.send({});
            }
        }, false);
    },
    apply: function(req,res) {
      var state = req.body.state;
      console.log("Devo applicare "+state.name)
      Apio.System.applyState(state.name);
      res.send({});
    },
		getByName : function(req,res){
		    Apio.Database.db.collection("States").findOne({name : req.params.name},function(err,data){
		        if (err)
		            res.status(500).send({error:true});
		        else
		            res.send(data);
		    });
		},
		get : function(req,res){
		    Apio.Database.db.collection("States").find().toArray(function(err,data){
		        if (err)
		            res.status(500).send({error:true});
		        else
		            res.send(data);
		    });
		}
	},
	notifications : {
		create : function(req,res) {

		},
		list : function(req,res) {
			/* OLD
			var currentUser = 'matteo.di.sabatino.1989@gmail.com';

			Apio.Database.db.collection('Users').findOne({email : currentUser},function(err,doc){
				if(err) {
					console.log("Un errore ");
					console.log(err);
					res.status(500).send({});
				} else {
					res.send(doc.unread_notifications);
				}
			})
            */
            //NEW
            Apio.Database.db.collection("Users").find().toArray(function(err, data){
                if(err){
                    console.log("Unable to find collection Users");
                }
                else if(data.length === 1){
                    var currentUser = data[0].email;
                    Apio.Database.db.collection('Users').findOne({email : currentUser},function(err,doc){
                        if(err) {
                            console.log("Un errore ");
                            console.log(err);
                            res.status(500).send({});
                        } else {
                            res.send(doc.unread_notifications);
                        }
                    });
                }
                else{
                    console.log("Unable to find users");
                }
            });
		},
		listdisabled : function(req,res) {
            /* OLD
			var currentUser = 'matteo.di.sabatino.1989@gmail.com';

			Apio.Database.db.collection('Users').findOne({email : currentUser},function(err,doc){
				if(err) {
					console.log("Un errore ");
					console.log(err);
					res.status(500).send({});
				} else {
					res.send(doc.disabled_notification);
				}
			})
			*/
            //NEW
            Apio.Database.db.collection("Users").find().toArray(function(err, data){
                if(err){
                    console.log("Unable to find collection Users");
                }
                else if(data.length === 1){
                    var currentUser = data[0].email;
                    Apio.Database.db.collection('Users').findOne({email : currentUser},function(err,doc){
                        if(err) {
                            console.log("Un errore ");
                            console.log(err);
                            res.status(500).send({});
                        } else {
                            res.send(doc.disabled_notification);
                        }
                    });
                }
                else{
                    console.log("Unable to find users");
                }
            });
		},
		delete : function(req,res){
			var notif = req.body.notification;
			var user = req.body.username;
			Apio.Database.db.collection('Users').update({"username" : user},{$pull : {"unread_notifications" : notif}},function(err){
				if (err){
					console.log('apio/notification/markAsRead Error while updating notifications');
					res.status(500).send({});
				}
				else {
					res.status(200).send({});
				}
			})
		},
		disable : function(req,res){
			var notif = req.body.notification;
			var user = req.body.username;
			Apio.Database.db.collection('Users').update({"username" : user}, {$push : {"disabled_notification" : notif}}, function(err){
				if (err){
					console.log('apio/notification/disable Error while updating notifications');
					res.status(500).send({});
				}
				else {
					res.status(200).send({});
				}
			})
		},
		enable : function(req,res){
			var notif = req.body.notification;
			var user = req.body.username;
			Apio.Database.db.collection('Users').update({"username" : user}, {$pull : {"disabled_notification" : notif}}, function(err){
				if (err){
					console.log('apio/notification/enable Error while updating notifications');
					res.status(500).send({});
				}
				else {
					res.status(200).send({});
				}
			})
		}
	},
	events : {
		create : function(req,res){
		    var evt = req.body.event;
		    console.log("Salvo l'evento ");
		    console.log(evt);
		    Apio.Database.db.collection('Events').insert(evt,function(err,result){
		        if (err) {
		            console.log("Error while creating a new event");
		            res.status(500).send({error : "DB"});
		        } else {
		            if (evt.hasOwnProperty('triggerTimer')){
		                Apio.System.registerCronEvent(evt);
		            }
		            Apio.io.emit("apio_event_new",evt);
		            res.status(200).send(result[0].objectId);
		        }
		    })
		},
		update : function(req,res){
		    delete req.body.eventUpdate["_id"];
		    Apio.Database.db.collection("Events").update({name : req.params.name},req.body.eventUpdate,function(err){
		        if (!err) {
		            Apio.io.emit("apio_event_update",{event : req.body.eventUpdate});
		            res.send({error : false});
		        }
		        else
		            res.send({error : 'DATABASE_ERROR'});
		    })
		},
		delete : function(req,res){

		    Apio.Database.db.collection("Events").remove({name : req.params.name},function(err){
		        if (!err) {
		            Apio.io.emit("apio_event_delete",{name : req.params.name});
		            res.send({error : false});
		        }
		        else
		            res.send({error : 'DATABASE_ERROR'});
		    })
		},
		getByName : function(req,res){
		    Apio.Database.db.collection('Events').findOne({name : req.params.name},function(err,data){
		        if (err) {
		            console.log("Error while fetching event named "+req.params.name);
		            res.status(500).send({error : "DB"});
		        } else {
		            res.send(data);
		        }
		    })
		},
		list : function(req,res){
		    Apio.Database.db.collection("Events").find({}).toArray(function(err,result){
		        if (err)
		            res.status(500).send({error:true});
		        else
		            res.status(200).send(result);
		    });
		},
		launch : function(req,res){
		    //  Vado a vedere se l'evento esiste
		    //  Vado a prendere gli stati da scatenare
		    //  Applico gli stati
		    //  Profit
		    Apio.System.launchEvent(req.query.eventName,function(err){
		        if (err)
		            res.status(500).send({error :  true});
		        else
		            res.send({error : false});
		    })
		}

	},
	objects : {
		create : function(req,res) {

		},
		delete : function(req,res) {

		},
		update : function(req,res){

		    var object = req.body.object;

		            if (object.writeToDatabase === true)
		            Apio.Database.updateProperty(object,function(){
		                //Connected clients are notified of the change in the database
		                Apio.io.emit("apio_server_update",object);
		            });
		        else
		            Apio.Util.debug("Skipping write to Database");


		        //Invio i dati alla seriale se richiesto
		        if (object.writeToSerial === true && ENVIRONMENT == 'production') {
		            Apio.Serial.send(object);
		        }
		        else
		            Apio.Util.debug("Skipping Apio.Serial.send");




		},
		getById : function(req,res) {
			Apio.Database.getObjectById(req.params.id,function(result){
		            res.send(result);
		    })
		},
		get : function(req,res) {
			Apio.Database.getObjects(function(result){
		            res.send(result);
		    })
		}
	}
}
