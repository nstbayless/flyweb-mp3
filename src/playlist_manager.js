var Playlist = require('./_playlist');
var Song = require('./_song');

var playlist_manager = {};
playlist_manager.queue = Playlist.Playlist("q");
playlist_manager.queue.name = "Play Queue"
playlist_manager.currentList = playlist_manager.queue;
playlist_manager.songIndex = -1;
playlist_manager.songMap = {};
playlist_manager.listMap = {"q": playlist_manager.queue};
playlist_manager.nextId = 0;

// sockets
playlist_manager.io = {};

/**
 * Get the specified playlist.
 * 
 * @param {String} list: the playlist name
 * @param {Function} callback(result): the callback function with:
            {Object} result: the playlist object
 */
playlist_manager.getPlaylist = function(list, callback) {
    var l = playlist_manager.queue;
    if (list in playlist_manager.listMap) {
        l = playlist_manager.listMap[list];
    }
    else {
        // TODO: read from db
    }
    if (callback) callback(l);
};

/**
 * Get the current playlist id.
 * 
 * @param {Function} callback(result): the callback function with:
            {Object} result: the playlist ID
 */
playlist_manager.currentPlaylist = function(callback) {
    if (callback) callback(playlist_manager.currentList.id);
}

/**
 * Get the current song index.
 * 
 * @param {Function} callback(result): the callback function with:
            {Object} result: the song index
 */
playlist_manager.currentSongIndex = function(callback) {
    if (callback) callback(playlist_manager.songIndex);
}

/**
 * Get a song with the specified ID.
 * 
 * @param {Number} songId: the song ID
 * @param {Function} callback(result): the callback function with:
            {Song} result: the song object
 */
playlist_manager.getSong = function(songId, callback) {
    var s = null;
    if (songId in playlist_manager.songMap) {
        s = playlist_manager.songMap[songId];
    }
    else {
        // TODO: read from db
    }
    if (callback) callback(s);
};

/**
 * Select a song in the specified playlist. An ID less than 0 will
 *  result in starting at the beginning of the playlist.
 * 
 * @param {String} list: the playlist name
 * @param {Number} songId: the song ID
 * @param {Function} callback: the callback function
 */
playlist_manager.chooseSong = function(list, songId, callback) {

};

/**
 * Get the next song in the current playlist
 * @param {Function} callback(result): the callback function with:
 *          {Song} result: the next song to be played
 */
playlist_manager.nextSong = function(callback) {
    playlist_manager.songIndex++;
    if (playlist_manager.songIndex >= playlist_manager.currentList.songIds.length) {
        playlist_manager.songIndex = 0;
    }
    // alert clients to track change
    playlist_manager.emitCurrentSong();
    playlist_manager.getSong(playlist_manager.currentList.songIds[playlist_manager.songIndex], function(s) {
        if (callback) callback(s);
    });
};

/**
 * Get the previous song in the current playlist
 * @param {Function} callback(result): the callback function with:
 *          {Song} result: the previous song to be played
 */
playlist_manager.prevSong = function(callback) {
    playlist_manager.songIndex--;
    if (playlist_manager.songIndex < 0) {
        playlist_manager.songIndex = playlist_manager.currentList.songIds.length - 1;
    }
    // alert clients to track change
    playlist_manager.emitCurrentSong();
    playlist_manager.getSong(playlist_manager.currentList.songIds[playlist_manager.songIndex], function(s) {
        if (callback) callback(s);
    });
};

/**
 * Add an existing song to the specified playlist.
 * @param {String} list: the playlist name
 * @param {Number} songId: the song ID
 * @param {Function} callback: the callback function
 */
playlist_manager.addSong = function(list, songId, callback) {
    // get the list object to add to
    var l = null;
    if (list === "q") {
        l = playlist_manager.queue;
        playlist_manager.getSong(songId, function(s) {
            Playlist.addSong(l, s);
            Playlist.addSongId(l, songId);
            // alert clients about update
            playlist_manager.emitList(list,l);
        })
    }
    else {
        playlist_manager.getPlaylist(list, function(s) {
            Playlist.addSong(l, s);
            Playlist.addSongId(l, songId);
        });
    }
    if (callback) callback();
};

/**
 * Generate an ID for a new song and add it to the specified playlist.
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
        if (callback) callback(id, false);
    });
};

/**
 * Replace the contents of the specified playlist with the specified songs.
 * @param {String} list: the playlist name
 * @param {Array} songIds: a list of song IDs
 * @param {Function} callback: the callback function
 */
playlist_manager.replaceList = function(list, songIds, callback) {
    playlist_manager.getPlaylist(list, function(l) {
        l.songIds = songIds;
        l.songs = [];
        for (var i = 0; i < l.songIds.length; i++) {
            l.songs.push(playlist_manager.songMap[songIds[i]]);
        }
        // alert clients about update
        playlist_manager.emitList(list,l);
        if (callback) callback();
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
playlist_manager.emitList = function(listId,list) {
    var _f_emit = function (listId,list) {
        console.log("playlist_manager.js: emit");
        // TODO: only emit to clients who are subscribed to the given playlist
        playlist_manager.io.sockets.emit('playlist', {
            //TODO: timestamp
	        listId: listId,
            list: list
        });
    }
    if (!list)
        playlist_manager.getPlaylist(listId, function (list) {
            _f_emit(listId,list);
        });
    else
        _f_emit(listId,list);
};

/** 
 * Emit updates for the currently playing track
*/
playlist_manager.emitCurrentSong = function() {
    playlist_manager.currentPlaylist(function (listId) {
        playlist_manager.currentSongIndex(function (songIndex) {
            playlist_manager.io.sockets.emit('track', {listId:listId,songIndex:songIndex});
        });
    });
};

module.exports = playlist_manager;
