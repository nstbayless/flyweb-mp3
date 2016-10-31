module.exports = function(io, audio) {
    io.on('connection', function(socket) {
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
