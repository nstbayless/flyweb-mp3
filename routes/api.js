module.exports = (upload) => {
    var express = require('express');
    var assert = require('assert');
    var fs = require('fs');
    var mm = require('musicmetadata');

    var audio = require('../src/audio');
    var combine = require('merge');

    var router = express.Router();

    manager = require('../src/playlist_manager');

    function api_error(res, code, text) {
        if (!text) {
            text = "";
        } else {
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

    function _get(req, res, next) {
        path = req.url.split("/").filter((e) => {
            return e.length > 0;
        });

        if (path.length == 0) {
            return res.status(200).send("Welcome to the FlyWeb-mp3 API!");
        } else {
            // /api/
            if (path[0] == "track") {
                // /api/track
                if (path.length > 2) {
                    return api_error(res, 400);
                }

                //send list and track index:
                manager.currentPlaylist(function(err, list_id) {
                    manager.currentSongIndex(function(err, sid) {
                        res.send(200, {
                            list_id: list_id,
                            index: sid
                        });
                    });
                });
            }
            if (path[0] == "p") {
                // /api/p/{plid}/
                if (path.length < 2) {
                    return api_error(res, 400, "must supply plid");
                }
                plid = path[1];
                manager.getPlaylist(plid, function(err, list) {
                    res.send(200, list);
                });
            }
        }
    }

    /* GET router */
    router.get(/.*/, function(req, res, next) {
        _get(req, res, next);
    });

    // POST a song to the given playlist
    // sends back id of song
    function post_song_upload(req, res, next, list) {
        assert(!!req.file);
        var parser = mm(fs.createReadStream(req.file.destination + req.file.filename), {
            duration: true
        }, function(err, metadata) {
            if (err) {
                throw err;
            }
            if (metadata.title != "") {
                var title = metadata.title;
            } else {
                var title = req.file.originalname;
            }
            manager.createSong(list, req.file.destination + req.file.filename, function(id, err) {
                if (err) {
                    return api_error(res, 500);
                } else {
                    manager.getSong(id, function(err, s) {
                        s.type = "upload";
                        s.name = title;
                        s.duration = metadata.duration;
                        return res.status(200).send();
                    });
                }
            });
        });
    }

    function _post(req, res, next) {
        path = req.url.split("/").filter((e) => {
            return e.length > 0;
        });
        if (path.length < 1) {
            return api_error(res, 400, "Cannot post to API root");
        } else {
            // /api/
            plid = path[0];
            if (path.length == 1) {
                // /api/{plid}
                // TODO: change to /api/p/{plid}

                //rearrange playlist
                return manager.moveSong(plid, req.body.from, req.body.to, function(err) {
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
                } else {
                    if (path[2] == "upload") {
                        // /api/{plid}/songs/upload
                        if (path.length > 3) {
                            return api_error(res, 400);
                        }
                        return post_song_upload(req, res, next, plid);
                    }
                }
            }
        }
        next();
    }

    /* POST router, song upload */
    router.post(/.*\/songs\/upload\/?$/, upload.single("song"), function(req, res, next) {
        _post(req, res, next);
    });

    /* POST router, non-file-upload */
    router.post(/.*/, function(req, res, next) {
        _post(req, res, next);
    });

    function _delete(req, res, next) {
        path = req.url.split("/").filter((e) => {
            return e.length > 0;
        });
        if (path.length < 1) {
            return api_error(res, 400, "Cannot delete API root");
        } else {
            if (path[0] == "p") {
                // /api/p            
                if (path.length >= 2) {
                    // /api/p/{plid}
                    var plid = path[1];
                    if (path.length >= 3) {
                        if (path[2] == "songs") {
                            // /api/p/{plid}/songs
                            if (path.length >= 4) {
                                // /api/p/{plid}/songs/{sid}
                                sid = parseInt(path[3]);
                                if (sid) {
                                    if (sid < 0) {
                                        return api_error(res, 400, "index cannot be negative");
                                    }
                                    // TODO: use actual delete method, when implemented
                                    manager.getPlaylist(plid, function(err, pl) {
                                        if (err) {
                                            return api_error(res, 500, err);
                                        } else {
                                            if (sid >= pl.songIds.length) {
                                                return api_error(res, 400, "index " + sid + " exceeds " +
                                                    plid + " with length " + pl.songIds.length);
                                            }
                                            var newPlaylist = pl.songIds.slice(0);
                                            newPlaylist.splice(sid, 1);
                                            manager.replaceList(plid, newPlaylist, function(err) {
                                                if (err) {
                                                    return api_error(res, 500, err);
                                                } else {
                                                    return api_success(res);
                                                }
                                            });
                                        }
                                    });
                                    return;
                                } else {
                                    // song index not a number
                                    return api_error(res, 400, "song must be an integer: id in playlist " + plid);
                                }
                            }
                        }
                    }
                }
            }
        }
        next();
    }

    /* DELETE router */
    router.delete(/.*/, function(req, res, next) {
        _delete(req, res, next);
    });

    return router;
}
