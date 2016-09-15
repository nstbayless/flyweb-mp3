var app = angular.module('angApp', []);
app.controller('angCon', function($scope, $http) {
	try{ $scope.pl=pl } catch(e) {} //pl might not be supplied
	$scope.track = track;	

	$scope.range = function (n) {
		l = [];
		for (i=0;i<n;i++)
			l.push(i);
		return l;
	}

	//converts seconds to m:ss time format
	$scope.pretty_time = function (t) {
		date = new Date(t*1000);
		mm = date.getUTCMinutes();
		ss = date.getSeconds();
		if (ss<10)
			ss = "0" + ss;
		return mm + ":" + ss
	}

	//creates text-based tracker
	$scope.get_tracker_text = function () {
		var has_duration=true;
		if ($scope.track.props.type=="silence")
			has_duration=false;
		if ($scope.track.props.type=="empty")
			has_duration=false;
		if (!has_duration) {
			return "---";
		}
		var t_elapsed = $scope.track.t_elapsed;
		var duration = $scope.track.props.duration;
		var counter_n = 50;
		var p = t_elapsed/duration;
		var counter_n_elapsed = Math.round(counter_n*p);
		return $scope.pretty_time(t_elapsed) + "  [" + "@".repeat(counter_n_elapsed) + "~".repeat(counter_n-counter_n_elapsed)+"]  " + $scope.pretty_time(duration);
	}
});
