var song = {}

song.Song = function (id) {
	return {
		id: id,
		type: "empty",
		name: "No song",
		duration: 0,
		artist: "Artist",
		album: "Album",
		path: ""
	}
}

module.exports = song

//valid "types" are:
//"empty": plays no sound and skips to next song if possible
//"silence": plays no sound, but still has a duration
//"http": file from url
//"upload": file from upload
