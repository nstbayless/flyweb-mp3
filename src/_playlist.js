function make_playlist (id) {
	return {
		id: id,
		name: id,
		l_song_id: [],
		l_song: []
	}
}

module.exports = make_playlist;
