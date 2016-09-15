/** temporary server state, cleared on restart */
make_playlist = require('./_playlist');
make_song = require('./_song');

ex = {};

//current song Queue (is a playlist)
ex.q = make_playlist('q');
ex.q.name = "Play Queue";
ex.q.l_song_id

//song currently playing
playing = null;

//last song uploaded, stored here because database not yet implemented
//TODO: delete this when database retrieval is implemented
_last_song = null;

module.exports = ex;
