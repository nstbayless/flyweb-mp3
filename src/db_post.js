/* Handles backend for database storage*/

tmp = require('./tmp_store')
extend = require('extend');
make_playlist = require('./_playlist');
make_song = require('./_song');
db_get = require('./db_get')

db_post = {}

// adds song to database
// cb: (id, err) => (void)
db_post.song = function (opts, cb) {
	song = make_song(0);
	extend(song,opts);
	song.id='0';
	//TODO: store in actual database
	tmp._last_song=song;
	cb(song.id,false);
}

// puts song id on playlist
// cb: (err) => (void)
db_post.playlist_append = function (sid,plid,cb) {
	function _pl_get (pl, err) {
		pl.l_song_id.push(sid);
		//write back playlist:
		db_post.playlist(pl,(err) => cb(err));
	}
	//retrieve playlist:
	if (plid=='q') {
		_pl_get(tmp.q,false);
	} else {
		_pl_get(db_get.playlist(plid),false);
	}
}

// writes the given playlist to the database:
// cb: (err) => (void)
db_post.playlist = function (pl, cb) {
	if (!pl)
		return cb(true);
	//cannot place realized songs in database; store ids in pl.l_song_id instead.
	pl.l_song=[];
	if (pl.id!='q') //no support for playlists other than queue yet
		return cb(true);
	//write queue:
	tmp.q=pl;
	return cb(false);
}

module.exports = db_post;
