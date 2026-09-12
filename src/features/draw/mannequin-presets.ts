/**
 * Mannequin Base Presets for 2D Animation & Character Design.
 * Provides anatomical proportional bases (T-Pose & A-Pose)
 * to guide artist sketching and AI part generation.
 */

export type MannequinPresetId = 'hero-male' | 'female-anime' | 'chibi' | 'creature';
export type MannequinPose = 'a-pose' | 't-pose';

export interface MannequinOptions {
  pose?: MannequinPose;
  color?: string;
  showJoints?: boolean;
  alpha?: number;
}

export interface MannequinPresetMeta {
  id: MannequinPresetId;
  name: string;
  description: string;
  headRatio: string;
  category: 'humanoid' | 'stylized' | 'creature';
}

export const MANNEQUIN_PRESETS: MannequinPresetMeta[] = [
  {
    id: 'hero-male',
    name: 'Nam Anh Hùng (Heroic Male)',
    description: 'Dáng chuẩn 7.5 đầu, vai rộng nở, cơ bắp thể thao, tối ưu cho hiệp sĩ, chiến binh, anh hùng.',
    headRatio: '7.5 Đầu',
    category: 'humanoid',
  },
  {
    id: 'female-anime',
    name: 'Nữ Anime (Female Stylized)',
    description: 'Dáng chuẩn 7.0 đầu, thanh mảnh, vai hẹp, eo thon, đường nét cong mượt mà cho nhân vật nữ.',
    headRatio: '7.0 Đầu',
    category: 'humanoid',
  },
  {
    id: 'chibi',
    name: 'Anime Chibi (Cute Mascot)',
    description: 'Dáng Chibi 2.8 đầu, đầu tròn to, thân ngắn, tay chân bụ bẫm tròn trịa phong cách game/chibi.',
    headRatio: '2.8 Đầu',
    category: 'stylized',
  },
  {
    id: 'creature',
    name: 'Quái Thú 4 Chân (Creature / Beast)',
    description: 'Sinh vật 4 chân với sống lưng ngang, khớp gối sau ngược, đầu thú và đuôi cân bằng.',
    headRatio: 'Thú 4 Chân',
    category: 'creature',
  },
];

/**
 * Draw a rounded capsule between two points (limb bone segment)
 */
