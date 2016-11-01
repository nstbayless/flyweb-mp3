var audio_manager = {};

//the song currently playing
audio_manager.current_song = null;
audio_manager.time_elapsed = 0;
audio_manager.play_state = 'paused';

audio_manager.seek_time = 0;

// when playback halts (e.g. user skips), prev flag indicate jump to previous track instead of next
audio_manager.prev_flag = false;

// when playback halts, if this is non-negative, jump to the given track. (Overrides prev flag.)
audio_manager.jump_index = -1;

audio_manager.current_is_empty = function() {
    return !audio_manager.current_song || audio_manager.current_song.type == 'empty';
};

audio_manager.is_playing = function() {
    return audio_manager.play_state == 'playing';
};

audio_manager.is_paused = function() {
    return audio_manager.play_state == 'paused';
};

audio_manager.get_state = function() {
    return audio_manager.play_state;
};

audio_manager.get_title = function() {
    return audio_manager.current_song.name;
};

audio_manager.get_duration = function() {
    return audio_manager.current_song.duration;
};

audio_manager.get_time_elapsed = function() {
    return audio_manager.time_elapsed;
};

audio_manager.set_current = function(song) {
    audio_manager.current_song = song;
};

audio_manager.set_time_elapsed = function(time) {
    audio_manager.time_elapsed = time;
};

audio_manager.set_state = function(state) {
    audio_manager.play_state = state;
};

module.exports = audio_manager;
