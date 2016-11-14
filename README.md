MediaStream is a plugin for [SpringRoll](http://github.com/SpringRoll/SpringRoll). It is designed to make working with webcams and microphones easier. MediaStream includes capabilities for creating webcam and microphone streams, playing, pausing and muting said streams, and switching webcam inputs.

##Installation

MediaStream can be installed using Bower.

```bash
bower install springroll-mediastream
```

##Examples

To test the examples, run the grunt task `examples`. This will download any dependencies and automatically launch the examples in your browser.

```bash
grunt examples
```

##Usage

Include mediastream.min.js in your libraries js or html, after SpringRoll's core.min.js.

```javascript
var MediaStream = include('springroll.MediaStream');

var options = {};
options.video = true;
options.audio = true;

var stream = new MediaStream(options);

stream.onLoad = function(data) 
{
	if (data.error) 
	{
		console.log(data.error);
		return;
	}

	var video = new Bitmap(data.video)

	display.stage.addChild(video);
	display.stage.update();
}

```
