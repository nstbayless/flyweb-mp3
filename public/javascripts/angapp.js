var app = angular.module('angApp', []);
var socket = io();

app.controller('angCon', function($scope, $http, $timeout) {
    // semaphore for GETting playlist
    update_lock = 0;

    pl_table = undefined;

    // jade input variables:
    $scope.list = {};
    try {
        $scope.list = list;
        $scope.pl_track_index = -1;
        
        if (list.id==currentListId)
            $scope.pl_track_index = currentSongIndex;
        

        // make table rearrangeable:
        pl_table = document.getElementById("pltable");
        pl_sortable = new Sortable(pl_table, {
            dataIdAttr: "data",
            animation: 170,
            onStart: function(evt) {
                update_lock++;
                $scope.repaint_playlist("#eee", "#eee", false);
            },
            onEnd: function(evt) {
                update_lock--;
                $scope.move_song(evt.oldIndex, evt.newIndex);
                $scope.repaint_playlist("#ccf", "#eef", true);
            }
        });
    } catch (e) {
        // list might not be supplied on this page; this is okay.
    }

    $scope.status = {
        title: 'Nothing Playing',
        state: 'paused',
        duration: 0,
        time_elapsed: 0
    };

    $scope.progress_style = {
        width: "0%"
    };

    $scope.range = function(n) {
        var l = [];
        for (var i = 0; i < n; i++) {
            l.push(i);
        }
        return l;
    };

    // converts seconds to m:ss time format
    $scope.pretty_time = function(t) {
        var date = new Date(t * 1000);
        var mm = date.getUTCMinutes();
        var ss = date.getSeconds();
        if (ss < 10) {
            ss = "0" + ss;
        }
        return mm + ":" + ss;
    };

    $scope.pause_song = function() {
    	socket.emit('pause');
    };

    $scope.prev_song = function() {
    	socket.emit('prev');
    };

    $scope.next_song = function() {
    	socket.emit('next');
    };

    // moves element in list
    function move_in_list(l, from, to) {
        var e = l[from];
        l.splice(from, 1);
        l.splice(to, 0, e);
    }

    // zebra stripes for playlist
    $scope.repaint_playlist = function(col1, col2, num) {
        var rows = pl_table.children;
        for (var i = 0; i < rows.length; i++) {
            rows[i].style["background-color"] = (i % 2 == 0) ? col1 : col2;
            rows[i].childNodes[0].innerHTML = (num) ? String(i + 1) : "";
        }
    };

    // replaces playlist table with new one, with new elements
    $scope.replace_playlist = function() {
        // add children:
        for (var i = 0; i < $scope.list.songs.length; i++) {
            var song = $scope.list.songs[i];
            var tr;
            if (i >= pl_table.children.length) {
                tr = document.createElement("tr");
                pl_table.appendChild(tr);
            } else {
                tr = pl_table.children[i];
            }

            while (tr.firstChild) {
                tr.removeChild(tr.firstChild);
            }
            tr.setAttribute("data", song.id);
            // TODO: bold if playing.
            var style = "font-weight:" + ((i == $scope.pl_track_index) ? 'bold' : 'normal') + ';';

            // add number cell:
            var td = document.createElement("td");
            td.setAttribute('class', "q num");
            td.setAttribute('style', style);
            td.innerHTML = (i + 1);
            tr.appendChild(td);

            // add name cell
            td = document.createElement("td");
            td.setAttribute('class', "q");
            td.setAttribute('style', style);
            td.innerHTML = song.name;
            tr.appendChild(td);

            // add duration cell
            td = document.createElement("td");
            td.setAttribute('class', "q");
            td.innerHTML = ($scope.pretty_time(song.duration));
            td.setAttribute('style', style);
            tr.appendChild(td);

            // add x button
            td = document.createElement("td");
            td.setAttribute('class', "qx");
            // href within td
            var hrefx = document.createElement("a");
            hrefx.style["onmouseover"] = "";
            hrefx.style["cursor"] = "pointer";
            //hrefx.setAttribute("href","/");
            // x image within href:
            var imgx = document.createElement("img");
            imgx.setAttribute("src", "/images/item_x.png");
            //on-click to delete:
            (function() {
                var capture_i = i;
                hrefx.onclick = function() {
                    $scope.remove_song(capture_i);
                }
            })();
            hrefx.appendChild(imgx);
            td.appendChild(hrefx);
            td.setAttribute('style', style);
            tr.appendChild(td);
        }
        //delete extra rows:
        for (var i=$scope.list.songs.length;i<pl_table.children.length;i++) {
            pl_table.removeChild(pl_table.children[i]);
        }
        $scope.repaint_playlist("#ccf", "#eef", true);
    };
    
    if (pl_table !== undefined) {
        // replace playlist on startup
        $scope.replace_playlist();
    }

    // edit playlist
    $scope.move_song = function(index_start, index_end) {
        move_in_list($scope.list.songIds, index_start, index_end);
        move_in_list($scope.list.songs, index_start, index_end);
        var endpoint = "/api/" + $scope.list.id;
        update_lock++;
        $.post(endpoint, {
            from: index_start,
            to: index_end
        }, () => {
            update_lock--;
        });
    };

    // remove song from playlist:
    $scope.remove_song = function(index) {
        $scope.list.songs.splice(index, 1);
        $scope.list.songIds.splice(index, 1);
        var endpoint = "/api/p/" + $scope.list.id + "/songs/" + index
        $scope.replace_playlist();
        update_lock++;
        $.ajax({
            type: "DELETE",
            url: endpoint,
            success: function() {
                update_lock--;
            }
        });
    }

    // live update status for current song
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
	
	// live update playlist
	socket.on('playlist', function(update) {
	    if (update.listId===$scope.list.id) {
	        if (update_lock) {
	            return;
	            console.log("async error: playlist update");
	        }
	        $scope.list=update.list;
	        $scope.replace_playlist();
	        $scope.$apply();
	    }
	});
	
	// live update currently-playing song on playlist
	socket.on('track', function(update) {
	    if (!update_lock) {
			if (update.listId==list.id)
				$scope.pl_track_index = update.songIndex
			else
				$scope.pl_track_index = -1;
			$scope.replace_playlist();
			$scope.$apply();
		} else {
    		console.log("async error: track update");
		}
	});
});
