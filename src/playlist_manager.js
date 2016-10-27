START_OF_LIST = -1;

var Playlist = require('./_playlist');
var Song = require('./_song');
var playlist_manager = {};
playlist_manager.queue = Playlist.Playlist("q");
playlist_manager.queue.name = "Play Queue";
playlist_manager.currentList = playlist_manager.queue;
playlist_manager.currentListId = "q";
playlist_manager.songIndex = START_OF_LIST;
playlist_manager.songMap = {};
playlist_manager.listMap = {
    "q": playlist_manager.queue
};
playlist_manager.nextId = 0;

// sockets
playlist_manager.io = {};

/**
 * Get the specified playlist.
 *
 * @param {String} list: the playlist name
 * @param {Function} callback(err, result): the callback function with:
 *          {Object} err: the error if exists
 *          {Object} result: the playlist object
 */
playlist_manager.getPlaylist = function(list, callback) {
    var l = playlist_manager.queue;
    if (list in playlist_manager.listMap) {
        l = playlist_manager.listMap[list];
    } else {
        // TODO: read from db
    }
    if (callback) {
        callback(null, l);
    }
};

/**
 * Get the current playlist id.
 * 
 * @param {Function} callback(err, result): the callback function with:
 *          {Object} err: the error if exists
 *          {String} result: the playlist ID
 */
playlist_manager.currentPlaylist = function(callback) {
    if (callback) {
        callback(null, playlist_manager.currentList.id);
    }
};

/**
 * Get the current song index.
 * 
 * @param {Function} callback(err, result): the callback function with:
 *          {Object} err: the error if exists
            {Number} result: the song index
 */
playlist_manager.currentSongIndex = function(callback) {
    if (callback) {
        callback(null, playlist_manager.songIndex);
    }
};

/**
 * Get a song with the specified ID.
 *
 * @param {Number} songId: the song ID
 * @param {Function} callback(err, result): the callback function with:
 *          {Object} err: the error if exists
 *          {Song} result: the song object
 */
playlist_manager.getSong = function(songId, callback) {
    var s = null;
    if (songId in playlist_manager.songMap) {
        s = playlist_manager.songMap[songId];
    } else {
        // TODO: read from db
    }
    if (callback) {
        callback(null, s);
    }
};

/**
 * Select a song in the specified playlist. An index less than 0 will
 *  result in starting at the beginning of the playlist.
 *
 * @param {String} listId: the playlist identifier
 * @param {Number} songIndex: the index of the song in this playlist
 * @param {Function} callback(err, result): the callback function with:
 *          {Object} err: the error if exists
 *          {Song} result: the song to be played
 */
playlist_manager.chooseSong = function (listId, songIndex, callback) {
    if (songIndex < 0 || songIndex >= playlist_manager.currentList.songIds.length) {
        songIndex = 0;
    }

    if (playlist_manager.currentListId !== listId) {
        // TODO: support for multiple playlists
    }

    playlist_manager.songIndex = songIndex;
    // alert clients to track change
    playlist_manager.emitCurrentSong();
    playlist_manager.getSong(playlist_manager.currentList.songIds[playlist_manager.songIndex], function(err, s) {
        if (callback) {
            callback(null, s);
        }
    });
};

/**
 * Get the next song in the current playlist
 * @param {Function} callback(err, result): the callback function with:
 *          {Object} err: the error if exists
 *          {Song} result: the next song to be played
 */
playlist_manager.nextSong = function(callback) {
    playlist_manager.songIndex++;
    if (playlist_manager.songIndex >= playlist_manager.currentList.songIds.length) {
        playlist_manager.songIndex = 0;
    }
    // alert clients to track change
    playlist_manager.emitCurrentSong();
    playlist_manager.getSong(playlist_manager.currentList.songIds[playlist_manager.songIndex], function(err, s) {
        if (callback) {
            callback(null, s);
        }
    });
};

/**
 * Get the previous song in the current playlist
 * @param {Function} callback(err, result): the callback function with:
 *          {Object} err: the error if exists
 *          {Song} result: the previous song to be played
 */
playlist_manager.prevSong = function(callback) {
    playlist_manager.songIndex--;
    if (playlist_manager.songIndex < 0) {
        playlist_manager.songIndex = playlist_manager.currentList.songIds.length - 1;
    }
    // alert clients to track change
    playlist_manager.emitCurrentSong();
    playlist_manager.getSong(playlist_manager.currentList.songIds[playlist_manager.songIndex], function(err, s) {
        if (callback) {
            callback(null, s);
        }
    });
};

/**
 * Add an existing song to the specified playlist.
 * @param {String} list: the playlist name
 * @param {Number} songId: the song ID
 * @param {Function} callback(err): the callback function, with error if exists
 */
playlist_manager.addSong = function(list, songId, callback) {
    // get the list object to add to
    var l = null;
    if (list === "q") {
        l = playlist_manager.queue;
        playlist_manager.getSong(songId, function(err, s) {
            Playlist.addSong(l, s);
            Playlist.addSongId(l, songId);
            // alert clients about update
            playlist_manager.emitList(list,l);
        })
    } else {
        playlist_manager.getPlaylist(list, function(s) {
            Playlist.addSong(l, s);
            Playlist.addSongId(l, songId);
        });
    }
    if (callback) {
        callback(null);
    }
};

