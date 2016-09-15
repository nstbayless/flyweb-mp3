module.exports = function (id) {
	return {
		id: id,
		type: "silence",
		name: "Song Name",
		duration: 114.3,
		artist: "Artist",
		album: "Album"
	}
}

//valid "types" are:
//"empty": plays no sound and never elapses
//"silence": plays no sound, but still has a duration
//"http": file from url
//"upload": file from upload
