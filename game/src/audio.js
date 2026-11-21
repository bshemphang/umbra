// Umbra — sound. Everything is synthesised live with WebAudio: no audio
// files, no network. A low night drone under the game, soft footfalls that
// quicken when Wren runs, a rising sting when a guard grows suspicious, a
// chime for seals and the Codex, and a short motif for winning or being caught.

Umbra.Sound = (function () {
  var ctx = null;
  var master = null;
  var droneNodes = null;
  var muted = false;
  var stepFlip = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    startDrone();
    return true;
  }

  // Two detuned low oscillators through a slow-breathing lowpass: the room tone.
  function startDrone() {
    var gain = ctx.createGain();
    gain.gain.value = 0.05;
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    var o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 55;
    var o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 55.7;
    var o3 = ctx.createOscillator();
    o3.type = 'triangle';
    o3.frequency.value = 110.3;
    var g3 = ctx.createGain();
    g3.gain.value = 0.25;
    o1.connect(filter);
    o2.connect(filter);
    o3.connect(g3);
    g3.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    o1.start();
    o2.start();
    o3.start();
    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    droneNodes = { gain: gain };
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (when || 0);
    var osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, freq) {
    if (!ctx) return;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq || 900;
    var g = ctx.createGain();
    g.gain.value = vol || 0.12;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start();
  }

  return {
    unlock: function () { ensure(); },
    toggleMute: function () {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted: function () { return muted; },

    // A footfall: a soft filtered thud, alternate feet, louder when running.
    step: function (running) {
      if (!ctx) return;
      stepFlip = !stepFlip;
      noiseBurst(0.07, running ? 0.16 : 0.07, stepFlip ? 700 : 520);
    },

    // A pebble ticks against stone, then a faint ring.
    pebble: function () {
      if (!ctx) return;
      noiseBurst(0.05, 0.2, 2400);
      tone(1900, 0.35, 'sine', 0.05, 0.06, 1200);
    },

    // A seal or the Codex: a small rising chime.
    pickup: function (big) {
      if (!ctx) return;
      tone(660, 0.25, 'sine', 0.14);
      tone(990, 0.3, 'sine', 0.12, 0.07);
      if (big) {
        tone(1320, 0.55, 'sine', 0.14, 0.14);
        tone(440, 0.7, 'triangle', 0.08, 0.14);
      }
    },

    // Suspicion rising: two close notes that climb as the meter fills.
    suspicious: function (level) {
      if (!ctx) return;
      var base = 300 + level * 260;
      tone(base, 0.16, 'triangle', 0.1);
      tone(base * 1.12, 0.2, 'triangle', 0.1, 0.09);
    },

    // Full alarm: a sharp three-note sting.
    alarm: function () {
      if (!ctx) return;
      tone(220, 0.22, 'sawtooth', 0.1);
      tone(311, 0.22, 'sawtooth', 0.1, 0.12);
      tone(440, 0.4, 'sawtooth', 0.12, 0.24);
    },

    // A guard giving up the search: a falling sigh.
    calmDown: function () {
      if (!ctx) return;
      tone(392, 0.3, 'sine', 0.07, 0, 262);
    },

    // Caught: a low dissonant thud.
    caught: function () {
      if (!ctx) return;
      tone(98, 0.7, 'sawtooth', 0.16, 0, 55);
      tone(104, 0.7, 'sawtooth', 0.12, 0.05, 58);
      noiseBurst(0.25, 0.2, 300);
    },

    // Level done: a short rising motif in a minor key.
    levelClear: function () {
      if (!ctx) return;
      [523, 622, 784, 1046].forEach(function (f, i) {
        tone(f, 0.4, 'sine', 0.12, i * 0.11);
      });
    },

    // The whole job done: the Umbra motif.
    win: function () {
      if (!ctx) return;
      [392, 494, 587, 784, 988, 1175].forEach(function (f, i) {
        tone(f, 0.6, 'sine', 0.12, i * 0.13);
      });
    },

    // The exit door unbars.
    unbar: function () {
      if (!ctx) return;
      tone(180, 0.4, 'triangle', 0.1, 0, 90);
      tone(720, 0.5, 'sine', 0.1, 0.15);
    },
  };
})();
