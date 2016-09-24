module.exports = () => {
	var express = require('express');
	var router = express.Router();
	var tmp = require('../src/tmp_store');
	var audio = require('../src/audio');
	var manager = require('../src/playlist_manager');

	/* GET playlist render; */
	function get_playlist(req, res, next, path) {
		if (path.length == 0) {
			id = "";
		}
		else {
			id = path[0];
		}
		manager.getPlaylist(id, function(list) {
			res.render('playlist', {title: res.server_name, pl: list, track: tmp.track});
		});
	}

	/** GET for adding to playlist or queue */
	function get_add (req,res,next, path) {
		if (path.length==0)
			id=""
		else
			id = path[0];
		manager.getPlaylist(id, function(pl) {
			if (path.length<=1)  // /add[/{plid}]
				res.render('add', { title: res.server_name, pl: pl, track:tmp.track});
			else {
				if (path[1]=="upload") {
					// /add[/{plid}]/upload
					res.render('add-upload', { title: res.server_name, pl: pl, track:tmp.track});
				}
			}
		});
	}

	/* GET router */
	router.get(/.*/, function(req, res, next) {
		//parse URL:
		path = req.url.split("/").filter((e) => {return e.length > 0});
		if (path.length == 0) {
			//render home page:
			return get_playlist(req, res, next, []);
		}
		else {
			if (path[0] == "p")
				return get_playlist(req,res,next, path.slice(1));
			if (path[0] == "add")
				return get_add(req,res,next,path.slice(1));
			if (path[0] == "status") {
				res.setHeader('Content-Type', 'application/json');
				res.send(JSON.stringify(audio.status()));
				return;
			}
			if (path[0] == "pause") {
				var state = audio.pause();
				res.setHeader('Content-Type', 'application/json');
				res.send(JSON.stringify({
					state: state
				}));
				return;
			}
		}
		next();
	});

	return router;
}
