var app = angular.module('angApp', []);
var socket = io();

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

	$scope.status = {
		title: 'Nothing Playing',
		state: 'paused',
		duration: 0,
		time_elapsed: 0
	};

	$scope.progress_style = {
		width: "0%"
	}

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

	$scope.pause_song = function() {
		socket.emit('pause');
	}

	$scope.prev_song = function() {
		socket.emit('prev');
	}

	$scope.next_song = function() {
		socket.emit('next');
	}

	//submit form upload
	$scope.submit = function(){
		console.log("hello, world!");
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

	socket.on('status', function(status) {
		var prog_percent = status.time_elapsed / status.duration;
		prog_percent = isNaN(prog_percent) ? 0 : prog_percent * 100;

		if (status.state === 'paused') {
			$('#controls-play').removeClass('glyphicon-pause').addClass('glyphicon-play');
		} else if (status.state === 'playing') {
			$('#controls-play').removeClass('glyphicon-play').addClass('glyphicon-pause');
		}

		$scope.status = status;
		$scope.progress_style.width = prog_percent + "%";
		$scope.$apply();
	});
	
	//live update playlist
	socket.on('playlist', function(update) {
	    if (update.listId===$scope.pl.id) {
	        if (update_lock) {
	            return;
	            console.log("async error: playlist update");
	        }
	        $scope.pl=update.list;
	        $scope.replace_playlist();
	    }
	});
	
	//live update playlist
	socket.on('track', function(update) {
	    if (!update_lock) {
			if (update.listId==pl.id)
				$scope.pl_track_index = update.songIndex
			else
				$scope.pl_track_index = -1;
			$scope.replace_playlist();
		} else {
    		console.log("async error: track update");
		}
	});
});
