// API requests (to be partially phased out by sockets)

// capture upload from app.js to ensure uploads/ folder in root directory
// capture audio due to audio having special require() rules
module.exports = (upload, audio) => {
    var express = require("express");
    var assert = require("assert");
    var fs = require("fs");
    var mm = require("musicmetadata");
    var youtubedl = require("youtube-dl");
    var mp3length = require("mp3length");
    var router = express.Router();

    var manager = require("../src/playlist_manager");

    function apiError(res, code, text) {
        if (!text) {
            text = "";
        } else {
            text += "\n\n";
        }
        res.status(code).send(text + "API error occurred.");
    }

    function apiSuccess(res, code, object) {
        if (!object) {
            object = "success";
        }
        if (code === undefined) {
            code = 200;
        }
        res.status(code).send(object);
    }

    // parses and handles GET requests
    function _get(req, res, next) {
        var path = req.url.split("/").filter((e) => {
            return e.length > 0;
        });

        if (path.length === 0) {
            return res.status(200).send("Welcome to the FlyWeb-mp3 API!");
        } else {
            // /api/
            if (path[0] == "track") {
                // /api/track
                if (path.length > 2) {
                    return apiError(res, 400);
                }

                //send list and track index:
                manager.currentPlaylist(function(err, listId) {
                    manager.currentSongIndex(function(err, songIndex) {
                        res.send(200, {
                            list_id: listId,
                            index: songIndex
                        });
                    });
                });
            }
            
            if (path[0] == "p") {
                // /api/p/{listId}
                
                // retrieves given playlist
                if (path.length < 2) {
                    return apiError(res, 400, "must supply listId");
                }
                var listId = path[1];
                manager.getPlaylist(listId, function(err, list) {
                    res.send(200, list);
                });
            }
            
            next();
        }
    }

    /* GET router */
    router.get(/.*/, function (req, res, next) {
        _get(req, res, next);
    });

    // POST a song to the given playlist
    // sends back id of song
    function postSongUpload(req, res, next, listId) {
        assert(!!req.files);
        
        var shared = {
            // true if any asynchronous call to manager returns an error.
            resErr: false,
            
            // counts asychronous successes to manager.
            // When all requests succeed, response sent.
            resSuccessCount: 0
        };
        
        console.log(req.files);
        
        for (var i=0;i<req.files.length;i++) {
            // process each file uploaded
            ((_capture_i,shared)=>{
                var i = _capture_i;
                var file = req.files[i];
                var path = file.destination + file.filename;
                var title = file.originalname;
                mm(fs.createReadStream(path), {
                    duration: true
                }, function(err, metadata) {
                    if (err) {
                        throw err;
                    }
                    if (metadata.title !== "") {
                        title = metadata.title;
                    }
                    manager.createSong(listId, path, function (id, err) {
                        if (err && !shared.resErr) {
                            // only send at most one error.
                            shared.resErr=true;
                            apiError(res, 500);
                        } else {
                            manager.getSong(id, function(err, s) {
                                if (err && !shared.resErr) {
                                    // only send at most one error.
                                    shared.resErr=true;
                                    return apiError(res, 500);
                                } else {
                                    s.type = "upload";
                                    s.name = title;
                                    s.duration = metadata.duration;
                                    if (!shared.resErr) {
                                        assert(shared.resSuccessCount<req.files.length);
                                        shared.resSuccessCount++;
                                        if (shared.resSuccessCount==req.files.length) {
                                            res.status(200).send();
                                        }
                                    }
                                }
                            });
                        }
                    });
                });
            })(i,shared);
        }
    }

    /**
     * Download a video from the specified URL and save the audio from it.
     */
    function postSongUrl(req, res, next, listId) {
        assert(!!req.body.url);
        youtubedl.getInfo(req.body.url, [], function(err, info) {
            if (err) {
                throw err;
            }
            var filename = info.id + ".mp3";
            var path = "uploads/" + filename;
            var title = info.title;

            // download video, convert to MP3, and save MP3
            youtubedl.exec(req.body.url, ["-o", "uploads/%(id)s.%(ext)s", "-x", "--audio-format", "mp3"], {}, function(err) {
                if (err) {
                    throw err;
                }

                mm(fs.createReadStream(path), {duration: true}, function (err, metadata) {
                    if (err) {
                        console.log("### ERROR READING METADATA ###");
                        console.log("error sent");
                        mp3length(path, function (err, length) {
                            if (err) {
                                console.log("### MP3 FILE CORRUPT ###");
                            } else {
                                manager.createSong(listId, path, function (id, err) {
                                    if (err) {
                                        return apiError(res, 500);
                                    }
                                    else {
                                        manager.getSong(id, function (err, s) {
                                            s.type = "upload";
                                            s.name = title;
                                            s.duration = length;
                                            return res.status(200).send();
                                        });
                                    }
                                });
                            }
                        });
                    }
                    if (metadata.title !== "") {
                        title = metadata.title;
                    }
                    console.log(title);
                    manager.createSong(listId, path, function (id, err) {
                        if (err) {
                            return apiError(500);
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

    function _post(req, res, next) {
        var path = req.url.split("/").filter((e) => {
            return e.length > 0;
        });
        if (path.length < 1) {
            return apiError(res, 400, "Cannot post to API root");
        } else {
            // /api/
            var listId = path[0];
            if (path.length == 1) {
                // /api/{listId}
                // TODO: change to /api/p/{listId}

                //rearrange playlist
                return manager.moveSong(listId, req.body.from, req.body.to, function (err) {
                    if (err) {
                        return apiError(res, 400, err);
                    }
                    apiSuccess(res);
                });
            }
            if (path[1] == "songs") {
                // /api/{listId}/songs
                // TODO: change to /api/p/{listId}/songs
                if (path.length == 2) {
                    return apiError(res, 400, "Please post to a subpath, such as songs/upload");
                } else {
                    if (path[2] == "upload") {
                        // /api/{listId}/songs/upload
                        if (path.length > 3) {
                            return apiError(400);
                        }
                        return postSongUpload(req, res, next, listId);
                    }
                    else if (path[2] == "url") {
                        // /api/{listId}/songs/url
                        if (path.length > 3) {
                            return apiError(res, 400);
                        }
                        return postSongUrl(req, res, next, listId);
                    }
                }
            }
        }
        next();
    }

    /* POST router, song upload.
       Multer requires a router for uploading files separate from the standard one. */
    router.post(/.*\/songs\/upload\/?$/, upload.array("song[]",12), function(req, res, next) {
        _post(req, res, next);
    });

    /* POST router, non-file-upload */
    router.post(/.*/, function(req, res, next) {
        _post(req, res, next);
    });

    function _delete(req, res, next) {
        var path = req.url.split("/").filter((e) => {
            return e.length > 0;
        });
        if (path.length < 1) {
            return apiError(res, 400, "Cannot delete API root");
        } else {
            if (path[0] == "p") {
                // /api/p            
                if (path.length >= 2) {
                    // /api/p/{listId}
                    var listId = path[1];
                    if (path.length >= 3) {
                        if (path[2] == "songs") {
                            // /api/p/{listId}/songs
                            if (path.length >= 4) {
                                // /api/p/{listId}/songs/{songIndex}
                                var songIndex = parseInt(path[3]);
                                if (songIndex || songIndex===0 ) {
                                    if (songIndex < 0) {
                                        return apiError(res, 400, "index cannot be negative");
                                    }
                                    manager.removeSong(listId,songIndex, function (err,removedCurrentSong) {
                                        if (err) {
                                            res.status(500).send(err);
                                        } else {
                                            if (removedCurrentSong) {
                                                // gets the next song after the one removed to start playing
                                                // can"t use next() because current song deleted. This is a hack.
                                                audio.jumpTo(songIndex);
                                            }
                                            return res.status(200).send("removed song");
                                        }
                                    });
                                    return;
                                } else {
                                    // song index not a number
                                    return apiError(res, 400, "song must be an integer: id in playlist " + listId);
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
};
