// pops queue, plays audio

repeat = require('repeat');

tmp = require('./tmp_store');
make_song = require ('./_song');
db_get = require('./db_get');

// audio playing pipeline:
var Player = require('player')
var current_player = new Player();
var current_timer = 0;
var current_state = "paused";
var current_song_duration = 0;

//plays song with audio pipeline above
function play_file(file,cb) {
	console.log(file);
	var player = new Player(file);
	current_player = player;
	player.play();
	console.log("PLAYING WITH PLAYER");
}

function pause() {
	current_state = "paused";
	current_player.pause();
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
		current_state = "playing"
		current_song_duration = song.duration
		re.state="play";
		play_file(song.upload_file, (ev) => {
			//handle event:
			if (ev=="finish")
				tmp.track.state="finish";
			update(0);
		})
	}
	tmp.track=re;
}

function status() {
	return {title: tmp.track.props.name, state: current_state, duration: current_song_duration, time_elapsed: current_timer};
}

// checks if audio paused or stops, takes appropriate action
function update (interval) {
	if (!interval) {
		interval=0;
	}
	if (!tmp.track || tmp.track.props.type=="empty") {
		if (tmp.q.l_song_id.length>0) {
			//pop song from queue:
			tmp.q = db_get.realize_playlist(tmp.q);
			play(tmp.q.l_song[0]);
			tmp.q.l_song = tmp.q.l_song.slice(1);
			tmp.q.l_song_id = tmp.q.l_song_id.slice(1);
		}
		else
			//if no song, add default empty:
			play(make_song(''));
	}
	if (tmp.track.props.type == "silence") {
		tmp.track.t_elapsed += interval;
		timer += interval;
		if (tmp.track.t_elapsed>tmp.track.props.duration) {
			t_reupdate = tmp.track.t_elapsed-tmp.track.props.duration
			tmp.track = null;
			update(t_reupdate);
		}
	} else if (tmp.track.props.type=="empty") {
		//do nothing
	} else if (tmp.track.props.type=="upload") {
		console.log("into upload");
		if (current_state == "playing") {
			tmp.track.t_elapsed+=interval;
			current_timer += interval;
		} else {
			console.log("song is paused");
		}
		if  (tmp.track.state=="finish") {
			//go to next song on queue:
			current_state = "paused";
			current_timer = 0;
			tmp.track = null;
			update(0);
		}
		console.log("out of upload");
	}
	console.log(status());
}

update(0);

function update_dec() {
  update(1);
};

repeat(update_dec).every(1000, 'ms').start.now();

module.exports = {
	pause: pause,
	status: status,
	update: update
}
