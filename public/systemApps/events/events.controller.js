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


angular.module('ApioApplication')
    .controller('ApioEventsController', ['$scope', '$http', 'socket', 'objectService', "DataSource", "$modal",
        function($scope, $http, socket, objectService, DataSource, $modal) {

            document.getElementById("targetBody").style.position = "";
                $("#ApioApplicationContainer").hide(function(){
                    $("#ApioApplicationContainer").html("");
                });

			     $("#notificationsCenter").slideUp(500);

            //var startX, startY;
            //Touch event
            /*
            $("#editEventPanel").on("touchstart", function(event){
                startX = event.originalEvent.changedTouches[0].pageX;
                startY = event.originalEvent.changedTouches[0].pageY;
            });
            $("#editEventPanel").on("touchend", function(event){
                var distX = event.originalEvent.changedTouches[0].pageX - startX;
                var distY = event.originalEvent.changedTouches[0].pageY - startY;
                if(!$(event.target).is("input") && distX > 0 && ((distY >= 0 && distY <= 40) || (distY >= -40 && distY <= 0))){
                    $("#editEventPanel").hide("slide", {
                        direction: 'right'
                    }, 500, function () {
                        document.getElementById("ApioEventsContainer").classList.remove('event_open_edit_state');
                    });
                }
            });
            */
            window.swipe('editEventPanel', function (){
                document.getElementById("ApioEventsContainer").classList.remove('event_open_edit_state');
            });


	            window.affix('editEventPanel','myAffix',null,0,function(){

		            document.getElementById('myAffix').classList.add('add_new_guest');

	            },function(){
		            document.getElementById('myAffix').classList.remove('add_new_guest');
	            });

            //Mouse event
            /*
            $("#editEventPanel").on("mousedown", function(event){
                startX = event.pageX;
                startY = event.pageY;
            });
            $("#editEventPanel").on("mouseup", function(event){
                var distX = event.pageX - startX;
                var distY = event.pageY - startY;
                if(!$(event.target).is("input") && distX > 0 && ((distY >= 0 && distY <= 40) || (distY >= -40 && distY <= 0))){
                    $("#editEventPanel").hide("slide", {
                        direction: 'right'
                    }, 500, function () {
                        document.getElementById("ApioEventsContainer").classList.remove('event_open_edit_state');
                    });
                }
            });
			*/

            var startX_, startY_;
            //Touch event
            $("#editEventRunPanel").on("touchstart", function(event){
                startX_ = event.originalEvent.changedTouches[0].pageX;
                startY_ = event.originalEvent.changedTouches[0].pageY;
            });
            $("#editEventRunPanel").on("touchend", function(event){
                var distX_ = event.originalEvent.changedTouches[0].pageX - startX_;
                var distY_ = event.originalEvent.changedTouches[0].pageY - startY_;
                if(!$(event.target).is("input") && distX_ > 0 && ((distY_ >= 0 && distY_ <= 40) || (distY_ >= -40 && distY_ <= 0))){
                    $("#editEventRunPanel").hide("slide", {
                        direction: 'right'
                    }, 500);
                }
            });

            //Mouse event
            $("#editEventRunPanel").on("mousedown", function(event){
                startX_ = event.pageX;
                startY_ = event.pageY;
            });
            $("#editEventRunPanel").on("mouseup", function(event){
                var distX_ = event.pageX - startX_;
                var distY_ = event.pageY - startY_;
                if(!$(event.target).is("input") && distX_ > 0 && ((distY_ >= 0 && distY_ <= 40) || (distY_ >= -40 && distY_ <= 0))){
                    $("#editEventRunPanel").hide("slide", {
                        direction: 'right'
                    }, 500);
                }
            });

            $scope.showSave = false;

            $scope.newRunState = function(){
                $scope.showSave = true;
            }

            $scope.radioIsChecked = function(state){
                var flag = true;
                for(var i in $scope.currentEvent.triggerState){
                    if($scope.currentEvent.triggerState[i] != state[i]){
                        flag = false;
                    }
                }
                return flag;
            };

            $scope.goToEventsPanel = function(){
                $("#editEventPanel").hide("slide", {
                    direction: 'right'
                }, 500, function () {
                    document.getElementById("ApioEventsContainer").classList.remove("openAppIconStyle");
                    document.getElementById("ApioEventsContainer").classList.remove("event_open_edit_state");
                });
            };

            $scope.loadRunModifier = function(){
	            $.get("systemApps/events/app.events.activator.modify.html", function(data){
					var app = $("#editEventPanel");
					Apio.newWidth += Apio.appWidth;
					app.css("width", Apio.newWidth+"px");
					$("#ApioApplicationEditEvent").css("width", Apio.appWidth+"px");
					$("#ApioApplicationEditEvent").css("float", "left");
			        app.css("overflowX", "auto");

				    app.append($(data));
				    $("#editEventRunModify").css("width", Apio.appWidth+"px");
				    $("#editEventRunModify").css("float", "left");
				});
            };

            $scope.convertCron = function(cronDate){
	            function addZero(arg){
		            for(var i in arg){
			            if(arg[i].length == 1 && arg[i] != "*"){
				            arg[i] = "0"+arg[i];
			            }
			        }
		        }
		        if ('undefined' == typeof cronDate)
                    return;

	            var date = "";
	            var cronComponents = cronDate.split(" ");
	            if(cronComponents[0] == "*"){
		            date = "Ogni minuto";
	            }
	            else if(cronComponents[1] == "*"){
		            addZero(cronComponents);
		            date = "Ogni ora al minuto "+cronComponents[0];
	            }
	            else if(cronComponents[2] == "*"){
		            addZero(cronComponents);
                    if(cronComponents[3] == "*" && cronComponents[4] != "*"){
                        switch(cronComponents[4]){
                            case "00" : case "07" : var day = "Domenica"; break;
                            case "01" : var day = "Lunedì"; break;
                            case "02" : var day = "Martedì"; break;
                            case "03" : var day = "Mercoledì"; break;
                            case "04" : var day = "Giovedì"; break;
                            case "05" : var day = "Vernedì"; break;
                            case "06" : var day = "Sabato"; break;
                        }
                        date = "Ogni settimana di "+day+" alle "+cronComponents[1]+":"+cronComponents[0];
                    }
                    else{
                        date = "Ogni giorno alle "+cronComponents[1]+":"+cronComponents[0];
                    }
	            }
	            else if(cronComponents[3] == "*"){
		            addZero(cronComponents);
		            date = "Ogni mese il giorno "+cronComponents[2]+" alle "+cronComponents[1]+":"+cronComponents[0];
	            }
	            else if(cronComponents[4] == "*"){
		            addZero(cronComponents);
		            date = "Ongi anno il "+cronComponents[2]+"/"+cronComponents[3]+" alle "+cronComponents[1]+":"+cronComponents[0];
	            }
	            return date;
            }

            $scope.showGuests = false;

            $scope.editEventFormStep = '';
            var stateOrTime = "";
            $scope.goToEditEventFormStep = function(step) {
                $scope.editEventFormStep = step;
                if($scope.editEventFormStep == "sceltaTipo"){
                    $scope.showSave = false;
					$('#editEventRunPanel').show('slide',
                        {
                            direction : 'right'
                        }, 500);
                } else if ($scope.editEventFormStep == 'selezioneData'){
                    resetCronModifica();
                    //$scope.currentEvent.type = "timeTriggered";
                    //delete $scope.currentEvent.triggerState;
                    stateOrTime = "time";
                } else if ($scope.editEventFormStep == 'selezioneStatoScatenante'){
                    //$scope.currentEvent.type = "stateTriggered";
                    //delete $scope.currentEvent.triggerTimer;
                    stateOrTime = "state";
                }
            };

            $scope.toggleShowGuests = function() {
                $scope.showGuests = !$scope.showGuests;
            };

            $scope.currentEvent = {
                triggeredStates: []
            };

            $scope.statesToAddToEvent = [];
            $scope.toggleNewStateInEvent = function(state) {
                function objectIndex(obj){
                    var index = -1;
                    var flag = true;
                    for(var i = 0;flag && i < $scope.statesToAddToEvent.length;i++){
                        if($scope.statesToAddToEvent[i].name == obj.name && $scope.statesToAddToEvent[i].objectName == obj.objectName){
                            index = i;
                            flag = false;
                        }
                    }

                    return index;
                }
                var index = objectIndex({ "name" : state.name, "objectName" : state.objectName });
                if(index > -1){
                    $scope.statesToAddToEvent.splice(index, 1);
                }
                else{
                    $scope.statesToAddToEvent.push({
                        "name" : state.name,
                        "objectName" : state.objectName
                    });
                }
            }
            $scope.saveCurrentEvent = function() {
                $.merge($scope.currentEvent.triggeredStates,$scope.statesToAddToEvent);

                if (stateOrTime == "time"){
                    $scope.currentEvent.type = "timeTriggered";
                    delete $scope.currentEvent.triggerState;
                }
                else if (stateOrTime == "state") {
                    $scope.currentEvent.type = "stateTriggered";
                    delete $scope.currentEvent.triggerTimer;
                }

                if (stateOrTime == "time" && !$scope.currentEvent.hasOwnProperty("triggerTimer")) {
                    $scope.currentEvent.triggerTimer = '* * * * *';
                }
                $("#editEventRunPanel").hide("slide",{
                    direction :  "right"
                },500);
                $("#editEventPanel").hide("slide",{
                    direction :  "right"
                },500,function(){
                    document.getElementById("ApioEventsContainer").classList.remove('event_open_edit_state');
                });
                console.log()
                _saveEvent()
            }

            function _saveEvent() {
                console.log("currentEvent vale:");
                console.log($scope.currentEvent);
                $http.put('/apio/event/'+$scope.currentEvent.name,{eventUpdate : $scope.currentEvent})
                .success(function(data){
                    alert("Event successfully updates");
                    if ($scope.showGuests == false)
                    $scope.toggleShowGuests();
                    $scope.statesToAddToEvent = [];
                    $("input.addNewGuest:checked").removeAttr("checked")
                })
                .error(function(){
                    alert("An error has occurred while updating the event")
                })
            }

            $scope.editEventFlag = false;

            $http.get('/apio/state')
                .success(function(data) {
                    console.log(data);
                    $scope.states = data;
                });
            $scope.deleteGuest = function(guest) {
                var i = $scope.currentEvent.triggeredStates.indexOf(guest);
                if (i > -1) {
                    $scope.currentEvent.triggeredStates.splice(i, 1);
                    _saveEvent();
                }

            };
            $scope.stateInList = function(item) {

                if ($scope.currentEvent.triggeredStates.indexOf(item.name) > -1)
                    return false;
                else
                    return true;
            }
            $scope.editEvent = function(event) {
                console.log("Mi accingo a modificare il seguente evento")
                console.log(event)
                $scope.currentEvent = event;
                $scope.editEventFlag = true;
                $scope.showGuests = true;

                document.getElementById('ApioEventsContainer').classList.add('openAppIconStyle');

                document.getElementById('ApioEventsContainer').classList.add('event_open_edit_state');
                $("#editEventPanel").show("slide", {
                    direction: 'right'
                }, 500, function() {
                    document.getElementById("editEventPanel").style.opacity = "1";
                    $("#editEventRunPanel").hide("slide",{
                        direction :  "right"
                    },500);
                });




            }

            $scope.showBack = false;
            $scope.currentFormStep = '';
            $scope.newEvent = {
                triggeredStates: {}
            };



            socket.on('apio_event_delete', function(data) {
                $scope.loadEvents();
            });
            socket.on('apio_event_new', function(data) {
                $scope.loadEvents();
            });

            $scope.loadEvents = function() {
                $http.get('/apio/event')
                    .success(function(data) {
                        console.log(data)
                        $scope.events = data;
                    }).error(function() {
                        console.log("Errore nel caricare gli eventi dal server");
                    });
            }

            $scope.loadEvents();



            function resetCron() {
                $("#selezioneDataNuovoEvento").html("");
                $("#selezioneDataNuovoEvento").cron({
                    onChange: function() {
                        if ($scope.newEvent.hasOwnProperty('type') && $scope.newEvent.type == 'timeTriggered') {
                            $scope.newEvent.triggerTimer = $(this).cron("value");
                            $scope.$apply();

                        } else {
                            console.log("Sto cambiando la data ma non ho settato il tipo, si sono coglione")
                        }

                    }
                });
            }
            function resetCronModifica() {
                $("#selezioneDataModificaEvento").html("");
                $("#selezioneDataModificaEvento").cron({
                    onChange: function() {
                        $scope.showSave = true;
                        if (stateOrTime == "time") {
                            $scope.currentEvent.triggerTimer = $(this).cron("value");
                        }
                    }
                });
            }

            resetCron();

            $scope.eventNameIsValid = function() {
                console.log("newEventName " + $scope.newEvent.name)
                if (typeof $scope.newEvent.name !== "undefined" && $scope.newEvent.name !== "")
                    return true;
                else
                    return false;
            }

            $scope.reset = function() {
            	document.getElementById('new_event').classList.remove('new_active_back_next');
                $scope.newEvent = {};
                $scope.newEvent.triggeredStates = {};
                resetCron();

                if ($scope.currentFormStep == 'sceltaTipo') {
                    $scope.showNewEventForm = false;
                    $scope.currentFormStep = "";
                } else if ($scope.currentFormStep == '') {
                    $scope.showNewEventForm = true;
                    $scope.currentFormStep = "sceltaTipo";
                } else {
                    $scope.showNewEventForm = true;
                    $scope.currentFormStep = "sceltaTipo";
                }


            }
            $scope.showBack = function() {
                if ($scope.currentFormStep == 'sceltaTipo'){

                    return false;}
                else{

                    return true;
                    }
            }
            $scope.goForward = function() {
                switch ($scope.currentFormStep) {
                    case "selezioneData":
                        $scope.goToFormStep('selezioneStatiScatenati');
                        break;
                    case "selezioneStatoScatenante":
                        $scope.goToFormStep('selezioneStatiScatenati');
                        break;
                    case "selezioneStatiScatenati":
                        $scope.goToFormStep('selezioneNomeEvento');

                        break;
                    default:
                        alert("Si è verificato un errore, tipo di evento non riconosciuto.")
                        $scope.goToFormStep('');
                        $scope.reset();
                        break
                }

            }
            $scope.goBack = function() {
                switch ($scope.currentFormStep) {
                    case "sceltaTipo":
                        break;
                    case "selezioneData":
                        $scope.goToFormStep('sceltaTipo');
                        break;
                    case "selezioneStatoScatenante":
                        $scope.goToFormStep('sceltaTipo');
                        document.getElementById('new_event').classList.remove('new_active_back_next');
                        break;
                    case "selezioneStatiScatenati":
                        if ($scope.newEvent.type == 'stateTriggered')
                            $scope.goToFormStep('selezioneStatoScatenante');
                        else if ($scope.newEvent.type == 'timeTriggered')
                            $scope.goToFormStep('selezioneData');
                        else {
                            alert("Si è verificato un errore, tipo di evento non riconosciuto.")
                            $scope.goToFormStep('');
                            $scope.reset();
                        }
                        break;
                    case "selezioneNomeEvento":
                        $scope.goToFormStep('selezioneStatiScatenati');
                        $scope.newEvent.name = "";
                        break;
                    default:
                        alert("Si è verificato un errore, tipo di evento non riconosciuto.")
                        $scope.goToFormStep('');
                        $scope.reset();
                        break
                }
            }

            $scope.checkedModel = function(state){
                function objectIndex(obj){
                    var index = -1;
                    var flag = true;
                    for(var i = 0;flag && i < $scope.newEvent.triggeredStates.length;i++){
                        if($scope.newEvent.triggeredStates[i].name == obj.name && $scope.newEvent.triggeredStates[i].objectName == obj.objectName){
                            index = i;
                            flag = false;
                        }
                    }

                    return index;
                }
                $scope.newEvent.triggeredStates = typeof $scope.newEvent.triggeredStates !== "undefined" && $scope.newEvent.triggeredStates instanceof Array ? $scope.newEvent.triggeredStates : [];
                var index = objectIndex({ "name" : state.name, "objectName" : state.objectName });
                if(index > -1){
                    $scope.newEvent.triggeredStates.splice(index, 1);
                }
                else{
                    $scope.newEvent.triggeredStates.push({
                        "name" : state.name,
                        "objectName" : state.objectName
                    });
                }
            };

            $scope.saveEvent = function() {

                console.log("Mi accingo a salvare il seguente evento");

                console.log($scope.newEvent);
                $http.post('/apio/event', {
                    event: $scope.newEvent
                })
                    .success(function(data) {
                        alert("Evento salvato con successo");
                        document.getElementById('new_event').classList.remove('new_active_back_next');
                        $scope.newEvent = {};
                        $scope.newEvent.triggeredStates = {};
                        $scope.showNewEventForm = false;
                        $scope.loadEvents();
                        $scope.currentFormStep = "";
                    })
                    .error("An error has occurred while saving the event")

                var checkbox = document.getElementsByName("all_guestslistOfGuests");
                for(var i in checkbox){
                    checkbox[i].checked = false;
                }
            }
            $scope.launchEvent = function(event) {

            }
            $scope.deleteEvent = function(event) {
                $http.delete('/apio/event/' + event.name)
                    .success(function(data) {
                        alert("Evento eliminato con successo");
                    }).error(function() {
                        alert("Errore nell'eliminazione dell'evento");
                    });

            }

            function haAlmenoUnoStatoScatenato() {
                for (var k in $scope.newEvent.triggeredStates) {
                    if ($scope.newEvent.triggeredStates[k])
                        return true;
                }
                return false;
            }
            $scope.showForward = function() {
                console.log("TriggerTimer " + $scope.newEvent.triggerTimer)
                switch ($scope.currentFormStep) {
                    case "selezioneStatoScatenante":
                        if ($scope.newEvent.hasOwnProperty('triggerState')) {
                            return true;
                        } else {
                            return false;
                        }
                        break;
                    case "selezioneStatiScatenati":

                        if ($scope.newEvent.hasOwnProperty('triggeredStates') && haAlmenoUnoStatoScatenato())
                            return true;
                        else
                            return false;
                        break;
                    case "selezioneData":
                        if ($scope.newEvent.hasOwnProperty('triggerTimer'))
                            return true;
                        else
                            return false;
                        break;


                }
            }

            $scope.goToFormStep = function(step) {
                $scope.currentFormStep = step;
                document.getElementById('new_event').classList.add('new_active_back_next');
                if (step == 'selezioneData')
                    $scope.newEvent.type = "timeTriggered";


                if (step == 'selezioneStatoScatenante') {
                    $scope.newEvent.type = 'stateTriggered';
                    $http.get('/apio/state')
                        .success(function(data) {

                        })
                        .error(function(data) {

                        });
                }
            }

        }
    ])
