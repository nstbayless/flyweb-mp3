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
var Throttle = require('throttle')

var speaker = new Speaker({
  channels: 2,          // 2 channels
  bitDepth: 16,         // 16-bit samples
  sampleRate: 44100     // 44,100 Hz sample rate
});

//plays song with audio pipeline above
function play_file(file,cb) {
	var stream = fs.createReadStream(file);

	//Throttle to allow play/pause:
	stream = stream.pipe(new Throttle(44100));
	stream.pipe(decoder).pipe(speaker);

	stream.on('finish', () => {
		cb("finish");
	});
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
		re.state="play";
		play_file(song.upload_file, (ev) => {
			//handle event:
			if (ev=="finish")
				re.state="finish";

			update(0);
		})
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
		if  (tmp.playing.state=="finish") {
			//go to next song on queue:
			tmp.playing = null;
			update(0);
		}
	}
}

update(0);

function update_dec() {
  update(0.1);
};

repeat(update_dec).every(100, 'ms').start.now();
