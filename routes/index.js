module.exports = () => {
    var express = require('express');
    var router = express.Router();
    var audio_manager = require('../src/audio_manager');
    var audio = require('../src/audio');
    var manager = require('../src/playlist_manager');

    // GET view for playlist
    function getPlaylist(req, res, next, path) {
        if (path.length == 0) {
            listId = "q";
        } else {
            listId = path[0];
        }
        manager.currentSongIndex(function (err,currentSongIndex) {
            manager.currentPlaylist(function (err, currentListId) {
                manager.getPlaylist(listId, function (err, list) {
                    res.render('playlist', {
                        title: res.server_name,
                        list: list,
                        track: audio_manager.current_song,
                        currentSongIndex: currentSongIndex,
                        currentListId: currentListId
                    });
                });
            });
        });
    }

    // GET view for adding to playlist or queue
    function getAdd(req, res, next, path) {

        if (path.length == 0) {
            listId = "";
        } else {
            listId = path[0];
        }
        manager.getPlaylist(listId, function (err, list) {
            if (path.length <= 1) { // /add[/{plid}]
                return res.render('add', {
                    title: res.server_name,
                    list: list,
                    track: audio_manager.current_song
                });
            } else {
                if (path[1] == "url") {
                    // /add[/{plid}]/url
                    return res.render('add-url', {
                        title: res.server_name,
                        list: list,
                        track: audio_manager.current_song
                    });
                }
                return next();
            }
        });
    }

    /* GET router */
    router.get(/.*/, function(req, res, next) {
        //parse URL:
        path = req.url.split("/").filter((e) => {
            return e.length > 0;
        });
        if (path.length == 0) {
            //render home page:
            return getPlaylist(req, res, next, []);
        } else {
            if (path[0] == "p") {
                return getPlaylist(req, res, next, path.slice(1));
            }
            if (path[0] == "add") {
                return getAdd(req, res, next, path.slice(1));
            }
        }
        next();
    });

    return router;
}
