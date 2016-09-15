// pops queue, plays audio

repeat = require('repeat');

tmp = require('./tmp_store');
make_song = require ('./_song');
db_get = require('./db_get');

// audio playing pipeline:
var Speaker = require('speaker');
var lame = require('lame')
var fs = require('fs');
var decoder = lame.Decoder();

var speaker = new Speaker({
  channels: 2,          // 2 channels
  bitDepth: 16,         // 16-bit samples
  sampleRate: 44100     // 44,100 Hz sample rate
});

//plays song with audio pipeline above
function play_file(file) {
	var stream = fs.createReadStream(file);
	stream.pipe(decoder).pipe(speaker);
}

//takes song metadata, makes playable information for update below
function song_realize(song) {
	//copy song metadata into realized object:
	re = {props:song};

	//adjusts re object based on song type:
	if (song.type=="silence" || song.type=="empty") {
		re.props.name = "Nothing Playing"
		re.t_elapsed = 0;
	} else if (song.type=="upload") {
		re.t_elapsed = 0;
		console.log("Now playing: " + song.name);
		play_file(song.upload_file)
	}

	return re;
}

// checks if audio paused or stops, takes appropriate action
function update (dt) {
	if (!tmp.playing || tmp.playing.props.type=="empty") {
		
		if (tmp.q.l_song.length>0) {
			//pop song from queue:
			tmp.q = db_get.realize_playlist(tmp.q);
			tmp.playing = song_realize(tmp.q.l_song[0]);
			tmp.q.l_song = tmp.q.l_song.slice(1);
			tmp.q.l_song_id = tmp.q.l_song_id.slice(1);
		}
		else
			//if no song, add default empty:
			tmp.playing = song_realize(make_song(''));
	}
	if (tmp.playing.props.type=="silence") {
		tmp.playing.t_elapsed+=dt;
		if (tmp.playing.t_elapsed>tmp.playing.props.duration) {
			t_reupdate = tmp.playing.t_elapsed-tmp.playing.props.duration
			tmp.playing = null;
			update(t_reupdate);
		}
	} else if (tmp.playing.props.type=="empty") {
		//do nothing
	} else if (tmp.playing.props.type=="upload") {
		
	}
}

update(0);

function update_dec() {
  update(0.1);
};

repeat(update_dec).every(100, 'ms').start.now();