/**
 * Generate an ID for a new song and add it to the specified playlist.
 * @param {String} list: the playlist name
 * @param {String} path: the song path and name on disk
 * @param {Function} callback(id, err): the callback function with:
 {Number} id: the song ID
 {Object} err: error produced
 */
playlist_manager.createSong = function(list, path, callback) {
    var id = playlist_manager.nextId;
    playlist_manager.nextId++;
    var s = Song.Song(id);
    s.path = path;
    s.type = "upload";
    playlist_manager.songMap[id] = s;
    playlist_manager.addSong(list, id, function() {
        if (callback) {
            callback(id, false);
        }
    });
};

/**
 * Remove the song at the specified index in the specified playlist.
 * @param {String} listId: the playlist identifier
 * @param {Number} songIndex: the index of the song to remove in the list
 * @param {Function} callback(err, wasCurrentSongRemoved): the callback function with:
 *          {Object} err: the error if exists
 *          {Boolean} removedCurrentSong: whether the currently playing song was removed
 */
playlist_manager.removeSong = function (listId, songIndex, callback) {
    playlist_manager.getPlaylist(listId, function (err, l) {
        if (songIndex < 0 || songIndex >= l.songIds.length) {
            callback("Index out of range", false);
        }

        // last (bottom) song in list or only song
        var isLastSong = (songIndex === l.songIds.length - 1);
        var isCurrentSong = (songIndex === playlist_manager.songIndex);

        // remove song
        l.songIds.splice(songIndex, 1);
        l.songs.splice(songIndex, 1);

        // next song will be top of list or no song if empty
        if (isLastSong) {
            playlist_manager.songIndex = START_OF_LIST;
        }
        
        // alert clients to change in playlist
        playlist_manager.emitList(listId,l);

        // if playing song was removed, report this
        if (isCurrentSong && callback) {
            callback(null, true);
        }
        else if (callback) {
            callback(null, false);
        }
    });
};

/**
 * Replace the contents of the specified playlist with the specified songs.
 * @param {String} list: the playlist name
 * @param {Array} songIds: a list of song IDs
 * @param {Function} callback(err): the callback function, with error if exists
 */
playlist_manager.replaceList = function(list, songIds, callback) {
    playlist_manager.getPlaylist(list, function(err, l) {
        l.songIds = songIds;
        l.songs = [];
        for (var i = 0; i < l.songIds.length; i++) {
            l.songs.push(playlist_manager.songMap[songIds[i]]);
        }
        playlist_manager.emitList(list,l);
        if (callback) {
            callback(null);
        }
    });
};

/**
 * Move the song at the specified index to a new index in the specified playlist.
 * @param {String} list: the playlist name
 * @param {Number} oldIndex: the old index of the song in the list
 * @param {Number} newIndex: the new index of the song in the list
 * @param {Function} callback(err): the callback function, with error if exists
 */
playlist_manager.moveSong = function(list, oldIndex, newIndex, callback) {
    playlist_manager.getPlaylist(list, function(err, l) {
        if (oldIndex < 0 || oldIndex >= l.songIds.length ||
            newIndex < 0 || newIndex >= l.songIds.length) {
            callback("Index out of range");
        }
        
        console.log("oldIndex: " + oldIndex);
        console.log("newIndex: " + newIndex);

        // remove song
        var id = l.songIds.splice(oldIndex, 1);
        var song = l.songs.splice(oldIndex, 1);

        // re-add song
        l.songIds.splice(newIndex, 0, id[0]);
        l.songs.splice(newIndex, 0, song[0]);

        // update index if playing song was moved
        if (playlist_manager.songIndex == oldIndex) {
            console.log("*-> " + newIndex);
            playlist_manager.songIndex = newIndex;
        }
        
        // alert clients to change in list
        playlist_manager.emitList(list,l);
        playlist_manager.emitCurrentSong();
        
        if (callback) {
            callback(null);
        }
    });
};

/**
 * Sets the socket IO object the playlist will emit updates on.
 * @param {socketIO} io: the IO object for the sockets.
 */
playlist_manager.setSocketIO = function(io) {
    playlist_manager.io=io;
};

/** 
 * Emit updates for the given playlist over all sockets
 * @param {String} listId: the playlist name
 * @param(optional) {playlist} list: the playlist object to emit
 *                                   (If not provided, it will be retrieved)
*/
playlist_manager.emitList = function(listId, list) {
    var _f_emit = function (listId,list) {
        // TODO: only emit to clients who are subscribed to the given playlist
        playlist_manager.io.sockets.emit('playlist', {
            //TODO: timestamp
	        listId: listId,
            list: list
        });
    };
    if (!list) {
        playlist_manager.getPlaylist(listId, function (err, list) {
            _f_emit(listId, list);
        });
    }
    else {
        _f_emit(listId, list);
    }
};

/** 
 * Emit updates for the currently playing track
*/
playlist_manager.emitCurrentSong = function() {
    playlist_manager.currentPlaylist(function (err,listId) {
        playlist_manager.currentSongIndex(function (err,songIndex) {
            playlist_manager.io.sockets.emit('track', {listId:listId,songIndex:songIndex});
        });
    });
};

module.exports = playlist_manager;
