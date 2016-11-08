/* jslint browser: true */
/* globals document, $, Sortable, angular, io, list, currentListId, currentSongIndex */
var app = angular.module("angApp", []);
var socket = io();

app.controller("angCon", function ($scope) {
    var dragEnabled = false;

    $("#progress-bar-handle").mousedown(function(e) {
        e.preventDefault();
        dragEnabled = true;
    });

    $("body").mouseup(function(e) {
        if (dragEnabled) {
            var bar = $("#progress-bar");
            
            socket.emit("seek", {
                time: Math.floor(((e.pageX - bar.offset().left) / bar.width()) * $scope.status.duration)
            });
        }

        dragEnabled = false;
    });

    $("body").mousemove(function(e) {
        if (dragEnabled) {
            var bar = $("#progress-bar");
            var percent = (e.pageX - bar.offset().left) / bar.width();

            $scope.updateProgress(percent);
        }
    });

    $(window).resize(function() {
        $scope.updateProgress($scope.status.time_elapsed / $scope.status.duration);
    });

    $scope.updateProgress = function(percent) {
        var bar = $("#progress-bar");
        var handle = $("#progress-bar-handle");

        percent = isNaN(percent) ? 0 : percent;
        percent = percent < 0 ? 0 : percent;
        percent = percent > 1 ? 1 : percent;

        $scope.progress_style.width = percent * 100 + "%";
        $("#progress-bar-handle").offset({
            top: bar.offset().top + bar.height() / 2 - handle.height() / 2,
            left: bar.offset().left - handle.width() / 2 + bar.width() * percent
        });
        $scope.$apply();
    };

    socket.emit("updateRequest");

    // jade input variables:

    $scope.list = {};
    var pl_table;
    try {
        $scope.list = list;
        $scope.pl_track_index = -1;

        if (list.id==currentListId) {
            $scope.pl_track_index = currentSongIndex;
        }

        // make table rearrangeable:
        pl_table = document.getElementById("pltable");
        new Sortable(pl_table, {
            dataIdAttr: "data",
            animation: 170,
            onStart: function() {
                $scope.repaint_playlist("#eee", "#eee", false);
            },
            onEnd: function(evt) {
                $scope.move_song(evt.oldIndex, evt.newIndex);
                $scope.repaint_playlist("#ccf", "#eef", true);
            },
        });
    } catch (e) {
        // list might not be supplied on this page; this is okay.
    }

    $scope.status = {
        title: "Nothing Playing",
        state: "paused",
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
        socket.emit("pause");
    };

    $scope.prev_song = function() {
        socket.emit("prev");
    };

    $scope.next_song = function() {
        socket.emit("next");
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
            rows[i].style["background-color"] = (i % 2 === 0) ? col1 : col2;
            rows[i].childNodes[0].innerHTML = (num) ? String(i + 1) : "";
        }
    };

    // replaces playlist table with new one, with new elements
    $scope.replace_playlist = function() {
        if (!pl_table) {
            return;
        }
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
            var style = "font-weight:" + ((i == $scope.pl_track_index) ? "bold" : "normal") + ";";

            var play_song;
            ((i)=>{
                play_song = function() {
                    socket.emit("jump",{listId: list.id, songIndex: i});
                };
            })(i);

            // add number cell:
            var td = document.createElement("td");
            td.setAttribute("class", "q num");
            td.setAttribute("style", style);
            td.innerHTML = (i + 1);
            $(td).mouseup(play_song);
            tr.appendChild(td);

            // add name cell
            td = document.createElement("td");
            td.setAttribute("class", "q");
            td.setAttribute("style", style);
            td.innerHTML = song.name;
            $(td).mouseup(play_song);
            tr.appendChild(td);

            // add duration cell
            td = document.createElement("td");
            td.setAttribute("class", "q");
            td.innerHTML = ($scope.pretty_time(song.duration));
            td.setAttribute("style", style);
            $(td).mouseup(play_song);
            tr.appendChild(td);

            // add x button
            td = document.createElement("td");
            td.setAttribute("class", "qx");
            // href within td
            var hrefx = document.createElement("a");
            hrefx.style.onmouseover = "";
            hrefx.style.cursor = "pointer";
            // x image within href:
            var imgx = document.createElement("img");
            imgx.setAttribute("src", "/images/item_x.png");
            //on-click to delete:
            (function() {
                var capture_i = i;
                hrefx.onclick = function () {
                    $scope.remove_song(capture_i);
                };
            })();
            hrefx.appendChild(imgx);
            td.appendChild(hrefx);
            td.setAttribute("style", style);
            tr.appendChild(td);
        }
        //delete extra rows:
        for (i=$scope.list.songs.length;i<pl_table.children.length;i++) {
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
        $.post(endpoint, {
            from: index_start,
            to: index_end
        });
    };

    // remove song from playlist:
    $scope.remove_song = function(index) {
        $scope.list.songs.splice(index, 1);
        $scope.list.songIds.splice(index, 1);
        if ($scope.pl_track_index > index) {
            $scope.pl_track_index--;
        }
        var endpoint = "/api/p/" + $scope.list.id + "/songs/" + index;
        $scope.replace_playlist();
        $.ajax({
            type: "DELETE",
            url: endpoint,
        });
    };

    // live update status for current song
    socket.on("status", function(status) {
        if (status.state === "paused") {
            $("#controls-play").removeClass("glyphicon-pause").addClass("glyphicon-play");
        } else if (status.state === "playing") {
            $("#controls-play").removeClass("glyphicon-play").addClass("glyphicon-pause");
        }

        status.time_elapsed = status.time_elapsed > status.duration ? status.duration : status.time_elapsed;

        $scope.status = status;

        if (!dragEnabled) {
            $scope.updateProgress(status.time_elapsed / status.duration);
        }
    });

    // live update playlist
    socket.on("playlist", function(update) {
        if (update.listId===$scope.list.id) {
            $scope.list=update.list;
            $scope.replace_playlist();
            $scope.$apply();
        }
    });

    // live update currently-playing song on playlist
    socket.on("track", function(update) {
        if (update.listId==list.id) {
            $scope.pl_track_index = update.songIndex;
        }
        else {
            $scope.pl_track_index = -1;
        }
        $scope.replace_playlist();
        $scope.$apply();
    });
});
