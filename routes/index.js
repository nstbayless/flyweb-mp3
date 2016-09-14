var express = require('express');
var router = express.Router();
var db_get = require('../src/db_get');

/* GET playlist render; */
function get_playlist (req,res,next, path) {
	console.log(path);
	if (path.length==0)
		id=""
	else
		id = path[0];
	pl = db_get.playlist(id,true);
	res.render('playlist', { title: 'Local Area MP3', pl: pl});
}

/* GET router */
router.get(/.*/, function(req, res, next) {
	//parse URL:
	path = req.url.split("/").filter((e) => {return e.length>0});
	if (path.length==0) {
		//render home page:
		return get_playlist(req,res,next,[]);
	} else {
		if (path[0]=="p")
			return get_playlist(req,res,next, path.slice(1));
	}
	next();
});

module.exports = router;
