module.exports = function (id) {
	return {
		id: id,
		type: "empty",
		name: "No song",
		duration: 0,
		artist: "Artist",
		album: "Album"
	}
}

//valid "types" are:
//"empty": plays no sound and skips to next song if possible
//"silence": plays no sound, but still has a duration
//"http": file from url
//"upload": file from upload
