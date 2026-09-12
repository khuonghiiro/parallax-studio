// Parallax Studio - Cutout Puppet Slicer & AI Part Prompt Generator
// Slices humanoid and stylized characters into discrete anatomical body parts,
// applies underlap joint padding for gap-free rotation, and generates AI prompts per part.

export type CutoutMode = 'basic-6' | 'detailed-10';

export interface AnatomicalPartRegion {
  id: string;
  nameVi: string;
  nameEn: string;
  category: 'head' | 'torso' | 'arm' | 'leg';
  // Normalized bounding box [x0, y0, x1, y1] on a 600x600 canvas
  bounds: [number, number, number, number];
  // Pivot location in canvas coordinates [x, y]
  pivot: [number, number];
  // Joint socket points requiring underlap dilation [x, y, radius]
  jointSockets: Array<[number, number, number]>;
  zIndex: number;
}

export interface CutoutPart {
  id: string;
  nameVi: string;
  nameEn: string;
  category: 'head' | 'torso' | 'arm' | 'leg';
  canvas: HTMLCanvasElement;
  bounds: [number, number, number, number];
  pivot: [number, number];
  zIndex: number;
}

export interface CutoutPartPrompt {
  partId: string;
  nameVi: string;
  nameEn: string;
  prompt: string;
  negativePrompt: string;
  recommendedResolution: string;
  jointAnchor: string;
}

export interface CutoutBrief {
  requestId: string;
  style: string;
  characterDescription: string;
  parts: CutoutPartPrompt[];
  exportDate: string;
}

export const BASIC_6_REGIONS: AnatomicalPartRegion[] = [
  {
    id: 'head',
    nameVi: 'Đầu & Cổ',
    nameEn: 'Head & Neck',
    category: 'head',
    bounds: [180, 20, 420, 210],
    pivot: [300, 200],
    jointSockets: [[300, 200, 18]],
    zIndex: 5,
  },
  {
    id: 'torso',
    nameVi: 'Thân & Hông',
    nameEn: 'Torso & Hips',
    category: 'torso',
    bounds: [190, 190, 410, 390],
    pivot: [300, 360],
    jointSockets: [
      [220, 225, 20], // Left shoulder socket
      [380, 225, 20], // Right shoulder socket
      [250, 360, 22], // Left hip socket
      [350, 360, 22], // Right hip socket
    ],
    zIndex: 3,
  },
  {
    id: 'arm_left',
    nameVi: 'Tay Trái',
    nameEn: 'Left Arm',
    category: 'arm',
    bounds: [110, 210, 230, 430],
    pivot: [220, 225],
    jointSockets: [[220, 225, 18]],
    zIndex: 4,
  },
  {
    id: 'arm_right',
    nameVi: 'Tay Phải',
    nameEn: 'Right Arm',
    category: 'arm',
    bounds: [370, 210, 490, 430],
    pivot: [380, 225],
    jointSockets: [[380, 225, 18]],
    zIndex: 4,
  },
  {
    id: 'leg_left',
    nameVi: 'Chân Trái',
    nameEn: 'Left Leg',
    category: 'leg',
    bounds: [190, 350, 305, 590],
    pivot: [250, 365],
    jointSockets: [[250, 365, 20]],
    zIndex: 2,
  },
  {
    id: 'leg_right',
    nameVi: 'Chân Phải',
    nameEn: 'Right Leg',
    category: 'leg',
    bounds: [295, 350, 410, 590],
    pivot: [350, 365],
    jointSockets: [[350, 365, 20]],
    zIndex: 2,
  },
];

