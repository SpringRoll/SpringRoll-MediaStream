/*! MediaStream 1.0.0 */
/**
 * @namespace springroll
 */

(function(window)
{

	/**
	 * An object used to return data to the user
	 * @property {Object} _data
	 * @private
	 */
	var _data = null;


	/**
	 * An object that contains the MediaStreamSource audio
	 * @property {Object} _audio
	 * @private
	 */
	var _audio = null;


	/**
	 * An object that contains the getUserMedia stream
	 * @property {Object} _stream
	 * @private
	 */
	var _stream = null;


	/**
	 * An object that spcifies the options that the user passed in
	 * @property {Object} _options
	 * @private
	 */
	var _options = null;


	/**
	 * An HTML5 video element used to play the getUserMedia video stream
	 * @property {Video} _videoElm
	 * @private
	 */
	var _videoElm = null;


	/**
	 * An object that spcifies an AudioContext
	 * @property {AudioContext} _audioCtx
	 * @private
	 */
	var _audioCtx = null;

	
	/**
	 * A number that spcifies the index of the current video source
	 * @property {Number} _sourceIndex
	 * @private
	 */
	var _sourceIndex = null;


	/**
	 * An object that spcifies a BiquadFilter 
	 * @property {BiquadFilter} _biquadFilter
	 * @private
	 */
	var _biquadFilter = null;


	/**
	 * An array of all of the available video sources
	 * @property {Array} _videoSources
	 * @private
	 */
	var _videoSources = null;


	/**
	 * A boolean used to keep track of whether or not the audio is currently streaming
	 * @property {Boolean} _audioPlaying
	 * @private
	 */
	var _audioPlaying = false;


	/**
	 * A boolean used to keep track of whether or not the video is currently streaming
	 * @property {Boolean} _videoPlaying
	 * @private
	 */
	var _videoPlaying = false;


	/**
	 * A class for creating and managing webcam/microphone streams 
	 * and returning them to the user in a manageable way 
	 * @class MediaStream
	 * @param options {object} to specify if audio or video should be enabled
	 */
	var MediaStream = function(options)
	{
		// if the options does not have the data we need then dont continue
		if (!options || (!options.video && !options.audio))
		{
			return;
		}

		var self = this;
		_options = options;
		_data = {};

		// tying in to the paused and resumed events of the springroll container
		app.on('paused', _onPaused);
		app.on('resumed', _onResumed);

		if (navigator.mediaDevices === undefined)
		{
			navigator.mediaDevices = {};
		}

		// if mediaDevices.getUserMedia does not exist then create a 
		// polyfill for it or error saying that it is not supported
		if (navigator.mediaDevices.getUserMedia === undefined)
		{
			navigator.mediaDevices.getUserMedia = function(constraints)
			{
				var getUserMedia = (navigator.getUserMedia ||
					navigator.webkitGetUserMedia ||
					navigator.mozGetUserMedia);

				if (!getUserMedia)
				{
					_data = {};
					_data.isSupported = false;
					_data.error = 'streaming is not supported by this browser.';
				}

				return new Promise(function(resolve, reject)
				{
					getUserMedia.call(navigator, constraints, resolve, reject);
				});
			};
		}
 
		_getVideoSources(function(sources)
		{
			_videoSources = sources;

			// if there is an available video source and the user 
			// wants to use it then setup the options to do so 
			if (_videoSources && _options.video)
			{
				_sourceIndex = 0;

				_options.video = {
					deviceId: _videoSources[_sourceIndex].deviceId ?
					{
						exact: _videoSources[_sourceIndex].deviceId
					} : true
				};
			}
			else
			{
				_options.video = false;
			}

			// get the video/audio streams
			navigator.mediaDevices.getUserMedia(_options)
				.then(function(stream)
				{
					_stream = stream;

					if (_options.audio)
					{
						_createAudio();
					}

					if (_options.video)
					{
						_videoElm = document.createElement('video');
						_createVideo();
					}

					_data = {};
					_data.video = _videoElm;
					_data.audio = _audio;
					_data.audioCtx = _audioCtx;

					// return the stream data to the user onload
					self.onLoad(_data);
				})
				.catch(function(error)
				{
					if (!_data.error)
					{
						_data = {};
						_data.isSupported = true;
						_data.error = error.message;
					}

					// return the error object to the user onload
					self.onLoad(_data);
				});
		});
	};

	var p = extend(MediaStream);


	/**
	 * Pauses the audio and video when the "paused" event is fired
	 * @private
	 * @method _onPaused
	 */
	var _onPaused = function()
	{
		if (_stream === null)
		{
			return;
		}

		if (_options.audio)
		{
			_audio.context.suspend();
		}

		if (_options.video)
		{
			_videoElm.pause();
		}
	};


	/**
	 * Plays the audio and video when the "resumed" event is fired
	 * @private
	 * @method _onResumed
	 */
	var _onResumed = function()
	{
		if (_stream === null)
		{
			return;
		}

		if (_audioPlaying && _options.audio)
		{
			_audio.context.resume();
		}

		if (_videoPlaying && _options.video)
		{
			_videoElm.play();
		}
	};


	/**
	 * Sets the audio source and plays it
	 * @private
	 * @method _createAudio
	 */
	var _createAudio = function()
	{
		AudioContext = (AudioContext || webkitAudioContext);
		_audioCtx = new AudioContext();

		_biquadFilter = _audioCtx.createBiquadFilter();
		_biquadFilter.type = "lowshelf";
		_biquadFilter.frequency.value = 10;
		_biquadFilter.gain.value = 0;

		_audio = _audioCtx.createMediaStreamSource(_stream);

		p.audioPlay();
	};


	/**
	 * Sets the HTML5 video source and plays the video
	 * @private
	 * @method _createVideo
	 */
	var _createVideo = function()
	{
		_videoElm.src = (URL && URL.createObjectURL(_stream)) || _stream;
		_videoElm.muted = 'true';
		_videoElm.autoplay = 'autoplay';
		p.videoPlay();
	};


	/**
	 * Gets an array of all of the available video sources 
	 * @private
	 * @method _getVideoSources
	 * @param cb function to handle request returns 
	 * @callback cb @param {array} all of the available video sources.
	 */
	var _getVideoSources = function(cb)
	{
		if (navigator.mediaDevices.enumerateDevices !== undefined)
		{
			navigator.mediaDevices.enumerateDevices()
				.then(function(devices)
				{
					for (var i = devices.length - 1; i >= 0; i--)
					{
						if (devices[i].kind !== 'videoinput')
						{
							devices.splice(i, 1);
						}
					}

					cb(devices);
				}).catch(function(error)
				{
					cb(false);
				});

		}
		else
		{
			cb(false);
		}
	};


	/**
	 * Pauses the audio stream
	 * @public
	 * @method audioPause
	 */
	p.audioPause = function()
	{
		_audioPlaying = false;
		_audio.context.suspend();
	};


	/**
	 * Plays the audio stream
	 * @public
	 * @method audioPlay
	 */
	p.audioPlay = function()
	{
		_audioPlaying = true;
		_audio.context.resume();
	};


	/**
	 * Pauses the video stream
	 * @public
	 * @method videoPause
	 */
	p.videoPause = function()
	{
		_videoPlaying = false;
		_videoElm.pause();
	};


	/**
	 * Plays the video stream
	 * @public
	 * @method videoPlay
	 */
	p.videoPlay = function()
	{
		_videoPlaying = true;
		_videoElm.play();
	};


	/**
	 * Disconnects the input audio source from the output audio source
	 * @public
	 * @method audioMute
	 */
	p.audioMute = function()
	{
		_audio.disconnect();
		_biquadFilter.disconnect();
	};


	/**
	 * Connects the input audio source up to the output audio source
	 * @public
	 * @method audioUnmute
	 */
	p.audioUnmute = function()
	{
		_audio.connect(_biquadFilter);
		_biquadFilter.connect(_audioCtx.destination);
	};


	/**
	 * When other video sources are available the old video source will be destroyed 
	 * and the next source will be grabbed and returned with the {cb} function
	 * @public
	 * @method getNextVideoSource
	 * @param cb function to handle request returns 
	 * @callback cb @param {Video} HTML5 video element.
	 */
	p.getNextVideoSource = function(cb)
	{
		if (_videoSources.length > 1)
		{
			_sourceIndex++;

			if (_sourceIndex >= _videoSources.length)
			{
				_sourceIndex = 0;
			}

			_options.video = {
				deviceId: _videoSources[_sourceIndex].deviceId ?
				{
					exact: _videoSources[_sourceIndex].deviceId
				} : true
			};

			p.destroy(_stream.getVideoTracks());

			navigator.mediaDevices.getUserMedia(_options)
				.then(function(stream)
				{

					_stream = stream;

					if (_options.video)
					{
						_createVideo();
					}

					_data = {};
					_data.video = _videoElm;

					cb(_data);
				})
				.catch(function(error)
				{
					if (!_data.error)
					{
						_data = {};
						_data.isSupported = true;
						_data.error = error.message;
					}

					cb(_data);
				});
		}
	};


	/**
	 * Destroys tracks 
	 * @public
	 * @method destroy
	 * @default all tracks
	 */
	p.destroy = function(tracks)
	{
		if (!tracks)
		{
			tracks = _stream.getTracks();
		}

		tracks.forEach(function(track)
		{
			track.stop();
		});
	};


	// Assign to namespace
	namespace('springroll').MediaStream = MediaStream;
}(window));