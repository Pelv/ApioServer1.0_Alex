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


var apioProperty = angular.module("apioProperty");
apioProperty.directive("slider", ["currentObject", "socket", "$timeout", function(currentObject, socket, $timeout){
	return{
	    restrict: "E",
	    replace: true,
	    scope: {
	    	model: "=propertyname"
	    },
	    templateUrl: "/apioProperties/Slider/slider.html",
	    link: function(scope, elem, attrs){
	    	scope.object = currentObject.get();
	    	scope.currentObject = currentObject;
	    	scope.isRecorded = function() {
	    		return scope.currentObject.record(attrs['propertyname']);
	    	}
	    	scope.addPropertyToRecording = function() {
	    		scope.currentObject.record(attrs['propertyname'], scope.model);
	    	}
	    	scope.removePropertyFromRecording = function() {
	    		scope.currentObject.removeFromRecord(attrs['propertyname']);
	    	}
	    	//Serve per il cloud: aggiorna in tempo reale il valore di una proprietà che è stata modificata da un"altro utente
			socket.on("apio_server_update", function(data){
				if(data.objectId === scope.object.objectId  && !scope.currentObject.isRecording()){
					if(data.properties.hasOwnProperty(attrs["propertyname"])){
						scope.$parent.object.properties[attrs["propertyname"]] = data.properties[attrs["propertyname"]];
						if (attrs["push"]) {
							scope.$parent.$eval(attrs["push"]);

							var $property = {
								name : attrs["propertyname"],
								value : data.properties[attrs["propertyname"]]
							};
							var fn = scope.$parent[attrs["push"]];
							if(typeof fn === "function"){
								var params = [$property];
								fn.apply(scope.$parent,params);
							}
							else{
								throw new Error("The Push attribute must be a function name present in scope")
							}
						}
						else{
							scope.model = data.properties[attrs["propertyname"]];
						}
						//In particolare questa parte aggiorna il cloud nel caso siano state definite delle correlazioni
						/*if(attrs["correlation"]){
							scope.$parent.$eval(attrs["correlation"]);
						}*/
						//
					}
				}
			});
			//
			socket.on("apio_server_update_", function(data){
				if(data.objectId === scope.object.objectId  && !scope.currentObject.isRecording()){
					scope.model = data.properties[attrs["propertyname"]];
				}
			});

	    	//Inizializzo la proprietà con i dati memorizzati nel DB
			scope.label = attrs["label"];
	    	scope.max = attrs["max"];
			scope.min = attrs["min"];
	    	scope.model = scope.object.properties.hasOwnProperty(attrs["propertyname"]) ? scope.object.properties[attrs["propertyname"]] : attrs["value"];
            //alert(scope.model);
	    	scope.propertyname = attrs["propertyname"];
	    	scope.step = attrs["step"];
	    	//

	    	//Variante: angular setta il value dell'input prima di settare max, min e step, questa procedura fa in modo di ri-settare questi attributi dopo che è cambiato il valore di model
	    	scope.$watch('min', function(){
	    		setValue();
	    	});
            scope.$watch('max', function(){
            	setValue();
            });
            scope.$watch('step', function(){
            	setValue();
            });
            scope.$watch('model', function(){
            	setValue();
            });
            scope.$on('propertyUpdate',function() {
            	scope.object = currentObject.get();
			});

			//Se il controller modifica l'oggetto allora modifico il model;
			scope.$watch("object.properties."+attrs["propertyname"], function(){
			  	scope.model = scope.object.properties[attrs["propertyname"]];
		    });
		    //

            function setValue(){
            	var el = $(elem).find("input");
                if(angular.isDefined(scope.min) && angular.isDefined(scope.max) && angular.isDefined(scope.step) && angular.isDefined(scope.model)){
                    el.attr("min", scope.min);
                    el.attr("max", scope.max);
                    el.attr("step", scope.step);
                    el.val(scope.model);
                }
            }

            function read(){
            	var el = $(elem).find("input");
                scope.model = el.val();
            }
            //

        var event = attrs["event"] ? attrs["event"] : "mouseup touchend";
	    	elem.on(event, function($event){
	    		//Aggiorna lo scope globale con il valore che è stato modificato nel template
				scope.object.properties[attrs["propertyname"]] = scope.model;

	    		if (!currentObject.isRecording()) {

					//

					//Se è stato definito un listener da parte dell'utente lo eseguo altrimenti richiamo currentObject.update che invia i dati al DB e alla seriale
					if(attrs["listener"]){
						scope.$parent.$eval(attrs["listener"]);
					}
					else{
						if (attrs["updatedataonce"] && event == 'input') {
							console.log("Syncing with serial only");
							currentObject.stream(attrs["propertyname"],scope.model)
							//currentObject.update(attrs["propertyname"], scope.model,false,true);
							//scope.$parent.object.properties[attrs["propertyname"]] = scope.model;
						} else{
							console.log("Syncing with database and serial");

							currentObject.update(attrs["propertyname"], scope.model);
						}

						scope.$parent.object.properties[attrs["propertyname"]] = scope.model;
					}
					//

					//Se è stata definita una correlazione da parte dell'utente la eseguo
					if(attrs["correlation"]){
						scope.$parent.$eval(attrs["correlation"]);
					}
					//

					 //Esegue codice javascript contenuto nei tag angular; dovendo modificare i valori dell'input bisogna dare a scope.$apply la funzione read
					scope.$apply(read);

	    		}
			});
			elem.on('mouseup touchend',function($event){
				if (attrs["updatedataonce"] && event == 'input') {
					console.log("Syncing with database only");
					currentObject.update(attrs["propertyname"], scope.model,true,false);
					//scope.$parent.object.properties[attrs["propertyname"]] = scope.model;
				}
			})


		    //
	    }
	};
}]);
