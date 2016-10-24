// Handles playing sound out of speakers on server.

module.exports = function(io) {
	var repeat = require('repeat');
	var Song = require ('./_song');
	var playlist_manager = require('./playlist_manager');
    var audio_manager = require('./audio_manager');

	// audio playing pipeline:
	var Speaker = require('speaker');
	var Lame = require('lame');
	var Fs = require('fs');
	var Stream = require('stream');
	var speaker;

	function emitStatus(title, state, duration, time_elapsed) {
		io.sockets.emit('status', {
			title: title,
			state: state,
			duration: duration,
			time_elapsed: time_elapsed
		});
	}

	//plays song with audio pipeline above
    function play_file(file) {
        console.log(file);

        var stream = Fs.createReadStream(file);
        var decoder = new Lame.Decoder();
        var totalBytesSeen = 0;
        var rate = 0;

        var transform = new Stream.Transform({
            transform: function (chunk, encoding, callback) {
                this.push(chunk);
                totalBytesSeen += chunk.length;
                audio_manager.set_time_elapsed(totalBytesSeen / (4 * rate));
                emitStatus(audio_manager.get_title(),
                        audio_manager.get_state(),
                        audio_manager.get_duration(),
                        audio_manager.get_time_elapsed()
                    );
                callback();
            }
        });

        decoder.on('format', (format) => {
            console.log('MP3 format: %j', format);
            speaker.channels = format.channels;
            speaker.bitDepth = format.bitDepth;
            speaker.sampleRate = format.sampleRate;
            rate = format.sampleRate;
        });

        speaker = new Speaker({
            channels: 2,
            bitDepth: 16,
            sampleRate: 10
        });

        speaker.on('pipe', () => {
            console.log('### PIPING ###');
            audio_manager.play_state = 'playing';
        });

        //stream = stream.pipe(new Throttle(44100));
        stream.pipe(decoder).pipe(transform).pipe(speaker);

        speaker.on('finish', () => {
            audio_manager.set_time_elapsed(0);
            audio_manager.set_state('paused');

            if (!audio_manager.prev_flag) {
                playlist_manager.nextSong((err, s) => {
                    play(s);
                    audio_manager.set_current(s);
                });
            } else {
                playlist_manager.prevSong((err, s) => {
                    play(s);
                    audio_manager.set_current(s);
                });
            }
            audio_manager.prev_flag = false;
            console.log('speaker finished');

        });
    }

    function prev() {
		audio_manager.prev_flag = true;
		speaker.end();
		return audio_manager.play_state;
	}

	function next() {
		audio_manager.prev_flag = false;
		speaker.end();
		return audio_manager.play_state;
	}

	//pauses the song
	function pause() {
		if (audio_manager.is_paused()) {
			audio_manager.set_state('playing');
			speaker.uncork();
		} else if (audio_manager.is_playing()) {
			audio_manager.set_state('paused');
			speaker.cork();
		}

		return audio_manager.play_state;
	}

	//takes song metadata, makes playable information for update below
	function play(song) {
		//copy song metadata into realized object:
		audio_manager.current_song = song;
        audio_manager.time_elapsed = 0;
		//adjusts re object based on song type:
		if (song.type == 'empty') {
			audio_manager.current_song.name = 'Nothing Playing';
		} else if (song.type == 'upload') {
			console.log('Now playing: ' + song.name);
			audio_manager.set_state('playing');
			play_file(song.path);
		}
	}

	// checks if audio paused or stops, takes appropriate action
	function check_start() {
		if (audio_manager.current_is_empty()) {
			if (playlist_manager.queue.songIds.length > 0) {
				playlist_manager.nextSong(function(err, s) {
					play(s);
                    audio_manager.set_current(s);
				});
			} else {
				//if playlist is empty, play a default empty song
                var empty_song = Song.Song('-1');
				play(empty_song);
                audio_manager.set_current(empty_song);
			}

		}
	}

	repeat(check_start).every(2000, 'ms').start.now();

	var module = {
		emitStatus: emitStatus,
		check_start: check_start,
		pause: pause,
		next: next,
		prev: prev
	};

	return module;
};
