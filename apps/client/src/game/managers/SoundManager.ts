/**
 * 싸이월드 감성 사운드 매니저
 * Web Audio API로 프로그래매틱 사운드 생성 (파일 불필요)
 */

let audioCtx: AudioContext | null = null;
let bgmGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let bgmOscillators: OscillatorNode[] = [];
let bgmPlaying = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0.15;
    bgmGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.3;
    sfxGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Simple note player
function playNote(freq: number, duration: number, type: OscillatorType = 'sine', gainNode?: GainNode, delay = 0) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const env = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  env.gain.setValueAtTime(0, ctx.currentTime + delay);
  env.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.02);
  env.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);

  osc.connect(env);
  env.connect(gainNode || sfxGain || ctx.destination);

  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);

  return osc;
}

// 클릭 효과음 (뽁)
export function playSfxClick() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const env = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

  env.gain.setValueAtTime(0.2, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  osc.connect(env);
  env.connect(sfxGain || ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

// 채팅 알림음 (띵)
export function playSfxChat() {
  playNote(880, 0.15, 'sine');
  playNote(1100, 0.1, 'sine', undefined, 0.05);
}

// 레벨업 효과음 (짜잔~반짝)
export function playSfxLevelUp() {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    playNote(freq, 0.3, 'triangle', undefined, i * 0.12);
  });
}

// 퀘스트 완료 (따따딴~)
export function playSfxQuestComplete() {
  playNote(440, 0.15, 'square');
  playNote(554.37, 0.15, 'square', undefined, 0.15);
  playNote(659.25, 0.3, 'square', undefined, 0.3);
}

// 층 이동 (슈웅~)
export function playSfxFloorChange() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const env = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.3);

  env.gain.setValueAtTime(0.15, ctx.currentTime);
  env.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

  osc.connect(env);
  env.connect(sfxGain || ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

// BGM - 뮤직박스풍 멜로디 (반복 재생)
export function startBgm() {
  if (bgmPlaying) return;
  bgmPlaying = true;

  const melody = [
    // C major music box melody
    { note: 523.25, dur: 0.3 }, // C5
    { note: 587.33, dur: 0.3 }, // D5
    { note: 659.25, dur: 0.3 }, // E5
    { note: 523.25, dur: 0.3 }, // C5
    { note: 659.25, dur: 0.3 }, // E5
    { note: 587.33, dur: 0.3 }, // D5
    { note: 783.99, dur: 0.6 }, // G5
    { note: 0, dur: 0.3 },      // rest
    { note: 659.25, dur: 0.3 }, // E5
    { note: 698.46, dur: 0.3 }, // F5
    { note: 783.99, dur: 0.3 }, // G5
    { note: 659.25, dur: 0.3 }, // E5
    { note: 783.99, dur: 0.3 }, // G5
    { note: 880.00, dur: 0.3 }, // A5
    { note: 783.99, dur: 0.6 }, // G5
    { note: 0, dur: 0.6 },      // rest
  ];

  function playMelody() {
    if (!bgmPlaying) return;
    const ctx = getAudioContext();
    let time = 0;

    melody.forEach(({ note, dur }) => {
      if (note > 0) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = note;

        // Music box timbre: quick attack, gentle decay
        env.gain.setValueAtTime(0, ctx.currentTime + time);
        env.gain.linearRampToValueAtTime(0.12, ctx.currentTime + time + 0.01);
        env.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + dur);

        osc.connect(env);
        env.connect(bgmGain || ctx.destination);
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + dur);
        bgmOscillators.push(osc);
      }
      time += dur;
    });

    // Loop
    setTimeout(playMelody, time * 1000);
  }

  playMelody();
}

export function stopBgm() {
  bgmPlaying = false;
  bgmOscillators.forEach(osc => {
    try { osc.stop(); } catch {}
  });
  bgmOscillators = [];
}

export function setBgmVolume(vol: number) {
  if (bgmGain) bgmGain.gain.value = Math.max(0, Math.min(1, vol));
}

export function setSfxVolume(vol: number) {
  if (sfxGain) sfxGain.gain.value = Math.max(0, Math.min(1, vol));
}
