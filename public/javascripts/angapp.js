var app = angular.module('angApp', []);

app.controller('angCon', function ($scope, $http, $timeout) {
    // semaphore for GETting playlist
    update_lock = 0;

    // jade input variables:
    $scope.pl = {};
    try {
        $scope.pl = pl;
        $scope.pl_track_index = -1;

        // make table rearrangeable:
        pl_table = document.getElementById("pltable");
        pl_sortable = new Sortable(pl_table, {
            dataIdAttr: "data",
            animation: 170,
            onStart: function (evt) {
                update_lock++;
                $scope.repaint_playlist("#eee", "#eee", false);
            },
            onEnd: function (evt) {
                update_lock--;
                $scope.move_song(evt.oldIndex, evt.newIndex);
                $scope.repaint_playlist("#ccf", "#eef", true);
            }
        });
    }
    catch (e) {
			// pl might not be supplied on this page; this is okay.
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

    $scope.range = function (n) {
        var l = [];
        for (var i = 0; i < n; i++) {
            l.push(i);
        }
        return l;
    };

    // converts seconds to m:ss time format
    $scope.pretty_time = function (t) {
        var date = new Date(t * 1000);
        var mm = date.getUTCMinutes();
        var ss = date.getSeconds();
        if (ss < 10) {
            ss = "0" + ss;
        }
        return mm + ":" + ss;
    };

    $scope.pause_song = function () {
        var endpoint = "/pause";
        $.get(endpoint);
    };

    $scope.prev_song = function () {
        var endpoint = "/prev";
        $.get(endpoint);
    };

    $scope.next_song = function () {
        var endpoint = "/next";
        $.get(endpoint);
    };

    // moves element in list
    function move_in_list(l, from, to) {
        var e = l[from];
        l.splice(from, 1);
        l.splice(to, 0, e);
    }

    // zebra stripes for playlist
    $scope.repaint_playlist = function (col1, col2, num) {
        var rows = pl_table.children;
        for (var i = 0; i < rows.length; i++) {
            rows[i].style["background-color"] = (i % 2 == 0) ? col1 : col2;
            rows[i].childNodes[0].innerHTML = (num) ? String(i + 1) : "";
        }
    };

    // replaces playlist table with new one, with new elements
    $scope.replace_playlist = function () {
        // add children:
        for (var i = 0; i < $scope.pl.songs.length; i++) {
            var song = $scope.pl.songs[i];
            var tr;
            if (i >= pl_table.children.length) {
                tr = document.createElement("tr");
                pl_table.appendChild(tr);
            }
            else {
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
            td.setAttribute('class',"qx");
            // x image within td:
            imgx = document.createElement("img");
            imgx.setAttribute("src","/images/item_x.png");
            (function () {
                var capture_i = i;
                imgx.onclick = function () {
                    $scope.remove_song(capture_i);
                }
            })();
            td.appendChild(imgx);
            td.setAttribute('style', style);
            tr.appendChild(td);
        }
        $scope.repaint_playlist("#ccf", "#eef", true);
    };

    // edit playlist
    $scope.move_song = function (index_start, index_end) {
        move_in_list($scope.pl.songIds, index_start, index_end);
        move_in_list($scope.pl.songs, index_start, index_end);
        var endpoint = "/api/" + $scope.pl.id;
        update_lock++;
        $.post(endpoint, {from: index_start, to: index_end}, () => {
            update_lock--;
        });
    };
    
    // remove song from playlist:
    $scope.remove_song = function (index) {
        $scope.pl.songs.splice(index,1);
        $scope.pl.songIds.splice(index,1);
        var endpoint = "/api/p/" + $scope.pl.id + "/songs/" + index
        $scope.replace_playlist();
        update_lock++;
        $.ajax({
            type: "DELETE",
            url: endpoint,
            success: function () {
                update_lock--;
            }
        });
    }

    // live update playlist:
    $scope.update_playlist = function () {
        var endpoint = "/api/p/" + $scope.pl.id;
        $.get(endpoint, (pl) => {
            if (!update_lock) {
                $scope.pl = pl;
				// update playlist table if it exists:
				if (pl_table) {
	                $scope.replace_playlist();
				}
            }
        });
    };

    // live update current song:
    $scope.update_currentSong = function () {
        var endpoint = "/api/track";
        $.get(endpoint, (track) => {
            if (!update_lock) {
                if (track.list_id == pl.id) {
                    $scope.pl_track_index = track.index;
                }
                else {
                    $scope.pl_track_index = -1;
                }
                // update playlist table if it exists:
				if (pl_table) {
	                $scope.replace_playlist();
				}
            }
        });
    };

    // live update tracker bar:
    $scope.update_status = function () {
        var endpoint = "/status";
        $.get(endpoint, (status) => {
            var prog_percent = status.time_elapsed / status.duration;
            prog_percent = isNaN(prog_percent) ? 0 : prog_percent * 100;

            if (status.state === 'paused') {
                $('#controls-play').removeClass('glyphicon-pause').addClass('glyphicon-play');
            }
            else if (status.state === 'playing') {
                $('#controls-play').removeClass('glyphicon-play').addClass('glyphicon-pause');
            }

            $scope.status = status;
            $scope.progress_style.width = prog_percent + "%";
        });
    };

    //grabs updates to page from server
    $scope.live_update = function () {
        if ($scope.pl) {
            $scope.update_playlist();
            $scope.update_currentSong();
        }
        if ($scope.status) {
            $scope.update_status();
        }
        $timeout(function () {
            $scope.live_update();
        }, 300);
    };
    $scope.live_update();
});
