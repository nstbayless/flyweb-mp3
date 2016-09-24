// pops queue, plays audio

repeat = require('repeat');

tmp = require('./tmp_store');
Song = require ('./_song');
manager = require('./playlist_manager');

// audio playing pipeline:
var Player = require('player')

var current_player = new Player();
var current_timer = 0; //timer records time elapsed
var current_state = "paused"; //state of the music
var current_song_duration = 0; //the length of the current song

//plays song with audio pipeline above
function play_file(file, cb) {
	console.log(file);
	var player = new Player(file);
	current_player = player;
	current_player.on('error', function(err){
		console.log("all song finished");
	});
	current_player.on('playing', function(item){
		console.log('im playing... src:' + item);
	});
	current_player.on('playend', function(item){
		console.log('src:' + item + ' play done, switching to next one ...');
	});
	current_player.play();
}

function previous() {
	//to be implemented
	//var last_song = getthelastsongplayed
	play(last_song);
}

function next() {
	var next_song = 0; //to be implement ed
	play(next_song);
}

//pauses the song
function pause() {
	if (current_state == "paused") {
		current_state = "playing"
	} else {
		current_state = "paused";
	}
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
		play_file(song.path, (ev) => {
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
		if (current_state == "playing") {
			console.log(status());
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
	}
}

function update_dec() {
  update(1);
};

update(0);

repeat(update_dec).every(1000, 'ms').start.now();

module.exports = {
	pause: pause,
	status: status,
	update: update
}
