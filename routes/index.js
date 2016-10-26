module.exports = () => {
    var express = require("express");
    var router = express.Router();
    var audio_manager = require("../src/audio_manager");
    //var audio = require("../src/audio");
    var manager = require("../src/playlist_manager");

    /* GET playlist render; */
    function get_playlist(req, res, next, path) {
        var id = "q";
        if (path.length > 0) {
            id = path[0];
        }

        manager.getPlaylist(id, function(err, list) {
            res.render("playlist", {
                title: res.server_name,
                pl: list,
                track: audio_manager.current_song
            });
        });
    }

    /** GET for adding to playlist or queue */
    function get_add(req, res, next, path) {
        var id = "";
        if (path.length > 0) {
            id = path[0];
        }

        manager.getPlaylist(id, function (err, pl) {
            if (path.length <= 1) {  // /add[/{plid}]
                res.render("add", {title: res.server_name, pl: pl, track: audio_manager.current_song});
            }
            else {
                if (path[1] == "url") {
                    // /add[{plid}]/url
                    res.render("add-url", {title: res.server_name, pl: pl, track: audio_manager.current_song});
                }
            }
        });
    }

    /* GET router */
    router.get(/.*/, function (req, res, next) {
        //parse URL:
        var path = req.url.split("/").filter((e) => {
                return e.length > 0;
        });
        if (path.length === 0) {
            //render home page:
            return get_playlist(req, res, next, []);
        }
        else {
            if (path[0] == "p") {
                return get_playlist(req, res, next, path.slice(1));
            }
            if (path[0] == "add") {
                return get_add(req, res, next, path.slice(1));
            }
        }
        next();
    });

    return router;
};
