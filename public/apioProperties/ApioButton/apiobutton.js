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
apioProperty.directive("apiobutton", ["currentObject", "socket", "$timeout", function(currentObject, socket, $timeout){
	return{
	    restrict: "E",
	    replace: true,
	    scope: {
	    	model: "=propertyname"
	    },
	    templateUrl: "apioProperties/ApioButton/apiobutton.html",
	    link: function(scope, elem, attrs){
	    	scope.object = currentObject.get();
	    	scope.currentObject = currentObject;
            scope.model = attrs["value"] ? attrs["value"] : 1;
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
				if(data.objectId === scope.object.objectId  && !currentObject.isRecording()){
					if(data.properties.hasOwnProperty(attrs["propertyname"])){
						scope.model = data.properties[attrs["propertyname"]];
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
	    	scope.innertext = attrs["innertext"];
	    	scope.label = attrs["label"];
	    	scope.propertyname = attrs["propertyname"];
	    	//
	    	
            scope.$on('propertyUpdate',function() {
            	scope.object = currentObject.get();
			});
			
            var event = attrs["event"] ? attrs["event"] : "mouseup touchend";
	    	elem.on(event, function(){
				if(!currentObject.isRecording()){
					//Aggiorna lo scope globale con il valore che è stato modificato nel template
			    	scope.object.properties[attrs["propertyname"]] = scope.model;
		    		//
	
					//Se è stato definito un listener da parte dell'utente lo eseguo altrimenti richiamo currentObject.update che invia i dati al DB e alla seriale
                    if(attrs["listener"]){
                        scope.$parent.$eval(attrs["listener"]);
                    }
                    else{
                        currentObject.update(attrs["propertyname"], scope.model);
                    }
					//
					
					//Se è stata definita una correlazione da parte dell'utente la eseguo
					if(attrs["correlation"]){
						scope.$parent.$eval(attrs["correlation"]);
					}
					//
					
					//Esegue codice javascript contenuto nei tag angular
					scope.$apply();
					//
				}
			});
			

		    //
		}
	};
}]);
