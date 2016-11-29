// Handles playing sound out of speakers on server.

var io; // provided by app.js

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
var bitGate;

function emitStatus() {
	io.sockets.emit("status", {
		title: audio_manager.get_title(),
		state: audio_manager.get_state(),
		duration: audio_manager.get_duration(),
		time_elapsed: audio_manager.get_time_elapsed()
	});
}

function seek(time) {
	if (speaker) {
		audio_manager.seek_time = time;
    	endMusic();
		return audio_manager.get_state();
	}
}

//plays song with audio pipeline above
function play_file(song, seekTime) {
    assert(song.path);
    var file = song.path;
    var stream = Fs.createReadStream(file);
    var totalBytesSeen = 0;
    var rate = 0;

    bitGate = new Stream.Transform({
        transform: function (chunk, encoding, callback) {
			totalBytesSeen += chunk.length;
			if (!seekTime || audio_manager.get_time_elapsed() >= seekTime) {
				this.push(chunk);
                emitStatus();
			}
			audio_manager.set_time_elapsed(totalBytesSeen / (4 * rate));
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
        sampleRate: 0
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
    decoder_write.pipe(bitGate).pipe(speaker);

    bitGate.on("finish", () => {
        speaker.cork();
        speaker = null;
        audio_manager.set_time_elapsed(0);
        audio_manager.set_state("paused");
		if (audio_manager.seek_time !== 0) {
			play(song, audio_manager.seek_time);
		} else if (audio_manager.jump_index>=0) {
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
		audio_manager.seek_time = 0;
        audio_manager.jump_index = -1;
		audio_manager.prev_flag = false;
        console.log("speaker finished");
    });
}

function jumpTo(listId,songIndex) {
    //TODO: listId ignored, multiple playlists not implemented
    audio_manager.jump_index= songIndex;
    endMusic();
    return audio_manager.play_state;
}

function prev() {
	if (speaker) {
		audio_manager.prev_flag = true;
		endMusic();
		return audio_manager.play_state;
	}
}

function next() {
	if (speaker) {
		audio_manager.prev_flag = false;
		endMusic();
		return audio_manager.play_state;
	}
}

//pauses the song
function pause() {
	if (speaker) {
		if (audio_manager.is_paused()) {
			audio_manager.set_state("playing");
			bitGate.uncork();
		} else if (audio_manager.is_playing()) {
			audio_manager.set_state("paused");
			bitGate.cork();
		}
		return audio_manager.play_state;
	}
}

//takes song metadata, makes playable information for update below
function play(song, seekTime) {
	//adjusts re object based on song type:
	if (!song || song.type == "empty") {
        audio_manager.set_current(Song.Song("-1"));
		audio_manager.current_song.name = "Nothing Playing";
	} else if (song.type == "upload") {
        audio_manager.set_current(song);
		console.log("Now playing: " + song.name);
		audio_manager.set_state("playing");
		play_file(song, seekTime);
	}
}

// checks if audio paused or stops, takes appropriate action
function checkStart() {
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

function endMusic() {
    speaker.cork();
    bitGate.end();
}

// sets IO object for broadcasting
function setIo(_io) {
    io = _io;
}

// initiates audio cycle
function startLoop(){
    repeat(checkStart).every(2000, "ms").start.now();
}

module.exports = {
	checkStart: checkStart,
	emitStatus: emitStatus,
	jumpTo: jumpTo,
	next: next,
	pause: pause,
	prev: prev,
	seek: seek,
	setIo: setIo,
	startLoop: startLoop
};
