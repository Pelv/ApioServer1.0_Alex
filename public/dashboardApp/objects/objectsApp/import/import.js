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
.controller('ApioDashboardImportController', ['$scope','$http','FileUploader','$state', function($scope,$http,FileUploader,$state){
	var uploader = $scope.uploader = new FileUploader({
            url: '/apio/app/upload',
            queueLimit : 1,
            onSuccessItem : function(item, response, status, headers) {
            	$state.go('objects.objectsLaunch',{'reload':true});
            	console.log('response: ')
            	console.log(response)
            	alert('Application successfully uploaded! Keep in mind to deactivate the popup block to enable the firmware automatic download.')
            	window.open('/apio/app/exportIno?id='+response.id);            	
            }
        });	
      $scope.gitImport = function(path){
            console.log("git path: "+path);
            $('#modalGitClone').modal('show');
            $http.post('/apio/app/gitCloneApp',{gitPath: path})
              .success(function(data,status,headers){
                $('#modalGitClone').modal('hide');
                $state.go('objects.objectsLaunch',{'reload':true});
                  console.log('response: ')
                  console.log(data)
                  alert('Application successfully uploaded! Keep in mind to deactivate the popup block to enable the firmware automatic download.')
                  window.open('/apio/app/exportIno?id='+data.id);
              })
              .error(function(){
                  $('#modalGitClone').modal('hide');
                  console.log("An error has occurred while cloning the repo")
              });
      }
}]);