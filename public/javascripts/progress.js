/* jslint browser: true */
/* globals $ */

// displays upload progress
function uploadProgress(p) {
    var style = (100 * p) + '%';

    $('#upload-progress-elapsed').animate({
        width: style
    }, 100);
}

// POST the given file to the given url
// cb: (err,success)=>(void)
function uploadFiles(files, url, cb, progress) {
    var xhr = new XMLHttpRequest();
    var f;
    var fd = new FormData();

    // check for obvious errors:
    if (!xhr.upload) {
        return cb('Browser does not support uploading');
    }

    // add song file to form data
    for (var i = 0; i < files.length; i++) {
        f = files[i];
        fd.append('song[]', f, f.name);
    }

    // callback delegation
    xhr.upload.addEventListener('progress', function(e) {
        progress(e.loaded / e.total);
    }, false);
    xhr.upload.addEventListener('load', function() {
        cb(null, true);
    }, false);
    xhr.upload.addEventListener('error', function() {
        cb('Error uploading');
    }, false);
    xhr.upload.addEventListener('abort', function() {
        cb('Upload aborted', false);
    }, false);

    // do POST to the given endpoint
    xhr.open('POST', url, true);
    // begin upload
    xhr.send(fd);

    return cb();
}

$(function() {
    // hide progress bar & error message
    $('#upload-progress-bar').hide();
    $('#upload-error').hide();

    // handle file submit
    $('#fi').on('change', function() {
        var f = $('#fi')[0].files;

        if (f) {
            var url = $('#fform').attr('action');

            $('#add-module-container').hide();
            $('#upload-error').hide();
            $('#upload-progress-bar').show();

            uploadFiles(f, url, (err, success) => {
                if (err) {
                    // re-display form along with error message
                    $('#upload-progress-bar').hide();
                    $('#add-module-container').show();
                    $('#upload-error').show().text('Error: ' + err);
                }

                if (success) {
                    setTimeout(function() {
                        window.location.replace('/');
                    }, 500);
                }
            }, uploadProgress);
        }
    });
});