export const DETAILED_10_REGIONS: AnatomicalPartRegion[] = [
  {
    id: 'head',
    nameVi: 'Đầu & Cổ',
    nameEn: 'Head & Neck',
    category: 'head',
    bounds: [180, 20, 420, 210],
    pivot: [300, 200],
    jointSockets: [[300, 200, 18]],
    zIndex: 7,
  },
  {
    id: 'torso',
    nameVi: 'Thân Mình',
    nameEn: 'Torso',
    category: 'torso',
    bounds: [200, 190, 400, 380],
    pivot: [300, 350],
    jointSockets: [
      [225, 225, 20],
      [375, 225, 20],
      [250, 360, 22],
      [350, 360, 22],
    ],
    zIndex: 4,
  },
  {
    id: 'arm_left_upper',
    nameVi: 'Cánh Tay Trên (Trái)',
    nameEn: 'Upper Left Arm',
    category: 'arm',
    bounds: [130, 210, 240, 330],
    pivot: [225, 225],
    jointSockets: [
      [225, 225, 18],
      [175, 315, 16],
    ],
    zIndex: 5,
  },
  {
    id: 'arm_left_lower',
    nameVi: 'Cẳng & Bàn Tay (Trái)',
    nameEn: 'Forearm & Hand (Left)',
    category: 'arm',
    bounds: [100, 305, 205, 440],
    pivot: [175, 315],
    jointSockets: [[175, 315, 16]],
    zIndex: 6,
  },
  {
    id: 'arm_right_upper',
    nameVi: 'Cánh Tay Trên (Phải)',
    nameEn: 'Upper Right Arm',
    category: 'arm',
    bounds: [360, 210, 470, 330],
    pivot: [375, 225],
    jointSockets: [
      [375, 225, 18],
      [425, 315, 16],
    ],
    zIndex: 5,
  },
  {
    id: 'arm_right_lower',
    nameVi: 'Cẳng & Bàn Tay (Phải)',
    nameEn: 'Forearm & Hand (Right)',
    category: 'arm',
    bounds: [395, 305, 500, 440],
    pivot: [425, 315],
    jointSockets: [[425, 315, 16]],
    zIndex: 6,
  },
  {
    id: 'leg_left_upper',
    nameVi: 'Đùi Trái',
    nameEn: 'Upper Left Leg (Thigh)',
    category: 'leg',
    bounds: [200, 350, 305, 475],
    pivot: [250, 365],
    jointSockets: [
      [250, 365, 20],
      [245, 465, 18],
    ],
    zIndex: 2,
  },
  {
    id: 'leg_left_lower',
    nameVi: 'Cẳng & Bàn Chân (Trái)',
    nameEn: 'Calf & Foot (Left)',
    category: 'leg',
    bounds: [190, 455, 300, 595],
    pivot: [245, 465],
    jointSockets: [[245, 465, 18]],
    zIndex: 3,
  },
  {
    id: 'leg_right_upper',
    nameVi: 'Đùi Phải',
    nameEn: 'Upper Right Leg (Thigh)',
    category: 'leg',
    bounds: [295, 350, 400, 475],
    pivot: [350, 365],
    jointSockets: [
      [350, 365, 20],
      [355, 465, 18],
    ],
    zIndex: 2,
  },
  {
    id: 'leg_right_lower',
    nameVi: 'Cẳng & Bàn Chân (Phải)',
    nameEn: 'Calf & Foot (Right)',
    category: 'leg',
    bounds: [300, 455, 410, 595],
    pivot: [355, 465],
    jointSockets: [[355, 465, 18]],
    zIndex: 3,
  },
];

/**
 * Creates a blank canvas element safely across DOM or headless mock environments
 */
export function createPartCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document !== 'undefined' && document.createElement) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return {
    width,
    height,
    getContext: () => null,
  } as unknown as HTMLCanvasElement;
}

/**
 * Slices a source canvas into distinct anatomical body parts.
 * Adds underlap joint dilation so overlapping parts don't reveal holes during animation.
 */
