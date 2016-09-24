/** temporary server state, cleared on restart */
Playlist = require('./_playlist');
Song = require('./_song');

ex = {};

//current song Queue (is a playlist)
ex.q = Playlist.Playlist('q');
ex.q.name = "Play Queue";
ex.q.l_song_id

//track currently playing; track.props is a song object (see _song.js)
//other fields include time elapsed, etc.
track = null;

//last song uploaded, stored here because database not yet implemented
//TODO: delete this when database retrieval is implemented
_last_song = null;

module.exports = ex;