function drawCapsule(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;

  const angle = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.arc(dist, 0, radius * 0.85, (Math.PI * 3) / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a joint indicator circle
 */
function drawJoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  jointColor = '#818cf8',
): void {
  ctx.save();
  ctx.fillStyle = jointColor;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Mini crosshair inside joint
  ctx.beginPath();
  ctx.moveTo(x - radius * 0.5, y);
  ctx.lineTo(x + radius * 0.5, y);
  ctx.moveTo(x, y - radius * 0.5);
  ctx.lineTo(x, y + radius * 0.5);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/**
 * Render Heroic Male Mannequin
 */
function renderHeroMale(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  opts: MannequinOptions,
): void {
  const isTPose = opts.pose === 't-pose';

  // 1. Torso & Pelvis
  ctx.beginPath();
  ctx.roundRect(cx - 56, cy - 110, 112, 85, 14); // Chest / Ribcage
  ctx.roundRect(cx - 42, cy - 28, 84, 50, 10); // Waist & Abdomen
  ctx.roundRect(cx - 48, cy + 20, 96, 42, 12); // Pelvis
  ctx.fill();
  ctx.stroke();

  // 2. Head & Neck
  ctx.beginPath();
  ctx.arc(cx, cy - 170, 36, 0, Math.PI * 2); // Head
  ctx.roundRect(cx - 15, cy - 136, 30, 28, 6); // Neck
  ctx.fill();
  ctx.stroke();

  // 3. Arms (A-Pose or T-Pose)
  const shoulderL = { x: cx - 62, y: cy - 95 };
  const shoulderR = { x: cx + 62, y: cy - 95 };
  const elbowL = isTPose ? { x: cx - 135, y: cy - 95 } : { x: cx - 105, y: cy - 30 };
  const elbowR = isTPose ? { x: cx + 135, y: cy - 95 } : { x: cx + 105, y: cy - 30 };
  const wristL = isTPose ? { x: cx - 200, y: cy - 95 } : { x: cx - 140, y: cy + 32 };
  const wristR = isTPose ? { x: cx + 200, y: cy - 95 } : { x: cx + 140, y: cy + 32 };

  // Upper arms
  drawCapsule(ctx, shoulderL.x, shoulderL.y, elbowL.x, elbowL.y, 16);
  drawCapsule(ctx, shoulderR.x, shoulderR.y, elbowR.x, elbowR.y, 16);

  // Forearms
  drawCapsule(ctx, elbowL.x, elbowL.y, wristL.x, wristL.y, 13);
  drawCapsule(ctx, elbowR.x, elbowR.y, wristR.x, wristR.y, 13);

  // Hands
  const handL = isTPose ? { x: wristL.x - 22, y: wristL.y } : { x: wristL.x - 14, y: wristL.y + 18 };
  const handR = isTPose ? { x: wristR.x + 22, y: wristR.y } : { x: wristR.x + 14, y: wristR.y + 18 };
  drawCapsule(ctx, wristL.x, wristL.y, handL.x, handL.y, 10);
  drawCapsule(ctx, wristR.x, wristR.y, handR.x, handR.y, 10);

  // 4. Legs
  const hipL = { x: cx - 30, y: cy + 52 };
  const hipR = { x: cx + 30, y: cy + 52 };
  const kneeL = { x: cx - 34, y: cy + 145 };
  const kneeR = { x: cx + 34, y: cy + 145 };
  const ankleL = { x: cx - 36, y: cy + 232 };
  const ankleR = { x: cx + 36, y: cy + 232 };
  const footL = { x: cx - 38, y: cy + 258 };
  const footR = { x: cx + 38, y: cy + 258 };

  // Thighs
  drawCapsule(ctx, hipL.x, hipL.y, kneeL.x, kneeL.y, 19);
  drawCapsule(ctx, hipR.x, hipR.y, kneeR.x, kneeR.y, 19);

  // Shins
  drawCapsule(ctx, kneeL.x, kneeL.y, ankleL.x, ankleL.y, 15);
  drawCapsule(ctx, kneeR.x, kneeR.y, ankleR.x, ankleR.y, 15);

  // Feet
  drawCapsule(ctx, ankleL.x, ankleL.y, footL.x, footL.y, 12);
  drawCapsule(ctx, ankleR.x, ankleR.y, footR.x, footR.y, 12);

  // 5. Joint Circles
  if (opts.showJoints) {
    [shoulderL, shoulderR, hipL, hipR].forEach((j) => drawJoint(ctx, j.x, j.y, 9));
    [elbowL, elbowR, kneeL, kneeR].forEach((j) => drawJoint(ctx, j.x, j.y, 8));
    [wristL, wristR, ankleL, ankleR].forEach((j) => drawJoint(ctx, j.x, j.y, 7));
  }
}

/**
 * Render Female Anime Mannequin
 */
function renderFemaleAnime(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  opts: MannequinOptions,
): void {
  const isTPose = opts.pose === 't-pose';

  // 1. Torso & Pelvis (Hourglass silhouette)
  ctx.beginPath();
  ctx.roundRect(cx - 44, cy - 105, 88, 75, 12); // Ribcage
  ctx.roundRect(cx - 30, cy - 32, 60, 42, 10); // Slender Waist
  ctx.roundRect(cx - 46, cy + 8, 92, 45, 14); // Wider Hips
  ctx.fill();
  ctx.stroke();

  // 2. Head & Slender Neck
  ctx.beginPath();
  ctx.arc(cx, cy - 165, 38, 0, Math.PI * 2); // Stylized head
  ctx.roundRect(cx - 10, cy - 130, 20, 26, 5); // Slender neck
  ctx.fill();
  ctx.stroke();

  // 3. Arms
  const shoulderL = { x: cx - 48, y: cy - 92 };
  const shoulderR = { x: cx + 48, y: cy - 92 };
  const elbowL = isTPose ? { x: cx - 120, y: cy - 92 } : { x: cx - 90, y: cy - 30 };
  const elbowR = isTPose ? { x: cx + 120, y: cy - 92 } : { x: cx + 90, y: cy - 30 };
  const wristL = isTPose ? { x: cx - 180, y: cy - 92 } : { x: cx - 120, y: cy + 30 };
  const wristR = isTPose ? { x: cx + 180, y: cy - 92 } : { x: cx + 120, y: cy + 30 };

  drawCapsule(ctx, shoulderL.x, shoulderL.y, elbowL.x, elbowL.y, 13);
  drawCapsule(ctx, shoulderR.x, shoulderR.y, elbowR.x, elbowR.y, 13);
  drawCapsule(ctx, elbowL.x, elbowL.y, wristL.x, wristL.y, 10);
  drawCapsule(ctx, elbowR.x, elbowR.y, wristR.x, wristR.y, 10);

  // 4. Legs
  const hipL = { x: cx - 26, y: cy + 45 };
  const hipR = { x: cx + 26, y: cy + 45 };
  const kneeL = { x: cx - 28, y: cy + 140 };
  const kneeR = { x: cx + 28, y: cy + 140 };
  const ankleL = { x: cx - 26, y: cy + 230 };
  const ankleR = { x: cx + 26, y: cy + 230 };
  const footL = { x: cx - 26, y: cy + 255 };
  const footR = { x: cx + 26, y: cy + 255 };

  drawCapsule(ctx, hipL.x, hipL.y, kneeL.x, kneeL.y, 16);
  drawCapsule(ctx, hipR.x, hipR.y, kneeR.x, kneeR.y, 16);
  drawCapsule(ctx, kneeL.x, kneeL.y, ankleL.x, ankleL.y, 12);
  drawCapsule(ctx, kneeR.x, kneeR.y, ankleR.x, ankleR.y, 12);
  drawCapsule(ctx, ankleL.x, ankleL.y, footL.x, footL.y, 10);
  drawCapsule(ctx, ankleR.x, ankleR.y, footR.x, footR.y, 10);

  if (opts.showJoints) {
    [shoulderL, shoulderR, hipL, hipR].forEach((j) => drawJoint(ctx, j.x, j.y, 8));
    [elbowL, elbowR, kneeL, kneeR].forEach((j) => drawJoint(ctx, j.x, j.y, 7));
    [wristL, wristR, ankleL, ankleR].forEach((j) => drawJoint(ctx, j.x, j.y, 6));
  }
}

/**
 * Render Chibi Mascot Mannequin (2.8 Heads)
 */
function renderChibi(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  opts: MannequinOptions,
): void {
  // 1. Oversized cute head (45% of total height)
  ctx.beginPath();
  ctx.arc(cx, cy - 85, 76, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ear markers
  ctx.beginPath();
  ctx.arc(cx - 74, cy - 85, 14, 0, Math.PI * 2);
  ctx.arc(cx + 74, cy - 85, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Compact plump body
  ctx.beginPath();
  ctx.roundRect(cx - 46, cy - 10, 92, 95, 24);
  ctx.fill();
  ctx.stroke();

  // 3. Chubby arms
  const shoulderL = { x: cx - 44, y: cy + 15 };
  const shoulderR = { x: cx + 44, y: cy + 15 };
  const handL = { x: cx - 88, y: cy + 50 };
  const handR = { x: cx + 88, y: cy + 50 };
  drawCapsule(ctx, shoulderL.x, shoulderL.y, handL.x, handL.y, 16);
  drawCapsule(ctx, shoulderR.x, shoulderR.y, handR.x, handR.y, 16);

  // 4. Stubby legs
  const hipL = { x: cx - 24, y: cy + 80 };
  const hipR = { x: cx + 24, y: cy + 80 };
  const footL = { x: cx - 26, y: cy + 155 };
  const footR = { x: cx + 26, y: cy + 155 };
  drawCapsule(ctx, hipL.x, hipL.y, footL.x, footL.y, 18);
  drawCapsule(ctx, hipR.x, hipR.y, footR.x, footR.y, 18);

  if (opts.showJoints) {
    [shoulderL, shoulderR, hipL, hipR].forEach((j) => drawJoint(ctx, j.x, j.y, 8));
    [handL, handR, footL, footR].forEach((j) => drawJoint(ctx, j.x, j.y, 7));
  }
}

/**
 * Render Quadruped Creature Mannequin
 */
function renderCreature(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  opts: MannequinOptions,
): void {
  // 1. Horizontal Spine / Ribcage / Flank
  ctx.beginPath();
  ctx.roundRect(cx - 120, cy - 40, 240, 75, 26);
  ctx.fill();
  ctx.stroke();

  // 2. Beast Head & Muzzle (Facing left)
  const neckStart = { x: cx - 110, y: cy - 25 };
  const headCenter = { x: cx - 175, y: cy - 80 };
  drawCapsule(ctx, neckStart.x, neckStart.y, headCenter.x, headCenter.y, 22);

  ctx.beginPath();
  ctx.arc(headCenter.x, headCenter.y, 34, 0, Math.PI * 2);
  ctx.roundRect(headCenter.x - 38, headCenter.y - 12, 40, 26, 8); // Snout
  ctx.fill();
  ctx.stroke();

  // 3. Forelegs (Front limbs)
  const frontHip = { x: cx - 85, y: cy + 25 };
  const frontKnee = { x: cx - 95, y: cy + 105 };
  const frontPaw = { x: cx - 100, y: cy + 185 };
  drawCapsule(ctx, frontHip.x, frontHip.y, frontKnee.x, frontKnee.y, 16);
  drawCapsule(ctx, frontKnee.x, frontKnee.y, frontPaw.x, frontPaw.y, 13);

  // 4. Hindlegs (Back limbs with inverted hock joint)
  const hindHip = { x: cx + 80, y: cy + 20 };
  const hindStifle = { x: cx + 110, y: cy + 95 };
  const hindHock = { x: cx + 85, y: cy + 140 };
  const hindPaw = { x: cx + 85, y: cy + 185 };
  drawCapsule(ctx, hindHip.x, hindHip.y, hindStifle.x, hindStifle.y, 19);
  drawCapsule(ctx, hindStifle.x, hindStifle.y, hindHock.x, hindHock.y, 14);
  drawCapsule(ctx, hindHock.x, hindHock.y, hindPaw.x, hindPaw.y, 12);

  // 5. Tail
  const tailStart = { x: cx + 115, y: cy - 20 };
  const tailMid = { x: cx + 175, y: cy - 35 };
  const tailEnd = { x: cx + 215, y: cy + 20 };
  drawCapsule(ctx, tailStart.x, tailStart.y, tailMid.x, tailMid.y, 12);
  drawCapsule(ctx, tailMid.x, tailMid.y, tailEnd.x, tailEnd.y, 8);

  if (opts.showJoints) {
    [frontHip, hindHip].forEach((j) => drawJoint(ctx, j.x, j.y, 9));
    [frontKnee, hindStifle, hindHock].forEach((j) => drawJoint(ctx, j.x, j.y, 8));
    [frontPaw, hindPaw].forEach((j) => drawJoint(ctx, j.x, j.y, 7));
  }
}

/**
 * Main function to render selected Mannequin onto a 2D canvas context.
 */
export function renderMannequinPreset(
  ctx: CanvasRenderingContext2D,
  presetId: MannequinPresetId,
  width: number,
  height: number,
  options: MannequinOptions = {},
): void {
  const cx = width / 2;
  const cy = height / 2;

  const bodyColor = options.color || '#4f69ff';
  const alpha = options.alpha ?? 0.85;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (presetId) {
    case 'hero-male':
      renderHeroMale(ctx, cx, cy, options);
      break;
    case 'female-anime':
      renderFemaleAnime(ctx, cx, cy, options);
      break;
    case 'chibi':
      renderChibi(ctx, cx, cy, options);
      break;
    case 'creature':
      renderCreature(ctx, cx, cy, options);
      break;
  }

  ctx.restore();
}
