module.exports = () => {
    var express = require("express");
    var router = express.Router();
    var audio_manager = require("../src/audio_manager");
    //var audio = require("../src/audio");
    var manager = require("../src/playlist_manager");

    // GET view for playlist
    function getPlaylist(req, res, next, path) {
        var listId = "q";
        if (path.length > 0) {
            listId = path[0];
        }
        manager.currentSongIndex(function (err,currentSongIndex) {
            manager.currentPlaylist(function (err, currentListId) {
                manager.getPlaylist(listId, function (err, list) {
                    res.render("playlist", {
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
        if (path[0] === "url") {
            return res.render("add-url", {
                title: res.server_name
            });
        }

        return res.render("add", {
            title: res.server_name
        });
    }

    /* GET router */
    router.get(/.*/, function(req, res, next) {
        // parse URL
        var path = req.url.split("/").filter((e) => {
            return e.length > 0;
        });

        if (path.length === 0) {
            //render home page
            return getPlaylist(req, res, next, []);
        } else {
            if (path[0] == "add") {
                return getAdd(req, res, next, path.slice(1));
            }
        }

        next();
    });

    return router;
};
