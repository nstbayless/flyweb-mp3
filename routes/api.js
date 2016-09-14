var express = require('express');
var router = express.Router();


/* GET router */
router.get('/', function(req, res, next) {
	next();
});

module.exports = router;
