module.exports = function(io, audio, playlistManager) {
    io.on('connection', function(socket) {
        socket.on('seek', function(data) {
            audio.seek(data.time);
        });

        socket.on('updateRequest', function() {
            playlistManager.emitCurrentSong();
            playlistManager.emitList();
        });

        socket.on('pause', function() {
            audio.pause();
        });

        socket.on('prev', function() {
            audio.prev();
        });

        socket.on('next', function() {
            audio.next();
        });

        socket.on('jump', function(spec) {
            audio.jumpTo(spec.listId, spec.songIndex);
        });
    });
};
