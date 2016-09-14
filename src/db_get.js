/* Handles backend for database retrieval*/

ex = {}

ex.get_song = function (id) {
	song = {
		id: id,
		name: "Song Name",
		duration: 114.3,
		artist: "Artist",
		album: "Album"
	}
	return song;
}

//retrieves playlist from ID
// id: id of playlist to retrieve
// realize: also retrieve songs (populates l_song)
ex.playlist = function (id,realize) {
	if (!id)
		id="q"
	pl = {
		id: id,
		name: id,
		l_song_id: [],
		l_song: []
	}
	if (pl.name=="q") {
		pl.name = "Queue";
		pl.l_song_id = [37,33,19,4]
	}
	if (realize)
		for (i=0;i<pl.l_song_id.length;i++)
			pl.l_song.push(ex.get_song(pl.l_song_id[i]));
	return pl;
}

module.exports = ex;
