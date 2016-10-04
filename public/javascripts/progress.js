// for keeping track of file upload progress

// DOM form element
var eltForm

// DOM input element for file input
var eltFormFileInput

//POST the given file to the given url
function uploadFile(f,url) {
	var xhr = new XMLHttpRequest();
	if (xhr.upload) {
		var fd = new FormData();
		fd.append('song',f,f.name);
		xhr.open("POST",url, true);
		xhr.send(fd);
		alert("file sent");
	}
}

function submitOnChange(evt) {
	//retrieve uploaded file
	var f = evt.target.files[0];
	if (f) {
		var url = eltForm.getAttribute("action")
		uploadFile(f,url);
	} else {
		//no file provided
	}
}

window.onload = function(){
	eltForm = document.getElementById('fform');
	eltFormFileInput = document.getElementById('fi');
	
	eltFormFileInput.addEventListener('change', submitOnChange,false);
}
