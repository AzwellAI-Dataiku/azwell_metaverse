import { useState } from 'react';
import { startBgm, stopBgm, setBgmVolume, setSfxVolume, playSfxClick } from '../../game/managers/SoundManager.js';

export default function SoundSettings() {
  const [bgmOn, setBgmOn] = useState(false);
  const [bgmVol, setBgmVol] = useState(15);
  const [sfxVol, setSfxVol] = useState(30);
  const [isOpen, setIsOpen] = useState(false);

  const toggleBgm = () => {
    if (bgmOn) {
      stopBgm();
    } else {
      startBgm();
    }
    setBgmOn(!bgmOn);
  };

  return (
    <div>
      <button
        onClick={() => { setIsOpen(!isOpen); playSfxClick(); }}
        className="w-full px-3 py-1.5 rounded-full bg-white/80 text-cy-warm-gray text-xs hover:bg-white"
      >
        {isOpen ? '🔊 닫기' : '🔊 사운드'}
      </button>
      {isOpen && (
        <div className="mt-2 p-3 rounded-cy bg-white/90 shadow-cy space-y-2">
          <button
            onClick={toggleBgm}
            className={`w-full px-2 py-1 rounded-full text-xs ${bgmOn ? 'bg-cy-coral text-white' : 'bg-gray-100 text-cy-brown'}`}
          >
            {bgmOn ? '🎵 BGM ON' : '🎵 BGM OFF'}
          </button>
          <div className="flex items-center gap-2 text-xs text-cy-brown">
            <span>BGM</span>
            <input
              type="range"
              min="0"
              max="100"
              value={bgmVol}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setBgmVol(v);
                setBgmVolume(v / 100);
              }}
              className="flex-1 h-1 accent-cy-coral"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-cy-brown">
            <span>SFX</span>
            <input
              type="range"
              min="0"
              max="100"
              value={sfxVol}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setSfxVol(v);
                setSfxVolume(v / 100);
              }}
              className="flex-1 h-1 accent-cy-coral"
            />
          </div>
        </div>
      )}
    </div>
  );
}
