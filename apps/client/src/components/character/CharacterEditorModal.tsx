import { useState, useRef, useEffect } from 'react';
import { DEFAULT_APPEARANCE } from '@metaverse/shared';
import type { CharacterAppearance, Gender } from '@metaverse/shared';
import * as api from '../../services/api.js';
import { renderCharacterToCanvas } from '../../game/entities/CharacterRenderer.js';

const SKIN_COLORS = ['#FFDBB5', '#F5C5A3', '#D4A574', '#C68B59', '#8D5524'];
const HAIR_COLORS = ['#2C1B0E', '#8B4513', '#D2691E', '#FFD700', '#FF6347', '#FF69B4', '#9370DB', '#87CEEB'];
const OUTFIT_COLORS = ['#FF8FA3', '#89CFF0', '#98DFAF', '#E8DEF8', '#FFE082', '#FF6B35', '#5D4037', '#2E4057'];
const HAIR_STYLES = 12;
const EYE_STYLES = 8;
const NOSE_STYLES = 4;
const MOUTH_STYLES = 6;
const OUTFIT_STYLES = 10;

type Tab = 'gender' | 'hair' | 'face' | 'body' | 'outfit';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CharacterEditorModal({ isOpen, onClose }: Props) {
  const [gender, setGender] = useState<Gender>('female');
  const [appearance, setAppearance] = useState<CharacterAppearance>(DEFAULT_APPEARANCE);
  const [activeTab, setActiveTab] = useState<Tab>('gender');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);

  // 현재 캐릭터 데이터 로드
  useEffect(() => {
    if (!isOpen) {
      setLoaded(false);
      return;
    }
    api.getCharacter().then((char) => {
      if (char) {
        setGender(char.gender as Gender);
        setAppearance(char.appearance as CharacterAppearance);
      }
      setLoaded(true);
    });
  }, [isOpen]);

  // 프리뷰 렌더링
  useEffect(() => {
    if (!loaded) return;
    const canvas = renderCharacterToCanvas(gender, appearance);
    const preview = previewRef.current;
    if (preview) {
      const ctx = preview.getContext('2d')!;
      ctx.clearRect(0, 0, preview.width, preview.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(canvas, 0, 0, 48, 64, 0, 0, preview.width, preview.height);
    }
  }, [gender, appearance, loaded]);

  if (!isOpen) return null;

  const update = (patch: Partial<CharacterAppearance>) => {
    setAppearance((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateCharacter(gender, appearance);
      // Phaser 씬에서 스프라이트 갱신을 위해 커스텀 이벤트 발행
      window.dispatchEvent(new CustomEvent('character:updated'));
      onClose();
    } catch {
      alert('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'gender', label: '성별' },
    { key: 'hair', label: '머리' },
    { key: 'face', label: '얼굴' },
    { key: 'body', label: '체형' },
    { key: 'outfit', label: '의상' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-cy-lg shadow-cy-lg p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-cy-brown">🌰 미니미 꾸미기</h2>
          <button onClick={onClose} className="text-cy-warm-gray hover:text-cy-brown text-xl">×</button>
        </div>

        {!loaded ? (
          <p className="text-center text-cy-warm-gray py-8">로딩 중...</p>
        ) : (
          <div className="flex gap-4 flex-col md:flex-row">
            {/* Preview */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center">
              <div
                className="rounded-cy-lg border-4 border-dashed border-cy-coral/40 flex items-center justify-center p-3"
                style={{ backgroundColor: '#FFF0F5' }}
              >
                <canvas
                  ref={previewRef}
                  width={120}
                  height={160}
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <p className="text-xs text-cy-warm-gray mt-2">미리보기</p>
            </div>

            {/* Options */}
            <div className="flex-1">
              {/* Tabs */}
              <div className="flex gap-1 mb-3 flex-wrap">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activeTab === tab.key
                        ? 'bg-cy-coral text-white shadow-cy'
                        : 'bg-cy-pink text-cy-brown hover:bg-cy-coral/20'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-[160px]">
                {activeTab === 'gender' && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-cy-brown">성별을 선택하세요</p>
                    <div className="flex gap-2">
                      {(['male', 'female'] as Gender[]).map((g) => (
                        <button
                          key={g}
                          onClick={() => setGender(g)}
                          className={`flex-1 py-3 rounded-cy text-sm font-medium transition-all ${
                            gender === g
                              ? 'bg-cy-coral text-white shadow-cy scale-105'
                              : 'bg-cy-pink text-cy-brown hover:scale-102'
                          }`}
                        >
                          {g === 'male' ? '🧑 남성' : '👩 여성'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'hair' && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-cy-brown mb-1">헤어스타일</p>
                      <div className="grid grid-cols-6 gap-1.5">
                        {Array.from({ length: HAIR_STYLES }, (_, i) => i + 1).map((style) => (
                          <button
                            key={style}
                            onClick={() => update({ hair: { ...appearance.hair, style } })}
                            className={`w-8 h-8 rounded-full text-xs font-medium ${
                              appearance.hair.style === style
                                ? 'bg-cy-coral text-white shadow-cy'
                                : 'bg-cy-cream text-cy-brown hover:bg-cy-coral/20'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-cy-brown mb-1">머리 색상</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {HAIR_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => update({ hair: { ...appearance.hair, color } })}
                            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                              appearance.hair.color === color ? 'border-cy-orange scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'face' && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-cy-brown mb-1">눈 스타일</p>
                      <div className="grid grid-cols-8 gap-1.5">
                        {Array.from({ length: EYE_STYLES }, (_, i) => i + 1).map((style) => (
                          <button
                            key={style}
                            onClick={() => update({ eyes: { ...appearance.eyes, style } })}
                            className={`w-8 h-8 rounded-full text-xs ${
                              appearance.eyes.style === style
                                ? 'bg-cy-blue text-white shadow-cy'
                                : 'bg-cy-cream text-cy-brown hover:bg-cy-blue/20'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-cy-brown mb-1">코 스타일</p>
                      <div className="flex gap-1.5">
                        {Array.from({ length: NOSE_STYLES }, (_, i) => i + 1).map((style) => (
                          <button
                            key={style}
                            onClick={() => update({ nose: { style } })}
                            className={`w-8 h-8 rounded-full text-xs ${
                              appearance.nose.style === style
                                ? 'bg-cy-mint text-cy-brown shadow-cy'
                                : 'bg-cy-cream text-cy-brown hover:bg-cy-mint/20'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-cy-brown mb-1">입 스타일</p>
                      <div className="flex gap-1.5">
                        {Array.from({ length: MOUTH_STYLES }, (_, i) => i + 1).map((style) => (
                          <button
                            key={style}
                            onClick={() => update({ mouth: { style } })}
                            className={`w-8 h-8 rounded-full text-xs ${
                              appearance.mouth.style === style
                                ? 'bg-cy-coral text-white shadow-cy'
                                : 'bg-cy-cream text-cy-brown hover:bg-cy-coral/20'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'body' && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-cy-brown mb-1">피부 색상</p>
                    <div className="flex gap-2">
                      {SKIN_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => update({ body: { ...appearance.body, skinColor: color } })}
                          className={`w-9 h-9 rounded-full border-3 transition-transform hover:scale-110 ${
                            appearance.body.skinColor === color ? 'border-cy-orange scale-110 shadow-cy' : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'outfit' && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-cy-brown mb-1">의상 스타일</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {Array.from({ length: OUTFIT_STYLES }, (_, i) => i + 1).map((style) => (
                          <button
                            key={style}
                            onClick={() => update({ outfit: { ...appearance.outfit, style } })}
                            className={`py-1.5 rounded-cy text-xs ${
                              appearance.outfit.style === style
                                ? 'bg-cy-lavender text-cy-brown shadow-cy'
                                : 'bg-cy-cream text-cy-brown hover:bg-cy-lavender/30'
                            }`}
                          >
                            #{style}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-cy-brown mb-1">의상 색상</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {OUTFIT_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => update({ outfit: { ...appearance.outfit, color } })}
                            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                              appearance.outfit.color === color ? 'border-cy-orange scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-cy-primary w-full mt-4 text-sm disabled:opacity-50"
              >
                {saving ? '저장 중...' : '🌰 저장하기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
