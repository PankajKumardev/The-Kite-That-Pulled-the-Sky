/* Original score for The Kite That Pulled the Sky. Every sound is synthesized here.
   Render the score once, then seek its stereo buffer alongside the picture. */
(() => {
  'use strict';
  const duration = 60, sampleRate = 32000;
  let context, ready, recording, voice, fader;
  let partSeed = 30572;

  function random() {
    partSeed = (Math.imul(partSeed, 1664525) + 1013904223) >>> 0;
    return partSeed / 4294967296;
  }
  const hz = note => 440 * Math.pow(2, (note - 69) / 12);

  async function compose() {
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ac = new Offline(2, duration * sampleRate, sampleRate);
    partSeed = 30572;
    function gain(value, destination) {
      const node = ac.createGain();
      node.gain.value = value;
      if (destination) node.connect(destination);
      return node;
    }
    function filter(type, frequency, q, destination) {
      const node = ac.createBiquadFilter();
      node.type = type;
      node.frequency.value = frequency;
      node.Q.value = q;
      node.connect(destination);
      return node;
    }
    function pan(position, destination) {
      const node = ac.createStereoPanner();
      node.pan.value = position;
      node.connect(destination);
      return node;
    }
    function curve(parameter, points) {
      parameter.setValueAtTime(points[0][1], points[0][0]);
      for (const [time, value] of points.slice(1)) parameter.linearRampToValueAtTime(value, time);
    }
    function tone(frequency, wave, detune, destination, start, end) {
      const node = ac.createOscillator();
      if (typeof wave === 'string') node.type = wave;
      else node.setPeriodicWave(wave);
      node.frequency.value = frequency;
      node.detune.value = detune;
      node.connect(destination);
      node.start(start);
      node.stop(Math.min(duration, end));
      return node;
    }

    const master = gain(.98, ac.destination);
    master.gain.setValueAtTime(.98, 56.5);
    master.gain.linearRampToValueAtTime(0, 59.98);
    const music = gain(.88, master);
    const room = ac.createConvolver();
    const irLength = Math.ceil(1.85 * sampleRate);
    const impulse = ac.createBuffer(2, irLength, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const out = impulse.getChannelData(channel);
      let soft = 0;
      for (let i = 550; i < out.length; i++) {
        const white = random() * 2 - 1;
        soft = .7 * soft + .3 * white;
        out[i] = (.84 * soft + .16 * white) * Math.exp(-4.1 * i / sampleRate);
      }
    }
    room.buffer = impulse;
    room.connect(gain(.19, music));
    const keysBus = gain(1, music);
    keysBus.connect(room);
    const orchestraBus = gain(.84, music);
    orchestraBus.connect(room);
    const noiseBank = ac.createBuffer(2, Math.round(sampleRate * 9.731), sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = noiseBank.getChannelData(c);
      for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
    }
    function noise(destination, start, end) {
      const src = ac.createBufferSource();
      src.buffer = noiseBank;
      src.loop = true;
      src.connect(destination);
      src.start(start, random() * 7.9);
      src.stop(Math.min(end, duration));
    }

    // Three slightly different courses under a felt hammer. Higher modes damp first.
    function key(time, midi, held, velocity, harp = false) {
      const frequency = hz(midi);
      const weight = velocity / 55;
      const destination = pan(Math.max(-.42, Math.min(.38, (midi - 59) / 60)), keysBus);
      const modes = harp ? [1, .49, .31, .17, .13, .09] : [1, .43, .24, .115, .055, .039, .022];
      for (let j = 0; j < modes.length + 2; j++) {
        const double = j >= modes.length;
        const harmonic = double ? j - modes.length + 1 : j + 1;
        const pitch = frequency * harmonic * Math.sqrt(1 + .000058 * harmonic * harmonic);
        if (pitch > sampleRate * .45) continue;
        const envelope = gain(0, destination);
        const amplitude = .131 * weight * weight * modes[harmonic - 1] * (double ? .22 : 1);
        const attack = (harp ? .0023 : .0055) + .0027 / harmonic;
        const decayRate = (.88 + harmonic * .33) * (1 + (midi - 59) * .009) * (harp ? 1.18 : 1);
        const decay = Math.max(attack + .015, held);
        const release = harp ? .62 : .48;
        envelope.gain.setValueAtTime(0, time);
        envelope.gain.linearRampToValueAtTime(amplitude, time + attack);
        envelope.gain.exponentialRampToValueAtTime(Math.max(.000001,amplitude * Math.exp(-decay * decayRate)),time + decay);
        envelope.gain.exponentialRampToValueAtTime(.000001,time + decay + release);
        tone(pitch, 'sine', double ? (j % 2 ? -2.7 : 2.1) : -.25, envelope, time, time + decay + release);
      }
      // The felt contact is a short, quiet wooden breath, well below the pitched attack.
      const hammer = gain(0, destination);
      curve(hammer.gain, [[time,0],[time+.002,.009*weight],[time+.033,0]]);
      noise(filter('bandpass',frequency*2.7,.58,hammer),time,time+.036);
    }

    // A bowed spectrum with stable fundamentals and moving upper partials.
    const harmonics = [0,1,.54,.34,.21,.24,.12,.075,.095,.038,.064,.026,.029,.022];
    const bowed = ac.createPeriodicWave(new Float32Array(harmonics.length),Float32Array.from(harmonics));
    const hollow = ac.createPeriodicWave(new Float32Array(6),Float32Array.from([0,1,.069,.12,.025,.024]));
    function sustain(time, midi, length, level, kind, position) {
      const flute = kind === 'flute', cello = kind === 'cello';
      const end = time + length;
      const attack = Math.min(length * .27, flute ? .22 : .66);
      const release = flute ? .33 : .54;
      const env = gain(0,pan(position,orchestraBus));
      curve(env.gain,[[time,0],[time+attack,level*.84],[time+length*.66,level],[end,level*.78],[end+release,0]]);
      const body = filter('lowpass', flute ? 4300 : cello ? 1400 : 2350,.55,env);
      const drift = ac.createOscillator();
      drift.frequency.value = (flute ? 4.6 : 4.25) + random() * .85;
      const bend = gain(flute ? 5.5 : 4.3);
      drift.connect(bend);
      drift.start(time);
      drift.stop(Math.min(duration,end+release));
      const detunes = flute || cello ? [0] : [-4.3,3.7];
      for (const cents of detunes) {
        const osc = tone(hz(midi),flute ? hollow : bowed,cents,body,time,end+release);
        bend.connect(osc.detune);
      }
      if (flute) noise(filter('bandpass',1900,1.1,gain(.11,env)),time,end+release);
    }

    // A rising A–C–E returns as A–C#–E when the sky opens.
    const melody = [
      [.82,57,3.6,44],[1.77,64,3.1,41],[3.08,69,3.1,55],[4.17,72,2.95,50],[5.08,76,2.05,55],
      [6.42,74,2.92,46],[8.32,65,2.75,47],[9.74,69,2.35,51],[10.88,72,1.8,49],[12.04,70,1.94,51],
      [13.43,67,1.2,53],[14.50,69,.72,48],[15.35,70,1.65,55],[16.95,74,2.43,55],[18.95,69,1.23,49],
      [20.19,71,1.49,47],[21.49,76,2.13,57],[23.93,77,1.79,58],[25.53,76,1.21,52],[26.72,74,2.23,54],
      [28.91,70,1.47,51],[30.87,69,2.02,53],[33.06,69,2.26,54],[34.76,73,2.47,57],[36.67,76,1.57,61],
      [38.11,78,2.43,66],[40.55,81,2.71,66],[42.90,78,2.64,57],[45.21,76,2.31,54],[47.49,71,1.4,48],
      [48.75,74,1.84,52],[50.64,73,1.94,47],[53.21,69,2.47,46],[54.98,71,1.52,43],[56.43,69,2.98,45]
    ];
    melody.forEach(note => key(...note));
    const harmony = [
      [.25,6.85,38,[53,57,64,65],[50,57,60,64]],
      [7.12,5.70,34,[53,57,62,65],[46,53,57,62]],
      [13.02,4.47,43,[50,57,58,65],[46,53,58,62]],
      [17.54,4.42,45,[52,57,62,67],[45,52,59,62]],
      [22.10,4.45,34,[53,57,60,65],[46,53,57,62]],
      [26.61,3.16,43,[50,57,58,65],[46,53,58,62]],
      [29.86,2.93,45,[52,57,62,67],[45,52,57,62]],
      [32.90,2.62,45,[52,57,61,64],[45,52,55,61]],
      [35.60,4.31,38,[54,57,61,64],[50,57,61,66]],
      [39.99,4.96,43,[54,59,62,69],[50,55,59,66]],
      [45.00,3.36,47,[54,57,62,66],[47,54,62,66]],
      [48.42,2.85,43,[54,57,59,62],[50,55,59,62]],
      [51.39,1.64,45,[52,59,62,64],[45,52,59,62]],
      [53.19,5.61,38,[54,57,64,69],[50,57,62,66]]
    ];
    for (const [t,d,bass,arp,pad] of harmony) {
      const pull = t>22 && t<45;
      key(t,bass,Math.min(3.5,d),pull ? 49 : 45);
      if (t>7 && t<53) {
        for (const [off,idx] of [[.43,0],[.94,1],[1.68,2],[2.43,1],[3.24,3],[3.97,1],[4.48,2]]) {
          if (off < d-.29) key(t+off+(random()-.5)*.05,arp[idx],Math.min(d-off+.12,1.12),30+random()*8+(pull ? 3:0));
        }
      }
      if (t>=7) {
        const dynamic = t<22 ? .012 : t<32 ? .020 : t<45 ? .034 : t<53 ? .019 : .010;
        pad.forEach((note,i) => sustain(t+.06+i*.047,note,d-.27,dynamic*[.75,.69,.75,1][i],'strings',[-.42,-.2,.14,.36][i]));
      }
      if (t>12) sustain(t+.06,bass,d-.24,pull ? .062 : .040,'cello',-.23);
    }
    for (const [t,n,d,a] of [[33.62,64,1.45,.023],[35.54,66,1.82,.039],[37.52,69,1.92,.047],[39.74,71,2,.050],[42,74,1.38,.053],[43.43,73,1.51,.045],[45.33,71,1.51,.039],[47.05,69,1.09,.034],[48.82,67,1.33,.030],[51.35,64,1.35,.027],[53.41,66,2.77,.029]]) {
      sustain(t,n,d,a,'flute',.27);
    }
    for (const [t,notes] of [[35.54,[45,50,54,57,61,64,69]],[40.01,[43,50,54,59,62,66,69]]]) {
      notes.forEach((n,i) => key(t+i*.137+(random()-.5)*.012,n,2.0,38-i*.35,true));
    }

    // Wind has separate low pressure and fine grass bands, sharing the storm's envelope.
    const air = gain(0,master);
    curve(air.gain,[[0,0],[1,.26],[6,.37],[7.8,.68],[11.4,.45],[15.8,.65],[19,.45],[23,.69],
      [26,.94],[29.8,.67],[32.6,.92],[36,.49],[39,.29],[45,.17],[53,.20],[58,.11],[59.85,0]]);
    const lowWind = filter('bandpass',265,.6,gain(.54,air));
    curve(lowWind.frequency,[[0,185],[7,312],[12,222],[19,380],[26.6,490],[32.3,345],[42,195],[60,165]]);
    noise(lowWind,0,60);
    const grass = filter('bandpass',2300,.62,gain(.104,air));
    noise(grass,0,60);
    const cloud = gain(0,master);
    curve(cloud.gain,[[21.9,0],[24.7,.25],[27.4,.34],[30.3,.12],[31.8,.21],[34.7,0]]);
    noise(filter('bandpass',74,1.6,cloud),21.9,34.8);
    // Close cloth flutters are spatially discrete, under the hands and scarf.
    for (const [t,d,p] of [[7.59,.37,-.28],[8.12,.16,-.07],[10.74,.52,.23],[13.56,.3,.13],[15.38,.21,.19],[23.45,.64,-.17]]) {
      const cuff = gain(0,pan(p,air));
      for (let i=0; i<5; i++) {
        const a=t+i*d/5, step=d/5;
        curve(cuff.gain,[[a,0],[a+step*.23,.14*(1-i*.14)],[a+step*.89,0]]);
      }
      noise(filter('bandpass',1450,1.2,cuff),t,t+d);
    }
    // Small, distant larks return after the storm.
    for (const [t,p] of [[46.8,-.52],[48.0,.48],[52.4,-.34],[54.74,.58]]) {
      for (let j=0;j<2;j++) {
        const a=t+j*.27, voice=gain(0,pan(p,master));
        curve(voice.gain,[[a,0],[a+.045,.007-j*.001],[a+.14,.005],[a+.22,0]]);
        const bird=tone(2180,'sine',0,voice,a,a+.23);
        curve(bird.frequency,[[a,2060+j*135],[a+.095,2760+j*190],[a+.22,2340+j*100]]);
      }
    }

    const rendered = await ac.startRendering();
    // Deterministic stereo master: set headroom without changing the score's dynamics.
    let peak = 0;
    for (let channel=0;channel<2;channel++) {
      const data=rendered.getChannelData(channel);
      for (let i=0;i<data.length;i++) peak=Math.max(peak,Math.abs(data[i]));
    }
    const trim=Math.min(2.15,.81/Math.max(.001,peak));
    for (let channel=0;channel<2;channel++) {
      const data=rendered.getChannelData(channel);
      for (let i=0;i<data.length;i++) data[i]*=trim;
    }
    return rendered;
  }

  // May be called as soon as the picture is ready, even before a sound gesture.
  function prepare() {
    if (!ready) ready=compose().then(buffer => {recording=buffer;}).catch(error => {ready=null;throw error;});
    return ready;
  }

  async function load() {
    const Live=window.AudioContext || window.webkitAudioContext;
    if (!context) context=new Live({latencyHint:'playback'});
    // Resume inside the initiating user gesture, before waiting for offline synthesis.
    const resumed=context.state==='running' ? Promise.resolve() : context.resume();
    await Promise.all([resumed,prepare()]);
  }

  function stop() {
    if (!voice) return;
    const old=voice, ramp=fader, now=context.currentTime;
    voice=null;
    fader=null;
    ramp.gain.cancelScheduledValues(now);
    ramp.gain.setTargetAtTime(0,now,.003);
    try {old.stop(now+.018);} catch (_) { /* Source already ended. */ }
  }

  function play(seconds=0) {
    stop();
    const t=Math.max(0,Number(seconds)||0);
    if (!recording || !context || t>=duration) return;
    const source=context.createBufferSource();
    const ramp=context.createGain();
    const now=context.currentTime;
    source.buffer=recording;
    source.connect(ramp);
    ramp.connect(context.destination);
    ramp.gain.setValueAtTime(0,now);
    ramp.gain.linearRampToValueAtTime(1,now+.012);
    source.onended=() => {
      source.disconnect();
      ramp.disconnect();
      if (voice===source) {voice=null;fader=null;}
    };
    voice=source;
    fader=ramp;
    source.start(now,t);
  }
  window.Score=Object.freeze({prepare,load,play,stop});
})();
