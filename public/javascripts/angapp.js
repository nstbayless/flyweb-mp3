var app = angular.module('angApp', []);
app.controller('angCon', function($scope, $http, $timeout) {
	$scope.pl = {}
	try{
		$scope.pl=pl;
		$scope.pl_track_index=-1;
		
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

	update_lock=false;
	
	//zebra stripes for playlist
	$scope.repaint_playlist = function(col1,col2,num) {
		update_lock=!num;
		var rows = pl_table.children
		for (var i=0;i<rows.length;i++) {
			rows[i].style["background-color"]=(i%2==0)?col1:col2;
			rows[i].childNodes[0].innerHTML=(num)?String(i+1):"";
		}
	}

	//replaces playlist table with new one, with new elements
	$scope.replace_playlist = function () {
		//add children:
		for (i=0;i<$scope.pl.songs.length;i++) {
			var song = $scope.pl.songs[i];
			var tr;
			if (i>=pl_table.children.length) {
				tr = document.createElement("tr");
				pl_table.appendChild(tr);
			} else
				tr=pl_table.children[i];
			
			while (tr.firstChild)
				tr.removeChild(tr.firstChild)
			tr.setAttribute("data",song.id);
			//TODO: bold if playing.
			style="font-weight:"+((i==$scope.pl_track_index)?'bold':'normal')+';';

			//add number cell:
			var td = document.createElement("td");
			td.setAttribute('class', "q num");
			td.setAttribute('style',style)
			td.innerHTML=(i+1)
			tr.appendChild(td); 
			
			//add name cell
			td = document.createElement("td");
			td.setAttribute('class', "q");
			td.setAttribute('style',style)
			td.innerHTML=(song.name);
			tr.appendChild(td); 

			//add duration cell
			td = document.createElement("td");
			td.setAttribute('class', "q");
			td.innerHTML=($scope.pretty_time(song.duration));
			td.setAttribute('style',style)
			tr.appendChild(td);
		}
		$scope.repaint_playlist("#ccf","#eef",true)
	}

	//edit playlist	
	$scope.arrange_playlist = function(list) {
		pl.songIds=list;
		var endpoint= "/api/" + $scope.pl.id;
		$.post(endpoint,{l:list});
	}

	//live update playlist:
	$scope.update_playlist = function() {
		var endpoint= "/api/p/" + $scope.pl.id;
		$.get(endpoint, (pl) => {
			if (!update_lock) {
				$scope.pl = pl
				$scope.replace_playlist();
			}
		});
	}

	//live update current song:
	$scope.update_currentSong = function() {
		var endpoint= "/api/track";
		$.get(endpoint, (track) => {
			console.log(track);
			if (!update_lock) {
				if (track.list_id==pl.id)
					$scope.pl_track_index = track.index
				else
					$scope.pl_track_index = -1;
				$scope.replace_playlist();
			}
		});
	}

	//grabs updates to page from server
	$scope.live_update = function() {
		if ($scope.pl) {
			$scope.update_playlist();
			$scope.update_currentSong();
		}
		$timeout(function() {
			$scope.live_update()
		}, 300)
	}
	$scope.live_update();
});
