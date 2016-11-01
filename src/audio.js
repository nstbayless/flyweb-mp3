// Handles playing sound out of speakers on server.

module.exports = function(io) {

	var repeat = require("repeat");
	var Song = require ("./_song");
	var playlist_manager = require("./playlist_manager");
    var audio_manager = require("./audio_manager");

	// audio playing pipeline:
	var Optional = require("optional");
	var Speaker = require("speaker");
	var Lame = require("lame");
	var Fs = require("fs");
	var Stream = require("stream");
	var assert = require("assert");
	
	// optional dependencies:
	var Wav = Optional("wav");
	var Ogg = Optional("ogg");
	var Vorbis = Optional("vorbis");
	
    function warn(pkg,name) {
        if (!pkg) {
            console.log("Optional dependency missing: " + name);
        }
    }
    
    warn(Wav,"wav");
    warn(Ogg,"ogg");
    warn(Vorbis,"vorbis");
	
	var speaker;

	function emitStatus(title, state, duration, time_elapsed) {
		io.sockets.emit("status", {
			title: title,
			state: state,
			duration: duration,
			time_elapsed: time_elapsed
		});
	}

	//plays song with audio pipeline above
    function play_file(song) {
        assert(song.path);
        var file = song.path;
        var stream = Fs.createReadStream(file);
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

        // pick audio decoder
        var decoder_read;
        var decoder_write;
        var decoder;
        
        console.log("Format: " + song.format);
        
        speaker = new Speaker({
            channels: 2,
            bitDepth: 16,
            sampleRate: 10
        });

        //TODO: refactor decoder picking into its own function
        if (song.format === "mp3") {
            decoder = new Lame.Decoder();
            decoder.on("format", (format) => {
                console.log("MP3 format: %j", format);
                speaker.channels = format.channels;
                speaker.bitDepth = format.bitDepth;
                speaker.sampleRate = format.sampleRate;
                rate = format.sampleRate;
            });
            
            // duplex stream
            decoder_read = decoder;
            decoder_write = decoder;
        } else if (song.format === "ogg" && Ogg && Vorbis) {
            decoder_write = new Stream.PassThrough();
            var od = new Ogg.Decoder();
            od.on("stream", (stream) => {
                var vd = new Vorbis.Decoder();
                vd.on("format", (format) => {
                    console.log("Ogg format: %j", format);
                    for (var prop in format) {
                        speaker[prop]=format[prop];
                    }
                    
                    // TODO: why is the sample rate twice stated?
                    rate = format.sampleRate*2;
                });
                
                vd.on("error", function (err) {
                    console.log(err);
                });
                
                stream.pipe(vd);
                vd.pipe(decoder_write);
            });
            decoder_read = od;
        } else if (song.format === "wav" && Wav) {
           decoder = new Wav.Reader();
           decoder.on("format", (format) => {
                console.log("Wav format: %j", format);
                speaker.channels = format.channels;
                speaker.bitDepth = format.bitDepth;
                speaker.sampleRate = format.sampleRate;
                rate = format.sampleRate;
            }); 
            
            // duplex stream
            decoder_read = decoder;
            decoder_write = decoder;
        } else {
            throw "Cannot read file format: " + song.format;
        }

        speaker.on("pipe", () => {
            console.log("### PIPING ###");
            audio_manager.play_state = "playing";
        });

        //stream = stream.pipe(new Throttle(44100));
        stream.pipe(decoder_read);
        decoder_write.pipe(transform).pipe(speaker);

        speaker.on("finish", () => {
            audio_manager.set_time_elapsed(0);
            audio_manager.set_state("paused");

            if (audio_manager.jump_index>=0) {
                playlist_manager.currentPlaylist(function (err,currentListId) {
                    playlist_manager.chooseSong(currentListId,audio_manager.jump_index, (err, s) => {
                        play(s);
                        audio_manager.set_current(s);
                    });
                });
            } else if (!audio_manager.prev_flag) {
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
            audio_manager.jump_index = -1;
            console.log("speaker finished");
        });
    }
    
    function jumpTo(songIndex) {
        audio_manager.jump_index= songIndex;
        speaker.end();
        return audio_manager.play_state;
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
			audio_manager.set_state("playing");
			speaker.uncork();
		} else if (audio_manager.is_playing()) {
			audio_manager.set_state("paused");
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
		if (song.type == "empty") {
			audio_manager.current_song.name = "Nothing Playing";
		} else if (song.type == "upload") {
			console.log("Now playing: " + song.name);
			audio_manager.set_state("playing");
			play_file(song);
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
                var empty_song = Song.Song("-1");
				play(empty_song);
                audio_manager.set_current(empty_song);
			}

		}
	}

	repeat(check_start).every(2000, "ms").start.now();

	var module = {
		emitStatus: emitStatus,
		check_start: check_start,
		pause: pause,
		next: next,
		prev: prev,
		jumpTo: jumpTo
	};

	return module;
};
