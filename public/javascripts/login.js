var app = angular.module('ApioLoginApplication', []);
app.controller('LoginController', ['$scope', '$http',
    function($scope, $http) {
        $scope.clearError = function() {
            $scope.$invalid = false;
        }
        $scope.showSignupForm = false;
        $scope.email = "";
        $scope.password = "";

        $scope.switchToSignup = function() {
            $scope.showSignupForm = true;
        }
        $scope.signup = function() {
            var p = $http.post('/apio/user', {
                'email': $scope.signupEmail,
                'password': $scope.signupPassword,
                'passwordConfirm': $scope.signupPasswordConfirm
            });
            p.success(function(data) {
                if (data.error) {
                    console.log("data.error")
                    $scope.$signupError = true;
                } else
                    window.location = '/';
            })
            p.error(function(data) {
                $scope.$signupError = true;
            })
        }

        $scope.login = function() {
            var promise = $http.post('/apio/user/authenticate', {
                'email': $scope.email,
                'password': $scope.password
            });
            promise.success(function(data, status, headers) {
                if (data.status == true) {

                    $scope.userdata = data.user;
                    console.log($scope.userdata)
                    window.location = '/app';
                } else
                    $scope.$invalid = true;
            });
            promise.error(function(data, status, headers) {
                $scope.$invalid = true;
            })
        }
    }
])
