// stores, retrieves, and modifies playlists, including the play queue.

var assert = require("assert");

var Playlist = require("./_playlist");
var Song = require("./_song");

var START_OF_LIST = -1;

function PlaylistManager() {
    this.queue = Playlist.Playlist("q");
    this.queue.name = "Play Queue";
    this.currentList = this.queue;
    this.currentListId = "q";
    this.songIndex = START_OF_LIST;
    this.songMap = {};
    this.listMap = {
        "q": this.queue
    };
    this.nextSongId = 0;

    // sockets
    this.io = {};
}


/**
 * Get the specified playlist.
 *
 * @param {String} list: the playlist name
 * @param {Function} callback(err, result): the callback function with:
 *          {Object} err: the error if exists
 *          {Object} result: the playlist object
 */
PlaylistManager.prototype.getPlaylist = function(list, callback) {
    var l = this.queue;
    if (list in this.listMap) {
        l = this.listMap[list];
    }
    else {
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
PlaylistManager.prototype.currentPlaylist = function(callback) {
    if (callback) {
        callback(null, this.currentList.id);
    }
};

/**
 * Get the current song index.
 * 
 * @param {Function} callback(err, result): the callback function with:
 *          {Object} err: the error if exists
            {Number} result: the song index
 */
PlaylistManager.prototype.currentSongIndex = function(callback) {
    if (callback) {
        callback(null, this.songIndex);
    }
};

/**
 * Generate a song ID for a new song being added.
 *
 * @return {Number}: the song ID
 */
PlaylistManager.prototype.generateSongId = function() {
    this.nextSongId++;
    return this.nextSongId;
};

/**
 * Get a song with the specified ID.
 *
 * @param {Number} songId: the song ID
 * @param {Function} callback(err, result): the callback function with:
 *          {Object} err: the error if exists
 *          {Song} result: the song object
 */
PlaylistManager.prototype.getSong = function(songId, callback) {
    var s = null;
    if (songId in this.songMap) {
        s = this.songMap[songId];
    }
    else {
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
PlaylistManager.prototype.chooseSong = function (listId, songIndex, callback) {
    if (songIndex < 0 || songIndex >= this.currentList.songIds.length) {
        songIndex = 0;
    }

    if (this.currentListId !== listId) {
        // TODO: support for multiple playlists
    }

    this.songIndex = songIndex;
    // alert clients to track change
    this.emitCurrentSong();
    this.getSong(this.currentList.songIds[this.songIndex], function(err, s) {
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
PlaylistManager.prototype.nextSong = function(callback) {
    this.songIndex++;
    if (this.songIndex >= this.currentList.songIds.length) {
        this.songIndex = 0;
    }
    // alert clients to track change
    this.emitCurrentSong();
    this.getSong(this.currentList.songIds[this.songIndex], function(err, s) {
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
PlaylistManager.prototype.prevSong = function(callback) {
    this.songIndex--;
    if (this.songIndex < 0) {
        this.songIndex = this.currentList.songIds.length - 1;
    }
    // alert clients to track change
    this.emitCurrentSong();
    this.getSong(this.currentList.songIds[this.songIndex], function(err, s) {
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
PlaylistManager.prototype.addSong = function(list, songId, callback) {
    // get the list object to add to
    var l = null;
    if (list === "q") {
        l = this.queue;
        this.getSong(songId, function(err, s) {
            Playlist.addSong(l, s);
            Playlist.addSongId(l, songId);
            // alert clients about update
            this.emitList(list, l);
        }.bind(this));
    }
    else {
        this.getPlaylist(list, function(err, l) {
            this.getSong(songId, function(err, s) {
                Playlist.addSong(l, s);
                Playlist.addSongId(l, songId);
                // alert clients about update
                this.emitList(list, l);
            }.bind(this));
        }.bind(this));
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
PlaylistManager.prototype.createSong = function(list, path, callback) {
    var id = this.generateSongId();
    var s = Song.Song(id);
    s.path = path;
    s.type = "upload";
    this.songMap[id] = s;
    this.addSong(list, id, function() {
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
PlaylistManager.prototype.removeSong = function (listId, songIndex, callback) {
    this.getPlaylist(listId, function (err, l) {
        if (songIndex < 0 || songIndex >= l.songIds.length) {
            callback("Index out of range", false);
        }

        // last (bottom) song in list or only song
        var isCurrentSong = (songIndex === this.songIndex);

        // remove song
        l.songIds.splice(songIndex, 1);
        l.songs.splice(songIndex, 1);
        
        // alert clients to change in playlist
        this.emitList(listId, l);

        // move current song if necessary:
        if (songIndex < this.songIndex) {
            this.songIndex--;
            this.emitCurrentSong();
        }

        // if playing song was removed, report this
        if (isCurrentSong && callback) {
            callback(null, true);
        }
        else if (callback) {
            callback(null, false);
        }
    }.bind(this));
};

/**
 * Replace the contents of the specified playlist with the specified songs.
 * @param {String} list: the playlist name
 * @param {Array} songIds: a list of song IDs
 * @param {Function} callback(err): the callback function, with error if exists
 */
PlaylistManager.prototype.replaceList = function(list, songIds, callback) {
    this.getPlaylist(list, function(err, l) {
        l.songIds = songIds;
        l.songs = [];
        for (var i = 0; i < l.songIds.length; i++) {
            l.songs.push(this.songMap[songIds[i]]);
        }
        this.emitList(list, l);
        if (callback) {
            callback(null);
        }
    }.bind(this));
};

/**
 * Move the song at the specified index to a new index in the specified playlist.
 * @param {String} list: the playlist name
 * @param {Number} oldIndex: the old index of the song in the list
 * @param {Number} newIndex: the new index of the song in the list
 * @param {Function} callback(err): the callback function, with error if exists
 */
PlaylistManager.prototype.moveSong = function(list, oldIndex, newIndex, callback) {
    this.getPlaylist(list, function(err, l) {
        if (oldIndex < 0 || oldIndex >= l.songIds.length ||
            newIndex < 0 || newIndex >= l.songIds.length) {
            callback("Index out of range");
        }
        
        // do nothing if oldIndex == newIndex
        if (oldIndex == newIndex) {
            if (callback) {
                callback(null);
            }
            return;
        }

        // remove song
        var id = l.songIds.splice(oldIndex, 1);
        var song = l.songs.splice(oldIndex, 1);

        // re-add song
        l.songIds.splice(newIndex, 0, id[0]);
        l.songs.splice(newIndex, 0, song[0]);
        
        // update current song index if current song was moved
        var minIndex = Math.min(oldIndex, newIndex);
        var maxIndex = Math.max(oldIndex, newIndex);
        if (this.songIndex >= minIndex && this.songIndex <= maxIndex) {
            // new value of songIndex depends on nature of move
            if (this.songIndex == oldIndex) {
                this.songIndex = newIndex;
            }
            else if (newIndex < oldIndex) {
                this.songIndex++;
            }
            else if (newIndex > oldIndex) {
                this.songIndex--;
            }
            else {
                assert(false);
            }
        }
        
        // alert clients to change in list
        this.emitList(list, l);
        this.emitCurrentSong();
        
        if (callback) {
            callback(null);
        }
    }.bind(this));
};

/**
 * Sets the socket IO object the playlist will emit updates on.
 * @param {socketIO} io: the IO object for the sockets.
 */
PlaylistManager.prototype.setIo = function(io) {
    this.io = io;
};

/** 
 * Emit updates for the given playlist over all sockets
 * @param {String} listId: the playlist name
 * @param(optional) {playlist} list: the playlist object to emit
 *                                   (If not provided, it will be retrieved)
*/
PlaylistManager.prototype.emitList = function(listId, list) {
    var _f_emit = function (listId, list) {
        // TODO: only emit to clients who are subscribed to the given playlist
        this.io.sockets.emit("playlist", {
            //TODO: timestamp
	        listId: listId,
            list: list
        });
    }.bind(this);
    if (!list) {
        this.getPlaylist(listId, function (err, list) {
            _f_emit(listId, list);
        }.bind(this));
    }
    else {
        _f_emit(listId, list);
    }
};

/** 
 * Emit updates for the currently playing track
*/
PlaylistManager.prototype.emitCurrentSong = function() {
    this.currentPlaylist(function (err, listId) {
        this.currentSongIndex(function (err, songIndex) {
            this.io.sockets.emit("track", {listId:listId, songIndex:songIndex});
        }.bind(this));
    }.bind(this));
};

module.exports = new PlaylistManager();
