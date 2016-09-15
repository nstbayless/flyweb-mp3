/* Handles backend for database retrieval*/

tmp = require('./tmp_store')
make_playlist = require('./_playlist');
make_song = require('./_song');

ex = {}

ex.get_song = function (id) {
	//TODO: delete this when database retrieval implemented
	if (id==tmp._last_song.id)
		return tmp._last_song;
	song = make_song(id);
	return song;
}

//retrieves playlist from ID
// id: id of playlist to retrieve
// realize: also retrieve songs (populates l_song)
ex.playlist = function (id,realize) {
	if (!id)
		id="q"
	var pl;
	if (id=="q") {
		pl = tmp.q;
	} else {
		pl = make_playlist(id);
	}
	if (realize)
		pl=ex.realize_playlist(pl);
	return pl;
}

//retrieves songs from playlist, places in pl.l_song
ex.realize_playlist = function (pl) {
	var _pl = pl;
	_pl.l_song = [];
	for (i=0;i<_pl.l_song_id.length;i++)
			_pl.l_song.push(ex.get_song(_pl.l_song_id[i]));
	return _pl;
}

module.exports = ex;
