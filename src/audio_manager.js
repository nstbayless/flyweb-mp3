function AudioManager() {
    //the song currently playing
    this.current_song = null;
    this.time_elapsed = 0;
    this.play_state = 'paused';

    this.seek_time = 0;

    // when playback halts (e.g. user skips), prev flag indicate jump to previous track instead of next
    this.prev_flag = false;

    // when playback halts, if this is non-negative, jump to the given track. (Overrides prev flag.)
    this.jump_index = -1;
}

AudioManager.prototype.current_is_empty = function() {
    return !this.current_song || this.current_song.type == 'empty';
};

AudioManager.prototype.is_playing = function() {
    return this.play_state == 'playing';
};

AudioManager.prototype.is_paused = function() {
    return this.play_state == 'paused';
};

AudioManager.prototype.get_state = function() {
    return this.play_state;
};

AudioManager.prototype.get_title = function() {
    return this.current_song.name;
};

AudioManager.prototype.get_duration = function() {
    return this.current_song.duration;
};

AudioManager.prototype.get_time_elapsed = function() {
    return this.time_elapsed;
};

AudioManager.prototype.set_current = function(song) {
    this.current_song = song;
};

AudioManager.prototype.set_time_elapsed = function(time) {
    this.time_elapsed = time;
};

AudioManager.prototype.set_state = function(state) {
    this.play_state = state;
};

module.exports = new AudioManager();
