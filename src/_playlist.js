var playlist = {};

playlist.Playlist = function (id) {
    return {
        id: id,
        name: id,
        songIds: [],
        songs: []
    };
};

playlist.addSong = function (list, song) {
    list.songs.push(song);
};

playlist.addSongId = function (list, songId) {
    list.songIds.push(songId);
};

module.exports = playlist;
