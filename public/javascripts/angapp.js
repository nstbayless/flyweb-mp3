var app = angular.module('angApp', []);
app.controller('angCon', function($scope, $http) {
	$scope.pl=pl;

	$scope.range = function (n) {
		l = [];
		for (i=0;i<n;i++)
			l.push(i);
		return l;
	}

	$scope.pretty_time = function (t) {
		date = new Date(t*1000);
		mm = date.getUTCMinutes();
		ss = date.getSeconds();
		if (ss<10)
			ss = "0" + ss;
		return mm + ":" + ss
	}
});s