export function sliceCanvasIntoParts(
  sourceCanvas: HTMLCanvasElement,
  mode: CutoutMode = 'basic-6',
  underlapPadding: number = 8
): CutoutPart[] {
  const regions = mode === 'basic-6' ? BASIC_6_REGIONS : DETAILED_10_REGIONS;
  const canvasWidth = sourceCanvas.width || 600;
  const canvasHeight = sourceCanvas.height || 600;
  const scaleX = canvasWidth / 600;
  const scaleY = canvasHeight / 600;

  const resultParts: CutoutPart[] = [];

  for (const region of regions) {
    const [origX0, origY0, origX1, origY1] = region.bounds;
    // Scale bounds to target canvas dimensions
    const x0 = Math.max(0, Math.floor(origX0 * scaleX));
    const y0 = Math.max(0, Math.floor(origY0 * scaleY));
    const x1 = Math.min(canvasWidth, Math.ceil(origX1 * scaleX));
    const y1 = Math.min(canvasHeight, Math.ceil(origY1 * scaleY));
    const partWidth = Math.max(1, x1 - x0);
    const partHeight = Math.max(1, y1 - y0);

    const partCanvas = createPartCanvas(partWidth, partHeight);
    const ctx = partCanvas.getContext ? partCanvas.getContext('2d') : null;

    if (ctx) {
      // 1. Copy source pixel region to part canvas
      ctx.drawImage(
        sourceCanvas,
        x0,
        y0,
        partWidth,
        partHeight,
        0,
        0,
        partWidth,
        partHeight
      );

      // 2. If underlapPadding > 0, apply joint dilation (expand round caps at joints)
      if (underlapPadding > 0 && region.jointSockets.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        for (const [sockX, sockY, sockR] of region.jointSockets) {
          const localSockX = sockX * scaleX - x0;
          const localSockY = sockY * scaleY - y0;
          const expandedR = (sockR + underlapPadding) * Math.min(scaleX, scaleY);

          ctx.beginPath();
          ctx.arc(localSockX, localSockY, expandedR, 0, Math.PI * 2);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
        }
        ctx.restore();
      }
    }

    resultParts.push({
      id: region.id,
      nameVi: region.nameVi,
      nameEn: region.nameEn,
      category: region.category,
      canvas: partCanvas,
      bounds: [x0, y0, x1, y1],
      pivot: [
        Math.round(region.pivot[0] * scaleX),
        Math.round(region.pivot[1] * scaleY),
      ],
      zIndex: region.zIndex,
    });
  }

  return resultParts;
}

export type StylePresetId =
  | 'cyberpunk'
  | 'fantasy-knight'
  | 'anime-casual'
  | 'chibi-cute'
  | 'scifi-mecha';

export interface StylePreset {
  id: StylePresetId;
  nameVi: string;
  nameEn: string;
  styleKeywords: string;
  negativeKeywords: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'cyberpunk',
    nameVi: 'Cyberpunk Ninja / Neon',
    nameEn: 'Cyberpunk Neon',
    styleKeywords:
      'cyberpunk style, neon glowing circuitry, sleek carbon fiber, futuristic tech, ' +
      'holographic accents, ultra sharp line art, clean flat cel shading',
    negativeKeywords:
      'realistic skin photo, 3d render, messy sketch, noise, background, shadow, blur, low resolution',
  },
  {
    id: 'fantasy-knight',
    nameVi: 'Hiệp Sĩ Trung Cổ / Giáp Sắt',
    nameEn: 'Medieval Knight',
    styleKeywords:
      'medieval fantasy RPG style, polished steel plate armor, ornate gold filigree, ' +
      'heroic proportions, high fantasy digital art, crisp lineart',
    negativeKeywords:
      'modern clothing, sci-fi guns, blurry, noise, photographic background, watermark, text',
  },
  {
    id: 'anime-casual',
    nameVi: 'Anime Nữ / Đồng Phục Học Đường',
    nameEn: 'Anime School Uniform',
    styleKeywords:
      'modern anime character design, Kyoto Animation style, soft vibrant shading, ' +
      'neat lineart, fashionable jacket, clean transparent alpha background',
    negativeKeywords:
      'western comic style, photorealistic, harsh shadows, background clutter, watermark',
  },
  {
    id: 'chibi-cute',
    nameVi: 'Chibi Đáng Yêu / Game Mascot',
    nameEn: 'Cute Chibi Game Mascot',
    styleKeywords:
      'cute chibi 2D game asset, bold clean outlines, vibrant pastel colors, ' +
      'adorable proportions, flat cel shading, sticker style',
    negativeKeywords:
      'realistic proportions, grim dark, gritty texture, complex anatomy, background scenery',
  },
  {
    id: 'scifi-mecha',
    nameVi: 'Robot Mecha / Giáp Cơ Khí',
    nameEn: 'Sci-Fi Mecha Robot',
    styleKeywords:
      'Gundam mecha aesthetic, mechanical joints, hydraulics, armored plating, ' +
      'hazard stripes, industrial decal accents, crisp hard edges',
    negativeKeywords:
      'organic skin, fantasy cloth, blurry edges, photorealistic human face, lowres',
  },
];

