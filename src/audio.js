// pops queue, plays audio

repeat = require('repeat');

tmp = require('./tmp_store');
make_song = require ('./_song');
db_get = require('./db_get');

//takes song metadata, makes playable information for update below
function song_realize(song) {
	//copy song metadata into realized object:
	re = {props:song};

	//adjusts re object based on song type:
	if (song.type=="silence") {
		re.props.name = "Nothing Playing"
		re.t_elapsed = 0;
	} else if (song.type=="upload") {
		re.t_elapsed = 0;
	}

	return re;
}

// checks if audio paused or stops, takes appropriate action
function update (dt) {
	if (!tmp.playing) {
		//nothing playing, correct this
		console.log("Track change.")
		
		if (tmp.q.l_song.length>0) {
			//pop song from queue:
			tmp.q = db_get.realize_playlist(tmp.q);
			tmp.playing = song_realize(tmp.q.l_song[0]);
			tmp.q.l_song = tmp.q.l_song.slice(1);
			tmp.q.l_song_id = tmp.q.l_song_id.slice(1);
		}
			
		//if no song, add default silence:
		tmp.playing = song_realize(make_song(''));
	}
	if (tmp.playing.props.type=="silence") {
		tmp.playing.t_elapsed+=dt;
		if (tmp.playing.t_elapsed>tmp.playing.props.duration) {
			t_reupdate = tmp.playing.t_elapsed-tmp.playing.props.duration
			tmp.playing = null;
			update(t_reupdate);
		}
	}
}

update(0);

function update_dec() {
  update(0.1);
};

repeat(update_dec).every(100, 'ms').start.now();
