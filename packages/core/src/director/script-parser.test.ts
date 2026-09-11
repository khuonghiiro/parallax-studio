import { describe, it, expect } from 'vitest';
import { parseScreenplay } from './script-parser.js';

describe('script-parser', () => {
  it('parses structured screenplay with bilingual camera keywords', () => {
    const rawScript = `
# Cuộc Phiêu Lưu Kì Thú
1. Toàn cảnh thung lũng xanh tươi, gió thổi nhẹ qua ngọn cỏ [3s].
2. Cận cảnh khuôn mặt Hero, anh mỉm cười tự tin nhìn về phía trước [2s].
3. Hero: "Chúng ta sẽ đi đến cùng trời cuối đất!" [4s]
    `;

    const result = parseScreenplay(rawScript, 24);

    expect(result.title).toBe('Cuộc Phiêu Lưu Kì Thú');
    expect(result.shots.length).toBe(3);

    // Shot 1: Toàn cảnh -> wide, 3s = 72 frames
    expect(result.shots[0]?.cameraAngle).toBe('wide');
    expect(result.shots[0]?.durationFrames).toBe(72);
    expect(result.shots[0]?.startFrame).toBe(0);

    // Shot 2: Cận cảnh -> close-up, mỉm cười -> happy, 2s = 48 frames
    expect(result.shots[1]?.cameraAngle).toBe('close-up');
    expect(result.shots[1]?.emotion).toBe('happy');
    expect(result.shots[1]?.startFrame).toBe(72);
    expect(result.shots[1]?.durationFrames).toBe(48);

    // Shot 3: Hero: "Chúng ta..." -> character Hero, 4s = 96 frames
    expect(result.shots[2]?.characterName).toBe('Hero');
    expect(result.shots[2]?.durationFrames).toBe(96);

    // Total frames = 72 + 48 + 96 = 216
    expect(result.totalFrames).toBe(216);
    expect(result.characterNames).toContain('Hero');
  });

  it('handles fallback for plain paragraph script', () => {
    const plain = 'Một nhân vật đứng suy tư dưới ánh trăng.';
    const result = parseScreenplay(plain);

    expect(result.shots.length).toBe(1);
    expect(result.shots[0]?.emotion).toBe('thinking');
    expect(result.totalFrames).toBeGreaterThan(0);
  });
});
