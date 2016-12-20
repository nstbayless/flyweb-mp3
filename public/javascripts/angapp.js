/* jslint browser: true */
/* globals $, angular, io, Sortable */

var app = angular.module('angApp', []);

app.controller('angCon', function($scope) {

    /********** Initialization Code & General Functions **********/

    // get socket.io object
    var socket = io();

    // default status
    $scope.status = {
        title: 'Nothing Playing',
        state: 'paused',
        duration: 0,
        time_elapsed: 0
    };

    $scope.progress_style = {};
    $scope.handle_style = {};
    $scope.list = {};
    $scope.songIndex = -1;

    // ask server for an update of everything
    socket.emit('updateRequest');

    // make the playlist sortable
    if ($('#playlist').length !== 0) {
        new Sortable(document.getElementById('playlist'), {
            animation: 170,
            handle: '.pl-song-handle',
            onStart: function() {
                $('.pl-song').addClass('sort');
            },
            onEnd: function(evt) {
                $('.pl-song').removeClass('sort');
                move_song(evt.oldIndex, evt.newIndex);
            }
        });
    }

    // moves element in list
    function move_in_list(list, from, to) {
        // temporary copy of element to move
        var e = list[from];

        // remove element to move from list
        list.splice(from, 1);
        // insert it at desired index
        list.splice(to, 0, e);
    }

    // given a percentage, update both the progress bar width and the handle position
    function update_progress(percent) {
        var bar = $('#progress-bar');
        var handle = $('#progress-bar-handle');

        // sanitize percent
        percent = isNaN(percent) ? 0 : percent;
        percent = percent < 0 ? 0 : percent;
        percent = percent > 1 ? 1 : percent;

        // update elapsed time to provide an idea of where the seek will jump to
        $scope.status.time_elapsed = Math.floor($scope.status.duration * percent);

        // update progress bar and handle CSS
        $scope.progress_style.width = percent * 100 + '%';
        $scope.handle_style.top = bar.position().top + bar.height() / 2 - handle.height() / 2;
        $scope.handle_style.left = bar.offset().left - handle.width() / 2 + bar.width() * percent;

        $scope.$apply();
    }

    // inserts HTML for songs in DOM
    function populate_playlist() {
        var pl = $('#playlist');

        // empty current playlist
        pl.empty();

        $.each($scope.list.songs, function(index, song) {
            pl.append($('<div>', {
                class: 'pl-song',
                id: 'pl-song-' + index
            }).append($('<span>', {
                class: 'pl-song-handle glyphicon glyphicon-menu-hamburger'
            })).append($('<span>', {
                class: 'pl-song-name',
                text: song.name
            })).append($('<span>', {
                class: 'pl-song-duration',
                text: $scope.pretty_time(song.duration)
            })).append($('<span>', {
                class: 'pl-song-remove glyphicon glyphicon-remove'
            })));
        });

        update_current();

        if ($scope.list.songs.length) {
            $('#pl-add-message').hide();
        } else {
            $('#pl-add-message').show();
        }
    }

    // bold currently playing song
    function update_current() {
        var songs = $('.pl-song');

        // remove any bolded songs
        songs.removeClass('current');
        // bold current song
        $(songs[$scope.songIndex]).addClass('current');
    }

    // remove song at specified index
    function remove_song(index) {
        // remove song from internal list
        $scope.list.songs.splice(index, 1);
        $scope.list.songIds.splice(index, 1);

        // decrement current song index if it is larger than song being removed
        if ($scope.songIndex > index) {
            $scope.songIndex--;
        }

        // send delete request through API
        $.ajax({
            type: 'DELETE',
            url: '/api/p/' + $scope.list.id + '/songs/' + index
        });
    }

    // move a song from one index to another
    function move_song(index_start, index_end) {
        var endpoint = '/api/' + $scope.list.id;

        // move songs in internal list
        move_in_list($scope.list.songIds, index_start, index_end);
        move_in_list($scope.list.songs, index_start, index_end);

        // send POST request to update song order
        $.post(endpoint, {
            from: index_start,
            to: index_end
        });
    }

    /********** Angular Functions **********/

    // converts seconds to mm:ss time format
    $scope.pretty_time = function(t) {
        var date = new Date(t * 1000);
        var mm = date.getUTCMinutes();
        var ss = date.getSeconds();

        if (ss < 10) {
            ss = '0' + ss;
        }

        return mm + ':' + ss;
    };

    // called when pause button clicked
    $scope.pause_song = function() {
        socket.emit('pause');
    };

    // called when prev button clicked
    $scope.prev_song = function() {
        socket.emit('prev');
    };

    // called when next button clicked
    $scope.next_song = function() {
        socket.emit('next');
    };

    /********** jQuery Event Handling **********/

    var dragEnabled = false;        // indicates whether a drag is in progress
    var touchLastX;                 // x-coordinate of last touchmove event

    // initiates drag once progress handle is clicked or touched
    $('#progress-bar-handle').bind('mousedown touchstart', function(e) {
        e.preventDefault();
        dragEnabled = true;
    });

    // handles moving the handle once drag is in progress
    $('body').bind('mousemove touchmove', function(e) {
        if (dragEnabled) {
            var bar = $('#progress-bar');
            var x, percent;

            if (e.type === 'mousemove') {
                x = e.pageX;
            } else if (e.type === 'touchmove') {
                x = e.originalEvent.touches[0].pageX;
                touchLastX = x; // need to save x-coord as touchend does not have an associated x-coord
            }
            
            // update CSS based on position
            percent = (x - bar.offset().left) / bar.width();
            update_progress(percent);
        }
    });

    // ends drag once mouse click or touch has ended
    $('body').bind('mouseup touchend', function(e) {
        if (dragEnabled) {
            var bar = $('#progress-bar');
            var x;

            if (e.type === 'mouseup') {
                x = e.pageX;
            } else if (e.type === 'touchend') {
                x = touchLastX;
            }

            // send seek message to server
            socket.emit('seek', {
                time: Math.floor(((x - bar.offset().left) / bar.width()) * $scope.status.duration)
            });

            dragEnabled = false;
        }
    });

    // must update progress bar CSS on window resize
    $(window).resize(function() {
        update_progress($scope.status.time_elapsed / $scope.status.duration);
    });

    // switch songs if song name clicked
    $('#playlist').on('click', '.pl-song-name', function(e) {
        var index = $(e.target).parent()[0].id.split('-').pop();

        socket.emit('jump', {
            listId: 'q',
            songIndex: index
        });
    });

    // call remove_song when remove button clicked
    $('#playlist').on('click touchstart', '.pl-song-remove', function(e) {
        var index = $(e.target).parent()[0].id.split('-').pop();

        remove_song(index);
    });

    /********** Socket.io Event Handling **********/

    // update DOM elements and angular variables upon receiving status update from server
    socket.on('status', function(status) {
        // change between play and pause icon as necessary
        if (status.state === 'paused') {
            $('#controls-play').removeClass('glyphicon-pause').addClass('glyphicon-play');
        } else if (status.state === 'playing') {
            $('#controls-play').removeClass('glyphicon-play').addClass('glyphicon-pause');
        }

        // sanitize time_elapsed (should not be greater than duration of song)
        status.time_elapsed = status.time_elapsed > status.duration ? status.duration : status.time_elapsed;

        // set angular's copy of status
        $scope.status = status;

        // update progress bar & handle if a drag isn't in progress
        if (!dragEnabled) {
            update_progress(status.time_elapsed / status.duration);
        }
    });

    // re-populate the playlist upon receiving playlist update from server
    socket.on('playlist', function(update) {
        // set angular's copy of the playlist
        $scope.list = update.list;
        // insert playlist HTML in DOM
        populate_playlist();
    });

    // highlight currently playing song upon receiving current song from server
    socket.on('track', function(update) {
        // set angular's copy of song index
        $scope.songIndex = update.songIndex;
        // update page to show currently playing song in bold
        update_current();
    });
});
