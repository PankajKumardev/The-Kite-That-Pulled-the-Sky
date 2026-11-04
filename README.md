# The Kite That Pulled the Sky

An original, interactive animated short film that runs entirely in the browser. A child flies a handmade kite through a storm; the wind pulls the clouds apart and reveals the sunrise.

The film is drawn procedurally with the Canvas API and accompanied by an original soundtrack synthesized with the Web Audio API. It has no external assets, frameworks, or build step.

## Run locally

Serve the project directory with any static web server, then open the displayed local URL in a modern browser:

```sh
python3 -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000). Opening `index.html` directly may work, but a local server is recommended for consistent browser behavior.

## Controls

| Action | Control |
| --- | --- |
| Play / pause | `Space` or `K` |
| Toggle sound | `M` |
| Replay | `R` |
| Toggle fullscreen | `F` |
| Seek | Left / right arrow keys, `Home`, or `End` |

You can also use the on-screen playback controls and timeline. The soundtrack starts muted so the browser can respect its audio-playback policy.

## Project structure

```text
index.html        Film player markup and script loading
player.css        Responsive theater and playback-control styling
js/
  clouds.js       Procedural sky and cloud painting
  land.js         Landscape and meadow scenes
  character.js    Child character drawing and animation
  kite.js         Kite, tail, and string animation
  score.js        Synthesized Web Audio soundtrack
  film.js         Scene timing, camera work, and composition
  player.js       Playback, seeking, keyboard, audio, and fullscreen controls
```

## Browser support

Use a current Chrome, Edge, Safari, or Firefox release with JavaScript and Canvas enabled. Sound playback requires Web Audio support; fullscreen availability varies by browser and embedding context.
