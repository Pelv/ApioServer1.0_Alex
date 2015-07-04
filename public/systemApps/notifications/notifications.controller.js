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


angular.module('ApioApplication').controller('ApioNotificationController',['$scope','$http','socket',function($scope,$http,socket){

        $scope.notifications = [];
        socket.on('apio_notification', function(notification) {
            console.log("Notifica")
            console.log(notification)
            $scope.loadNotifications();
            if (!("Notification" in window)) {
                alert("Apio Notification : " + notification.message);
            }
            // Let's check if the user is okay to get some notification
            else if (Notification.permission === "granted") {
                // If it's okay let's create a notification
                var notificationObject = new Notification("Apio Notification", {
                    body: notification.message,
                    icon : '/images/Apio_Logo.png'
                });
                notificationObject.onclick = function() {
                    $scope.markAsRead(notification)
                }
            }

            // Otherwise, we need to ask the user for permission
            // Note, Chrome does not implement the permission static property
            // So we have to check for NOT 'denied' instead of 'default'
            else if (Notification.permission !== 'denied') {
                Notification.requestPermission(function(permission) {
                    // If the user is okay, let's create a notification
                    if (permission === "granted") {
                        var notificationObject = new Notification("Apio Notification", {
                            body: notification.message,
                            icon : '/images/Apio_Logo.png'
                        });
                        notificationObject.onclick = function() {
                            $scope.markAsRead(notification)
                        }
                    }
                });
            }


        });
    $scope.showDisabled = false;

    $scope.toggleShowDisabled = function(){
        $scope.showDisabled = !$scope.showDisabled;
    };

    $scope.publishNotify = function(n){
        var s = {
            "active" : false,
            "name" : n.message,
            "objectName" : n.objectName,
            "objectId" : n.objectId,
            "properties" : n.properties
        };
        var dao = {
            state : s
        };
        $http.post('/apio/state', dao)
            .success(function(data){
                if(data.error === 'STATE_NAME_EXISTS'){
                    alert("Uno stato con questo nome è già presente in bacheca, si prega di sceglierne un altro")
                }
                if(data.error === 'STATE_PROPERTIES_EXIST'){
                    alert("Lo stato di nome "+s.name+" non è stato pubblicato perchè lo stato "+data.state+" ha già le stesse proprietà");
                }
                if(data.error === false) {
                    alert("Notifica pubblicata");
                }
            })
            .error(function(){
                alert("Si è verificato un errore di sistema");
            });
    };

    $scope.disableNotify = function(n) {
        console.log("CHIAMO DISABLENOTIFY CON");
        console.log(n);
        $http.post('/apio/notifications/disable',{
            "notification" : n
        }).success(function(data,status,headers){
            alert("Notifica disabilitata con successo");
        }).error(function(data,status,headers){
            alert("ERRORE nella disabilitazione della notifica")
        });
    };

    $scope.enableNotify = function(n){
        $http.post('/apio/notifications/enable',{
            "notification" : n
        }).success(function(data,status,headers){
            alert("Notifica abilitata con successo");
            $scope.loadNotifications();
        }).error(function(data,status,headers){
            alert("ERRORE nell'abilitazione della notifica")
        });
    };

        $scope.getTimeFromTimestamp = function(t) {
            var date = new Date(t*1000);
            // hours part from the timestamp
            var hours = date.getHours();
            // minutes part from the timestamp
            var minutes = "0" + date.getMinutes();
            // seconds part from the timestamp
            var seconds = "0" + date.getSeconds();

            // will display time in 10:30:23 format
            var formattedTime = hours + ':' + minutes.substr(minutes.length-2) + ':' + seconds.substr(seconds.length-2);

            return formattedTime;
        }


        $scope.loadNotifications = function() {
            $scope.notifications = [];
            $scope.disabledNotifications = [];
            $http.get('/apio/notifications')
                .success(function(data,status,headers){
                    console.log("Got notifications");
                    console.log(data)
                    data.forEach(function(e,i,a){
                        $scope.notifications.push(e)
                    })

                })
                .error(function(data,status,headers){
                    console.log("Unable to download notifications");
                });

            $http.get('/apio/notifications/listDisabled')
                .success(function(data,status,headers){
                    console.log("Got notifications");
                    console.log(data)
                    data.forEach(function(e,i,a){
                        $scope.disabledNotifications.push(e);
                    })

                })
                .error(function(data,status,headers){
                    console.log("Unable to download notifications");
                });
        };
        $scope.loadNotifications();
        $scope.markAsRead = function(n) {
            console.log("CHIAMO MARKESRID CON")
            console.log(n)
            $http.post('/apio/notifications/markAsRead',{
                "notification" : {
                    "message" : n.message,
                    "objectId" : n.objectId
                }
            }).success(function(data,status,headers){
                console.log("Notifica eliminata con successo");
                $scope.loadNotifications();
            }).error(function(data,status,headers){
                console.log("ERRORE nell'eliminazione della notifica")
            })
        }
}])
