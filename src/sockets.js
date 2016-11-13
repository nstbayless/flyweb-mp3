var PlaylistManager = require('./playlist_manager');
var Audio = require('./audio');

function setIo(io) {
    io.on('connection', function(socket) {
            socket.on('seek', function(data) {
                Audio.seek(data.time);
            });

            socket.on('updateRequest', function() {
                PlaylistManager.emitCurrentSong();
                PlaylistManager.emitList();
                Audio.emitStatus();
            });

            socket.on('pause', function() {
                Audio.pause();
            });

            socket.on('prev', function() {
                Audio.prev();
            });

            socket.on('next', function() {
                Audio.next();
            });

            socket.on('jump', function(spec) {
                Audio.jumpTo(spec.listId, spec.songIndex);
            });
        });
}
    
module.exports = {
    setIo:setIo
};
