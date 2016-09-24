var app = angular.module('angApp', []);
app.controller('angCon', function($scope, $http, $timeout) {
	$scope.pl = {}
	try{
		$scope.pl=pl;
		
		pl_table = document.getElementById("pltable");
		pl_sortable = new Sortable(pl_table, {
			dataIdAttr:"data",
			animation: 170,
			onStart:function(evt) {
				$scope.repaint_playlist("#eee","#eee",false);
			},
			onEnd:function(evt) {
				$scope.arrange_playlist(pl_sortable.toArray());
				$scope.repaint_playlist("#ccf","#eef",true);
			}
		});
	} catch(e) {} //pl might not be supplied on this page; this is okay.
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
	
	//zebra stripes for playlist
	$scope.repaint_playlist = function(col1,col2,num) {
		var rows = pl_table.children
		for (var i=0;i<rows.length;i++) {
			rows[i].style["background-color"]=(i%2==0)?col1:col2;
			rows[i].childNodes[0].innerHTML=(num)?String(i+1):"";
		}
	}

	//edit playlist	
	$scope.arrange_playlist = function(list) {
		pl.l_song_id=list;
		var endpoint= "/api/" + $scope.pl.id;
		$.post(endpoint,{l:list});
	}

	//live update playlist:
	$scope.update_playlist = function() {
		var endpoint= "/api/p/" + $scope.pl.id;
		$.get(endpoint, (pl) => {
			$scope.pl = pl
		});
	}

	//grabs updates to page from server
	$scope.live_update = function() {
		if ($scope.pl)
			$scope.update_playlist();
		$timeout(function() {
			$scope.live_update()
		}, 40)
	}
	//$scope.live_update();
});
