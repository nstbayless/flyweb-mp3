module.exports = function(io) {
  module.updateStatus = function(title, state, duration, time_elapsed) {
    io.emit('status', {
      title: title,
      state: state,
      duration: duration,
      time_elapsed: time_elapsed
    });
  }

  return module;
}
