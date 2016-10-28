# Local Area MP3 Player

Server that plays music, controlled from Firefox by FlyWeb

How to start:

```
sudo apt-get install libavahi-compat-libdnssd-dev libasound2-dev ffmpeg;
npm install;
npm start;
```

Then connect via FlyWeb. There should be no installation errors.

## On a Raspberry Pi

If errors occur on startup due to a missing `binding.js` file, try running the following commands in order. Installation appears not to be idempotent.

```
npm install bindings;
npm install speaker;
npm install lame;
npm install youtube-dl;
```
