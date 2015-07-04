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


angular.module('ApioDashboardApplication')
.controller('ApioDashboardEventsController', ['$scope', '$http', function($scope,$http){
	 $scope.events = [];

	 $scope.initApioDashboardEvents = function() {
	    //Carico gli eventi
	    $http.get('/apio/event')
	          .success(function(data){
	            $scope.events = data;
	    });
	};

	$scope.initApioDashboardEvents();

	$scope.addTriggeredState = function() {
	  	console.log("Aggiungo "+$scope.newTriggeredState)
	  	$scope.event.triggeredStates.push($scope.newTriggeredState);
	  	$scope.newTriggeredState = '';
	};

	$scope.saveEvent = function() {
	  	var event_data = $scope.event;
	  	$http({
	  		method : 'POST',
	  		url : '/apio/event',
	  		data : {event : event_data}
	  	})
	  	.success(function(data,status,header){
	  		console.log('/apio/event/state success()');
	  		$scope.event = {};
	  		alert("Event saved")
	  	})
	  	.error(function(data,status,header){
	  		console.log('/apio/event/state success()');
	  	})

	};

	$scope.launchEvent = function(e) {
      console.log(e);
      $http.get('/apio/event/launch',{
        params : {
          eventName : e.name
        }
      })
      .success(function(data,status,header){
        alert("Evento lanciato correttamente")
      })
      .error(function(data,status,header){
        alert("Evento non lanciato")
      })
    };
}]);