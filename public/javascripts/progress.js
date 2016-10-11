// for keeping track of file upload progress

// DOM form element
var eltForm;

// DOM input element for file input
var eltFormFileInput;

// DOM div containing progress bar 
var progressBarContainer;

// DOM div of (inner) progress bar
var progressBar;

// DOM error message element
var errorMessage;

// determines whether progress bar or form is visible
function setProgressBarVisibility(visible) {
    if (visible) {
        eltForm.style.display = "none";
        progressBarContainer.style.display = "inline";
    } else {
        eltForm.style.display = "inline";
        progressBarContainer.style.display = "none";
    }
}

//displays upload portion
//p: portion uploaded from 0 to 1
function uploadProgress(p) {
    var style = ((100 * p) + "%");
    console.log(style);
    progressBar.style.width = style;
}

//POST the given file to the given url
//cb: (err,success)=>(void)
function uploadFile(f, url, cb, progress) {
    var xhr = new XMLHttpRequest();

    //check for obvious errors:
    if (!xhr.upload) {
        return cb("Browser does not support uploading");
    }
    if (!f.type.match(/^audio\//)) {
        return cb("Only audio files are allowed");
    }
    var fd = new FormData();

    //add song file to form data:
    fd.append('song', f, f.name);

    //callback delegation:
    xhr.upload.addEventListener("progress", function(e) {
        var pc = parseInt(e.loaded / e.total);
        progress(pc);
    }, false);
    xhr.upload.addEventListener("load", function(e) {
        progress(1);
        cb(null, true);
    }, false);
    xhr.upload.addEventListener("error", function(e) {
        cb("Error uploading");
    }, false);
    xhr.upload.addEventListener("abort", function(e) {
        cb("Upload aborted", true);
    }, false);

    //do POST to the given endpoint:
    xhr.open("POST", url, true);

    //begin upload:
    xhr.send(fd);
    return cb();
}

//called when a file uploaded or upload dialogue cancelled
function submitOnChange(evt) {
    //retrieve uploaded file
    var f = evt.target.files[0];
    if (f) {
        //file provided
        setProgressBarVisibility(true);
        errorMessage.innerHTML = "";
        var url = eltForm.getAttribute("action")
        uploadFile(f, url, (err, success) => {
            //display form to be re-shown:
            if (err) {
                setProgressBarVisibility(false);
                errorMessage.innerHTML = "Error: " + err;
            }
            if (success) {
                var redirect = '/p/' + list.id;
                window.location.replace(redirect);
            }
        }, uploadProgress);
    } else {
        //no file provided
    }
}

window.onload = function() {
    eltForm = document.getElementById('fform');
    eltFormFileInput = document.getElementById('fi');
    eltFormFileInput.addEventListener('change', submitOnChange, false);

    progressBarContainer = document.getElementById('progbarcontainer');
    progressBar = document.getElementById('progbarprogress');
    errorMessage = document.getElementById('errormessage');
    setProgressBarVisibility(false);
}
