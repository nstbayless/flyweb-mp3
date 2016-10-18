var Playlist = require('./_playlist');
var Song = require('./_song');

var audio_manager = {};

//the song currently playing
audio_manager.current_song = null;
audio_manager.time_elapsed = 0;
audio_manager.play_state = 'paused';
audio_manager.prev_flag = false;

audio_manager.current_is_empty = function() {
    return !audio_manager.current_song || audio_manager.current_song.type == 'empty';
}

audio_manager.is_playing = function() {
    return audio_manager.play_state == 'playing';
}

audio_manager.is_paused = function() {
    return audio_manager.play_state == 'paused';
}

audio_manager.get_duration = function() {
    return audio_manager.current_song.duration;
}

audio_manager.get_time_elapsed = function() {
    return audio_manager.time_elapsed;
}

audio_manager.set_current = function(song) {
    audio_manager.current_song = song;
}

audio_manager.set_time_elapsed = function(time) {
    audio_manager.time_elapsed = time;
}

audio_manager.set_state = function(state) {
    audio_manager.play_state = state;
}

audio_manager.set_state = function(state) {
    audio_manager.play_state = state;
}

module.exports = audio_manager;