/**
 * Generates structured AI image generation prompts for each cutout part.
 * Formats prompts to ensure isolated parts on transparent background.
 */
export function generatePartPrompts(
  description: string,
  stylePresetId: StylePresetId = 'cyberpunk',
  mode: CutoutMode = 'basic-6'
): CutoutBrief {
  const preset =
    STYLE_PRESETS.find((p) => p.id === stylePresetId) || STYLE_PRESETS[0];
  const regions = mode === 'basic-6' ? BASIC_6_REGIONS : DETAILED_10_REGIONS;

  const partPrompts: CutoutPartPrompt[] = regions.map((region) => {
    const width = region.bounds[2] - region.bounds[0];
    const height = region.bounds[3] - region.bounds[1];

    let specificPartDetail = '';
    let jointAnchor = '';

    switch (region.id) {
      case 'head':
        specificPartDetail =
          'character head and neck, face portrait, detailed hair, expressive eyes, front orthographic';
        jointAnchor = 'Bottom center at neck joint socket';
        break;
      case 'torso':
        specificPartDetail =
          'character chestplate and torso, waist and belt, upper clothing, front orthographic, isolated';
        jointAnchor = 'Shoulder sockets left and right, hip sockets bottom';
        break;
      case 'arm_left':
      case 'arm_left_upper':
        specificPartDetail =
          'character left shoulder and arm, armored sleeve, angled 45 degrees in A-pose';
        jointAnchor = 'Top shoulder round joint socket';
        break;
      case 'arm_left_lower':
        specificPartDetail =
          'character left forearm and gauntlet, gloved hand, isolated limb';
        jointAnchor = 'Top elbow joint socket';
        break;
      case 'arm_right':
      case 'arm_right_upper':
        specificPartDetail =
          'character right shoulder and arm, armored sleeve, angled 45 degrees in A-pose';
        jointAnchor = 'Top shoulder round joint socket';
        break;
      case 'arm_right_lower':
        specificPartDetail =
          'character right forearm and gauntlet, gloved hand, isolated limb';
        jointAnchor = 'Top elbow joint socket';
        break;
      case 'leg_left':
      case 'leg_left_upper':
        specificPartDetail =
          'character left thigh, armored greave, vertical stance';
        jointAnchor = 'Top hip ball socket';
        break;
      case 'leg_left_lower':
        specificPartDetail =
          'character left shin, combat boot, foot grounded';
        jointAnchor = 'Top knee joint socket';
        break;
      case 'leg_right':
      case 'leg_right_upper':
        specificPartDetail =
          'character right thigh, armored greave, vertical stance';
        jointAnchor = 'Top hip ball socket';
        break;
      case 'leg_right_lower':
        specificPartDetail =
          'character right shin, combat boot, foot grounded';
        jointAnchor = 'Top knee joint socket';
        break;
      default:
        specificPartDetail =
          'character body component, front view';
        jointAnchor = 'Center pivot';
        break;
    }

    const fullPrompt = [
      description,
      specificPartDetail,
      preset.styleKeywords,
      'transparent background, isolated 2d sprite part, asset for 2d animation, orthographic view, 8k, centered',
    ]
      .join(', ')
      .trim();

    return {
      partId: region.id,
      nameVi: region.nameVi,
      nameEn: region.nameEn,
      prompt: fullPrompt,
      negativePrompt: `${preset.negativeKeywords}, cropped off edges, full body when requesting single limb`,
      recommendedResolution: `${width}x${height} px`,
      jointAnchor,
    };
  });

  return {
    requestId: `brief-${Date.now()}`,
    style: preset.nameEn,
    characterDescription: description,
    parts: partPrompts,
    exportDate: new Date().toISOString(),
  };
}
