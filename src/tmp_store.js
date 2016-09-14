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

module.exports = ex;
