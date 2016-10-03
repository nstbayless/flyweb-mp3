// pops queue, plays audio

repeat = require('repeat');

tmp = require('./tmp_store');
Song = require ('./_song');
manager = require('./playlist_manager');
sockets = require('./sockets')();

// audio playing pipeline:
var Player = require('player');
var Speaker = require('speaker');
var Lame = require('lame');
var Fs = require('fs');
var Throttle = require('throttle');
var Stream = require('stream');

var current_player = new Player();
var current_timer = 0; //timer records time elapsed
var current_state = "paused"; //state of the music
var current_song_duration = 0; //the length of the current song

var speaker;
var prevFlag = false;


//plays song with audio pipeline above
function play_file(file, cb) {
	console.log(file);

	var stream = Fs.createReadStream(file);

	var totalBytesSeen = 0;

	var transform = new Stream.Transform({
		transform: function(chunk, encoding, callback) {
			this.push(chunk);
			totalBytesSeen += chunk.length;
			current_timer = totalBytesSeen / (4 * 44100);
			sockets.updateStatus(tmp.track.props.name, current_state, current_song_duration, current_timer);
			callback();
		}
	});

	speaker = new Speaker({
		channels: 2,
		bitDepth: 16,
		sampleRate: 44100
	});

	speaker.on('pipe', () => {
		console.log("***************************************");
		current_state = "playing";
	})

	//stream = stream.pipe(new Throttle(44100));
	stream.pipe(Lame.Decoder()).pipe(transform).pipe(speaker);

	speaker.on('finish', () => {
		current_timer = 0;
		current_state = "paused";

		if (!prevFlag) {
			manager.nextSong(play);
		} else {
			manager.prevSong(play);
		}

		prevFlag = false;
	})
}

function prev() {
	prevFlag = true;
	speaker.end();
	return current_state;
}

function next() {
	prevFlag = false;
	speaker.end();
	return current_state;
}

//pauses the song
function pause() {
	if (current_state === 'paused') {
		current_state = 'playing';
		speaker.uncork();
	} else if (current_state === 'playing') {
		current_state = 'paused';
		speaker.cork();
	}

	return current_state;
}

//takes song metadata, makes playable information for update below
function play(song) {
	//copy song metadata into realized object:
	var re = {props:song};
	//adjusts re object based on song type:
	if (song.type=="silence" || song.type=="empty") {
		re.props.name = "Nothing Playing"
		re.t_elapsed = 0;
	} else if (song.type=="upload") {
		re.t_elapsed = 0;
		console.log("Now playing: " + song.name);
		current_song_duration = song.duration
		re.state="play";
		play_file(song.path, (ev) => {
			//handle event:
			if (ev=="finish")
				tmp.track.state="finish";
			update(0);
		})
	}
	tmp.track=re;
}

// checks if audio paused or stops, takes appropriate action
function update (interval) {
	if (!interval) {
		interval=0;
	}
	if (!tmp.track || tmp.track.props.type == "empty") {
		if (manager.queue.songIds.length > 0) {
			manager.nextSong(function(s) {
				play(s);
			});
		}
		else {
			//if no song, add default empty:
			play(Song.Song("-1"));
		}

	} else if (tmp.track.props.type == "silence") {
		tmp.track.t_elapsed += interval;
		timer += interval;
		if (tmp.track.t_elapsed > tmp.track.props.duration) {
			t_reupdate = tmp.track.t_elapsed - tmp.track.props.duration
			tmp.track = null;
			update(t_reupdate);
		}
	} else if (tmp.track.props.type=="upload") {
		if  (tmp.track.state=="finish") {
			//go to next song on queue:
			current_state = "paused";
			current_timer = 0;
			tmp.track = null;
			update(0);
		}
	}
}

function update_dec() {
  update(0.1);
};

update(0);

repeat(update_dec).every(100, 'ms').start.now();

module.exports = {
	pause: pause,
	update: update,
	next: next,
	prev: prev
}
