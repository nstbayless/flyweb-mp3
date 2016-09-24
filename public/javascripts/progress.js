// for keeping track of file upload progress

function submit_fn() {
	console.log(a);
	return false;
}

$(function() {
	alert("!");
	$('form').ajaxForm({
		beforeSend: function() {
			alert("!");
		},
		 uploadProgress: function(event, position, total, percentComplete) {
			alert("!");
		}
	})
}
