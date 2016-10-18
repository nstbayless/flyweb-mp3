module.exports = (upload) => {
    var express = require('express');
    var assert = require('assert');
    var fs = require('fs');
    var mm = require('musicmetadata');
    var audio = require('../src/audio');
    var combine = require('merge');
    var youtubedl = require('youtube-dl');

    var router = express.Router();

    manager = require('../src/playlist_manager');

    function api_error(res, code, text) {
        if (!text) {
            text = "";
        }
        else {
            text += "\n\n";
        }
        res.status(code).send(text + "API error occurred.");
    }

    function api_success(res, code, object) {
        if (!object) {
            object = "success";
        }
        if (code == undefined) {
            code = 200;
        }
        res.status(code).send(object);
    }

    function get(req, res, next) {
        path = req.url.split("/").filter((e) => {
            return e.length > 0;
        });

        if (path.length == 0) {
            return res.status(200).send("Welcome to the FlyWeb-mp3 API!");
        }
        else {
            // /api/
            if (path[0] == "track") {
                // /api/track
                if (path.length > 2) {
                    return api_error(res, 400);
                }

                //send list and track index:
                manager.currentPlaylist(function (err,list_id) {
                    manager.currentSongIndex(function (err,sid) {
                        res.send(200, {list_id: list_id, index: sid});
                    });
                });
            }
            if (path[0] == "p") {
                // /api/p/{plid}/
                if (path.length < 2) {
                    return api_error(res, 400, "must supply plid");
                }
                plid = path[1];
                manager.getPlaylist(plid, function (err,list) {
                    res.send(200, list);
                });
            }
        }
    }

    /* GET router */
    router.get(/.*/, function (req, res, next) {
        get(req, res, next);
    });

    // POST a song to the given playlist
    // sends back id of song
    function post_song_upload(req, res, next, list) {
        assert(!!req.file);
        var path = req.file.destination + req.file.filename;
        var title = req.file.originalname;
        var parser = mm(fs.createReadStream(path), {duration: true}, function (err, metadata) {
            if (err) {
                console.log("error sent");
                return api_error(res, 500, "corrupt music")
            }
            if (metadata.title != "") {
                title = metadata.title;
            }
            manager.createSong(list, path, function (id, err) {
                if (err) {
                    return api_error(res, 500);
                }
                else {
                    manager.getSong(id, function (err, s) {
                        s.type = "upload";
                        s.name = title;
                        s.duration = metadata.duration;
                        return res.status(200).send();
                    });
                }
            });
        });
    }

    /**
     * Download a video from the specified URL and save the audio from it.
     */
    function post_song_url(req, res, next, list) {
        assert(!!req.body.url);
        youtubedl.getInfo(req.body.url, [], function(err, info) {
            if (err) {
                throw err;
            }
            var filename = info.id + ".mp3";
            var path = 'uploads/' + filename;
            var title = info.title;

            // download video, convert to MP3, and save MP3
            youtubedl.exec(req.body.url, ['-o', "uploads/%(id)s.%(ext)s", '-x', '--audio-format', 'mp3'], {}, function(err, output) {
                if (err) {
                    throw err;
                }
                var parser = mm(fs.createReadStream(path), {duration: true}, function (err, metadata) {
                    if (err) {
                        throw err;
                    }
                    if (metadata.title != "") {
                        title = metadata.title;
                    }
                    console.log(title);
                    manager.createSong(list, path, function (id, err) {
                        if (err) {
                            return api_error(500);
                        }
                        else {
                            manager.getSong(id, function (err, s) {
                                s.type = "upload";
                                s.name = title;
                                s.duration = metadata.duration;
                                return res.status(200).send();
                            });
                        }
                    });
                });
            });
        });
    }

    function post(req, res, next) {
        path = req.url.split("/").filter((e) => {
            return e.length > 0;
        });
        if (path.length < 1) {
            return api_error(res, 400, "Cannot post to API root");
        }
        else {
            // /api/
            plid = path[0];
            if (path.length == 1) {
                // /api/{plid}
                // TODO: change to /api/p/{plid}

                //rearrange playlist
                return manager.moveSong(plid, req.body.from, req.body.to, function (err) {
                    if (err) {
                        return api_error(res, 400, err);
                    }
                    api_success(res);
                });
            }
            if (path[1] == "songs") {
                // /api/{plid}/songs
                // TODO: change to /api/p/{plid}/songs
                if (path.length == 2) {
                    return api_error(res, 400, "Please post to a subpath, such as songs/upload");
                }
                else {
                    if (path[2] == "upload") {
                        // /api/{plid}/songs/upload
                        if (path.length > 3) {
                            return api_error(res, 400);
                        }
                        return post_song_upload(req, res, next, plid);
                    }
                    else if (path[2] == "url") {
                        // /api/{plid}/songs/upload
                        if (path.length > 3) {
                            return api_error(400);
                        }
                        return post_song_url(req, res, next, plid);
                    }
                }
            }
        }
        next();
    }

    /* POST router, song upload */
    router.post(/.*\/songs\/upload\/?$/, upload.single("song"), function (req, res, next) {
        post(req, res, next);
    });

    /* POST router, song url */
    router.post(/.*\/songs\/url\/?$/, upload.single("song"), function (req, res, next) {
        post(req, res, next);
    });

    /* POST router, non-file-upload */
    router.post(/.*/, function (req, res, next) {
        post(req, res, next);
    });

    return router;
}
