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


var apioApplication = angular.module("ApioApplication");
apioApplication.directive("topappapplication", ["currentObject", "socket", "$http", "$timeout", "$rootScope", "$location", function(currentObject, socket, $http, $timeout, $rootScope, $location){
	return{
	    restrict: "E",
	    replace: true,
	    scope: {},
	    templateUrl: "systemApps/topAppApplication/topAppApplication.html",
	    link: function(scope, elem, attrs, controller){
	    	scope.object = currentObject.get();
			currentObject.isRecording(false);
			scope.currentObject = currentObject;
			scope.showPublishButton = false;
			scope.showPublishButtonActive = false;
			scope.newStatusName = "";
			scope.newEventName = "";
			scope.object = currentObject.get();

			function removeRecordingStatus(){
				scope.currentObject.resetRecord();
				scope.showPublishButton = false;
				currentObject.isRecording(false);
				scope.newStatusName = '';
				scope.newEventName = '';
				scope.recStep = '';
				$timeout(function(){
					if (document.getElementById("app"))
						document.getElementById("app").style.display = "block";
				}, 0);
				currentObject.sync(function(){
					currentObject.isRecording(false); //Esco dalla recording mode
					scope.object = currentObject.get(); //risetto l'oggetto ai valori presi dal sync
					scope.$parent.$broadcast('propertyUpdate');
					scope.$apply(); //per riapplicare i bindings
				});
			}

			scope.recStep = "";

            scope.goBackToHome = function(){
                $("#ApioApplicationContainer").hide("slide", {
                    direction: 'right'
                }, 500, function () {
                    Apio.newWidth = Apio.appWidth;
                    $("#ApioApplicationContainer").css("width", Apio.appWidth+"px");
                    if (window.innerWidth > 769) {
                        $("#ApioIconsContainer").css("width", "100%");
                    }
                    document.getElementById("ApioApplicationContainer").classList.remove("fullscreen");
                    $location.path("/app#/home");
                    scope.$parent.$apply();
                });
            };

			scope.saveModify = function(){
				var toDB = scope.currentObject.record();
				var _p = {};
				for (var k in toDB)
					_p[k] = scope.$parent.object.properties[k];

				console.log("Le modifiche da applicare sono:")
				console.log(_p)
				var stateName = currentObject.recordingStateName();
				$http.put("/apio/state/"+stateName, {state : _p})
				.success(function(){
					//document.getElementById("appApio").innerHTML = "";
					document.getElementById("ApioApplicationContainer").innerHTML = "";
		            $("#ApioApplicationContainer").hide("slide", {
		                direction: 'right'
		            }, 500, function() {
						document.getElementById('wallContainer').classList.remove('wall_open_edit_state');
					});
					scope.currentObject.resetRecord();
					currentObject.isRecording(false);
					currentObject.isModifying(false);
					$rootScope.$emit('requestReloadStates');
				})
				.error(function(){
					alert("Impossibile salvare");
				});
				$("#wallContainer").css("width", "");
			}

			scope.startRecording = function(){
			    currentObject.isRecording(true);
			    scope.showPublishButton = false;
			}

			scope.stopRecording = function(){
				if(currentObject.isModifying()){
					currentObject.isModifying(false);
					//document.getElementById("appApio").innerHTML = "";
					document.getElementById("ApioApplicationContainer").innerHTML = "";
					$("#ApioApplicationContainer").hide("slide", {
		                direction: 'right'
		            }, 500,
		            function() {
			           document.getElementById('wallContainer').classList.remove('wall_open_edit_state');
		            });
		        }
				else{
					currentObject.isRecording(false);
				}
				$("#wallContainer").css("width", "");
				removeRecordingStatus();
			}

			scope.useRecording = function(){
				scope.showPublishButton = true;
				if(currentObject.isRecording() !== true || scope.currentObject.recordLength() < 1){
					return;
				}

				for(key in scope.currentObject.record())
					scope.currentObject.record(key, scope.object.properties[key]);

				scope.recStep = "EventOrWall";
				$timeout(function(){
					document.getElementById("app").style.display = "none";
				}, 0);
			}

			scope.eventRecording = function(){
				scope.recStep = "EventNameChoice";
			}

			scope.wallRecording = function(){
				scope.recStep = "StatusNameChoice";
			}

			scope.showPublish = function(){
				if((scope.recStep === "StatusNameChoice" && scope.newStatusName !== "") || (scope.recStep === "EventNameChoice" && scope.newStatusName !== "" && scope.newEventName !== "")){
					scope.showPublishButtonActive = true;
				}
			}

			scope.publishRecording = function(){
				console.log("publishRecording() chiamato allo stato "+scope.recStep)
				if(scope.recStep !== 'EventNameChoice' && scope.recStep !== 'StatusNameChoice')
					return;

				var o = {};
				o.sensors = [];
				$('#ApioApplicationContainer')
					.find('.box_proprietaiPhone[issensor=\'true\']')
					.each(function(index){
						if (currentObject.record().hasOwnProperty($(this).attr('id'))){
							o.sensors.push($(this).attr('id'))
						}
					});
				o.active = false;
				o.name = scope.newStatusName;
				o.objectName = scope.object.name;
				o.objectId = scope.object.objectId;
				o.properties = scope.currentObject.record();
				var dao = {};
				dao.state = o;
				if(scope.newEventName !== ''){
					var e = {};
					e.name = scope.newEventName;
					dao.event = e;
				}

				//Ho impacchettato evento e stato dentro la variabile dao che invio al server
				$http.post('/apio/state',dao)
				.success(function(data){
					if(data.error === 'STATE_NAME_EXISTS'){
						alert("Uno stato con questo nome è già presente in bacheca, si prega di sceglierne un altro")
					}
					if(data.error === 'STATE_PROPERTIES_EXIST'){
						alert("Lo stato di nome "+o.name+" non è stato pubblicato perchè lo stato "+data.state+" ha già le stesse proprietà");
						removeRecordingStatus();
					}
					if(data.error === 'EVENT_NAME_EXISTS'){
						alert('Esiste già un evento di nome '+e.name);
					}
					if(data.error === false){


						//$('#appApio').find('.box_proprietaiPhone[issensor=\'true\']').each(function(index){
						$('#ApioApplicationContainer').find('.box_proprietaiPhone[issensor=\'true\']').each(function(index){
							//Check, devo controllare che questo sensore sia stato effettivamente registrato
							/*if (currentObject.record().hasOwnProperty($(this).attr('id')))
								console.log("Il sensore "+$(this).attr('id')+" effettivamente va comunicato alla seriale")
							else
								console.log("Il sensore "+$(this).attr('id')+" non deve essere notificato alla seriale")
							*/


							if (currentObject.record().hasOwnProperty($(this).attr('id'))) {
								alert("Il sensore "+$(this).attr('id')+" effettivamente va comunicato alla seriale")
								var props = {

								}
								props[$(this).attr('id')] = scope.object.properties[$(this).attr('id')]
								var d = {
									//isSensor : true,
									//message : $(this).attr('id')+':'+scope.object.properties[$(this).attr('id')],
									objectId : scope.object.objectId,
									properties : props
								}

								d.properties[$(this).attr('id')] =scope.object.properties[$(this).attr('id')];
								var e = $(this);


								$http.post('/apio/serial/send',{data : d})
									.success(function(data){
										console.log("Sensore notificato con successo")
									})
									.error(function(data){
										console.log("Impossibile notificare il sensore")
									})
							}



						})
						if(scope.newEventName !== '')
							alert("Stato ed evento creati con successo");
						else
							alert("Stato creato con successo");
						removeRecordingStatus();
					}
				})
				.error(function(){
					alert("Si è verificato un errore di sistema");
				})
			}
		}
	};
}]);
