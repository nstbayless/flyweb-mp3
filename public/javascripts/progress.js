// for keeping track of file upload progress


function submit_on_change(evt) {
	//retrieve uploaded file
	var f = evt.target.files[0];
	if (f) {
		var fr = new FileReader();
		fr.onload = function(e) {
			var body = e.target.result;
			alert(f.name);
		}
		fr.readAsText(f);
	} else {
		//no file provided
	}
}

window.onload = function(){
	var fin = document.getElementById('fi').addEventListener('change', submit_on_change,false);
}
