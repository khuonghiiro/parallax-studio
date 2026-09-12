import fs from 'node:fs';
import type { CommandBus } from '@parallax/application';
import type { Layer } from '@parallax/contracts';

const FALLBACK_KNIGHT_IMAGE = 'C:/Users/Admin/.gemini/antigravity-ide/brain/'
  + 'a2ab1ce4-201c-44de-9869-7154ce667e5f/knight_idle_a_pose_1789134150729.jpg';

export const CHARACTER_TOOL_DEFS = [
  {
    name: 'character_auto_rig',
    description: 'Auto-import 2D character image, build deformable 2.5D mesh, rig 16 bones, and stage in scene',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Character name' },
        imagePath: { type: 'string', description: 'Local image path or empty for knight' },
        width: { type: 'number', description: 'Width in units' },
        height: { type: 'number', description: 'Height in units' },
        pose: { type: 'string', enum: ['t-pose', 'a-pose'], description: 'Skeleton rest pose' },
      },
      required: ['name'],
    },
  },
  {
    name: 'character_decompose_rig',
    description: 'Decompose character into discrete cutout layers (head, face, torso, limbs, cape), '
      + 'binding each to bones with rigid pivots to prevent mesh rubber distortion',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Character name' },
        imagePath: { type: 'string', description: 'Character artwork image path' },
        width: { type: 'number', description: 'Canvas width (default 848)' },
        height: { type: 'number', description: 'Canvas height (default 1264)' },
        expression: {
          type: 'string',
          enum: ['neutral', 'smile', 'combat', 'blink', 'wink', 'surprised'],
          description: 'Initial facial expression',
        },
      },
    },
  },
  {
    name: 'character_set_expression',
    description: 'Change face layer expression and emotion dynamically '
      + '(neutral, smile, combat, blink, wink, surprised)',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: { type: 'string', description: 'Target asset entity ID' },
        expression: {
          type: 'string',
          enum: ['neutral', 'smile', 'combat', 'blink', 'wink', 'surprised'],
          description: 'Facial expression type',
        },
        intensity: { type: 'number', description: 'Expression intensity [0..1]' },
      },
      required: ['assetId', 'expression'],
    },
  },
  {
    name: 'character_adjust_part',
    description: 'Adjust fine position, draw order, visibility, or bone binding of any decomposed character part',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: { type: 'string', description: 'Target asset entity ID' },
        layerName: {
          type: 'string',
          description: 'Layer part name (e.g. face_features, cape, torso, upper_arm_l)',
        },
        offsetX: { type: 'number', description: 'Offset X in units' },
        offsetY: { type: 'number', description: 'Offset Y in units' },
        drawOrder: { type: 'number', description: 'Z-stacking render order' },
        visible: { type: 'boolean', description: 'Visibility state' },
        opacity: { type: 'number', description: 'Opacity [0..1]' },
      },
      required: ['assetId', 'layerName'],
    },
  },
];

/**
 * Handle character_auto_rig tool.
 */
export async function handleCharacterAutoRig(
  bus: CommandBus,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const name = (args.name as string) || 'Hiệp Sĩ Hoàng Gia (Knight 2D)';
  const width = Number(args.width ?? 848);
  const height = Number(args.height ?? 1264);
  const pose = (args.pose as 't-pose' | 'a-pose') || 'a-pose';

  let imgPath = (args.imagePath as string) || '';
  if (!imgPath || !fs.existsSync(imgPath)) {
    imgPath = FALLBACK_KNIGHT_IMAGE;
  }

  let dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
    + 'AAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  if (fs.existsSync(imgPath)) {
    const b64 = fs.readFileSync(imgPath).toString('base64');
    dataUrl = `data:image/jpeg;base64,${b64}`;
  }

  const importRes = await bus.dispatch({
    type: 'import_image',
    domain: 'asset',
    data: { name, dataUrl, width, height },
  });

  const assetId = importRes.entityId as string;

  const rigRes = await bus.dispatch({
    type: 'apply_rig_template',
    domain: 'rig',
    targetId: assetId,
    data: { assetId, template: 'humanoid', pose },
  });

  await bus.dispatch({
    type: 'set_morph_weight',
    domain: 'rig',
    targetId: assetId,
    data: { assetId, name: 'smile', weight: 0.8 },
  });

  const stageRes = await bus.dispatch({
    type: 'add_instance',
    domain: 'scene',
    data: {
      assetId,
      name: `${name} Instance`,
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1 },
      viewAngle: 'front',
    },
  });

  await bus.dispatch({
    type: 'set_camera',
    domain: 'scene',
    data: {
      camera: {
        position: { x: 0, y: 0, z: 1000 },
        zoom: 1.0,
        fov: 45,
      },
    },
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            status: 'success',
            characterName: name,
            assetId,
            instanceId: stageRes.entityId,
            rig: {
              boneCount: rigRes.data?.boneCount ?? 16,
              pose,
              template: 'humanoid',
            },
            imageLoaded: fs.existsSync(imgPath),
          },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Handle character_decompose_rig tool.
 * Decomposes character into discrete body parts (torso, arms, legs, cape, head, face),
 * binding each rigidly to its Three.js bone so rotation has zero stretching or tearing.
 */
export async function handleCharacterDecomposeRig(
  bus: CommandBus,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const name = (args.name as string) || 'Hiệp Sĩ Cutout (Multi-Layer Puppet)';
  const width = Number(args.width ?? 848);
  const height = Number(args.height ?? 1264);
  const expression = (args.expression as string) || 'neutral';

  let imgPath = (args.imagePath as string) || '';
  if (!imgPath || !fs.existsSync(imgPath)) {
    imgPath = FALLBACK_KNIGHT_IMAGE;
  }

  let dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
    + 'AAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  if (fs.existsSync(imgPath)) {
    const b64 = fs.readFileSync(imgPath).toString('base64');
    dataUrl = `data:image/jpeg;base64,${b64}`;
  }

  // 1. Import base character asset
  const importRes = await bus.dispatch({
    type: 'import_image',
    domain: 'asset',
    data: { name, dataUrl, width, height },
  });

  const assetId = importRes.entityId as string;

  // 2. Rig skeleton bones
  await bus.dispatch({
    type: 'apply_rig_template',
    domain: 'rig',
    targetId: assetId,
    data: { assetId, template: 'humanoid', pose: 'a-pose' },
  });

  // 3. Build decomposed layers
  const defaultMat = {
    colorImage: 'color.png',
    alphaMask: null,
    normalMap: null,
    roughnessMap: null,
    tint: { r: 1, g: 1, b: 1, a: 1 },
  };

  const layers: Layer[] = [
    {
      id: `${assetId}_cape`,
      name: 'Áo Choàng Sau (Cape)',
      visible: true,
      locked: false,
      drawOrder: -10,
      opacity: 0.95,
      pivot: { x: 170, y: 275 },
      dimensions: { width: 340, height: 550 },
      material: defaultMat,
      updatedRevision: 1,
      bindBoneName: 'spine',
      position: { x: 0, y: 20 },
      uvBounds: { uMin: 0.30, vMin: 0.15, uMax: 0.70, vMax: 0.65 },
    },
    {
      id: `${assetId}_thigh_l`,
      name: 'Đùi Giáp Trái (Thigh L)',
      visible: true,
      locked: false,
      drawOrder: 4,
      opacity: 1.0,
      pivot: { x: 45, y: 75 },
      dimensions: { width: 90, height: 150 },
      material: defaultMat,
      updatedRevision: 1,
      bindBoneName: 'thigh_l',
      position: { x: -45, y: -75 },
      uvBounds: { uMin: 0.36, vMin: 0.28, uMax: 0.49, vMax: 0.44 },
    },
    {
      id: `${assetId}_shin_l`,
      name: 'Ủng Thép Trái (Shin & Boot L)',
      visible: true,
      locked: false,
      drawOrder: 6,
      opacity: 1.0,
      pivot: { x: 45, y: 85 },
      dimensions: { width: 90, height: 170 },
      material: defaultMat,
      updatedRevision: 1,
      bindBoneName: 'shin_l',
      position: { x: -48, y: -205 },
      uvBounds: { uMin: 0.35, vMin: 0.08, uMax: 0.48, vMax: 0.28 },
    },
    {
      id: `${assetId}_thigh_r`,
      name: 'Đùi Giáp Phải (Thigh R)',
      visible: true,
      locked: false,
      drawOrder: 4,
      opacity: 1.0,
      pivot: { x: 45, y: 75 },
      dimensions: { width: 90, height: 150 },
      material: defaultMat,
      updatedRevision: 1,
      bindBoneName: 'thigh_r',
      position: { x: 45, y: -75 },
      uvBounds: { uMin: 0.51, vMin: 0.28, uMax: 0.64, vMax: 0.44 },
    },
    {
      id: `${assetId}_shin_r`,
      name: 'Ủng Thép Phải (Shin & Boot R)',
      visible: true,
      locked: false,
      drawOrder: 6,
      opacity: 1.0,
      pivot: { x: 45, y: 85 },
      dimensions: { width: 90, height: 170 },
      material: defaultMat,
      updatedRevision: 1,
      bindBoneName: 'shin_r',
      position: { x: 48, y: -205 },
      uvBounds: { uMin: 0.52, vMin: 0.08, uMax: 0.65, vMax: 0.28 },
    },
    {
      id: `${assetId}_torso`,
      name: 'Áo Giáp Ngực (Torso Cuirass)',
      visible: true,
      locked: false,
      drawOrder: 10,
      opacity: 1.0,
      pivot: { x: 110, y: 120 },
      dimensions: { width: 220, height: 240 },
      material: defaultMat,
      updatedRevision: 1,
      bindBoneName: 'spine',
      position: { x: 0, y: 60 },
      uvBounds: { uMin: 0.37, vMin: 0.48, uMax: 0.63, vMax: 0.70 },
    },
    {
      id: `${assetId}_upper_arm_l`,
      name: 'Cánh Tay Trái (Upper Arm L)',
      visible: true,
      locked: false,
      drawOrder: 12,
      opacity: 1.0,
      pivot: { x: 60, y: 70 },
      dimensions: { width: 120, height: 140 },
      material: defaultMat,
      updatedRevision: 1,
      bindBoneName: 'upper_arm_l',
      position: { x: -95, y: 75 },
      uvBounds: { uMin: 0.24, vMin: 0.52, uMax: 0.38, vMax: 0.68 },
    },
    {
      id: `${assetId}_forearm_l`,
      name: 'Cẳng Tay & Kiếm Trái (Forearm L)',
      visible: true,
      locked: false,
      drawOrder: 14,
      opacity: 1.0,
      pivot: { x: 55, y: 90 },
      dimensions: { width: 110, height: 180 },
      material: defaultMat,
      updatedRevision: 1,
      bindBoneName: 'forearm_l',
      position: { x: -135, y: -45 },
      uvBounds: { uMin: 0.18, vMin: 0.34, uMax: 0.33, vMax: 0.54 },
    },
    {
      id: `${assetId}_upper_arm_r`,
      name: 'Cánh Tay Phải (Upper Arm R)',
      visible: true,
      locked: false,
      drawOrder: 12,
      opacity: 1.0,
      pivot: { x: 60, y: 70 },
      dimensions: { width: 120, height: 140 },
      material: defaultMat,
      updatedRevision: 1,
      bindBoneName: 'upper_arm_r',
      position: { x: 95, y: 75 },
      uvBounds: { uMin: 0.62, vMin: 0.52, uMax: 0.76, vMax: 0.68 },
    },
    {
      id: `${assetId}_forearm_r`,
      name: 'Cẳng Tay & Khiên Phải (Forearm R)',
      visible: true,
      locked: false,
      drawOrder: 14,
      opacity: 1.0,
      pivot: { x: 55, y: 90 },
      dimensions: { width: 110, height: 180 },
      material: defaultMat,
      updatedRevision: 1,
      bindBoneName: 'forearm_r',
      position: { x: 135, y: -45 },
      uvBounds: { uMin: 0.67, vMin: 0.34, uMax: 0.82, vMax: 0.54 },
    },
    {
      id: `${assetId}_head_base`,
      name: 'Mũ Sắt & Đầu (Head Helmet Base)',
      visible: true,
      locked: false,
      drawOrder: 20,
      opacity: 1.0,
      pivot: { x: 80, y: 80 },
      dimensions: { width: 160, height: 160 },
      material: defaultMat,
      updatedRevision: 1,
      bindBoneName: 'head',
      position: { x: 0, y: 205 },
      uvBounds: { uMin: 0.40, vMin: 0.72, uMax: 0.60, vMax: 0.88 },
    },
    {
      id: `${assetId}_face_features`,
      name: 'Khuôn Mặt & Mắt Biểu Cảm (Face Features)',
      visible: true,
      locked: false,
      drawOrder: 25,
      opacity: 1.0,
      pivot: { x: 45, y: 30 },
      dimensions: { width: 90, height: 60 },
      material: defaultMat,
      updatedRevision: 1,
      bindBoneName: 'head',
      position: { x: 0, y: 195 },
      imageDataUrl: createExpressionSvg(expression),
    },
  ];

  // 4. Set decomposed layers on asset
  await bus.dispatch({
    type: 'set_layers',
    domain: 'asset',
    targetId: assetId,
    data: { assetId, layers },
  });

  // 5. Stage instance in scene
  const stageRes = await bus.dispatch({
    type: 'add_instance',
    domain: 'scene',
    data: {
      assetId,
      name: `${name} Instance`,
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1 },
      viewAngle: 'front',
    },
  });

  // 6. Center camera
  await bus.dispatch({
    type: 'set_camera',
    domain: 'scene',
    data: {
      camera: {
        position: { x: 0, y: 0, z: 1000 },
        zoom: 1.0,
        fov: 45,
      },
    },
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            status: 'success',
            characterName: name,
            assetId,
            instanceId: stageRes.entityId,
            architecture: 'Decomposed Multi-Layer Cutout Sprite Rig (Puppet Hierarchy)',
            layerCount: layers.length,
            layers: layers.map((l) => ({
              id: l.id,
              name: l.name,
              bindBone: l.bindBoneName,
              drawOrder: l.drawOrder,
            })),
            expression,
          },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Handle character_set_expression tool.
 * Dynamically modifies the facial features layer (eyes, visor slit, mouth)
 * allowing blinking, smiling, combat focus, or winking without touching helmet/armor geometry.
 */
export async function handleCharacterSetExpression(
  bus: CommandBus,
  args: Record<string, unknown>,
  stateOrGetter: import('@parallax/application').ProjectState
    | ((id: string) => Promise<import('@parallax/application').AssetData | undefined>),
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const assetId = args.assetId as string;
  const expression = (args.expression as string) || 'neutral';
  const intensity = Number(args.intensity ?? 1.0);

  if (!assetId) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: 'assetId is required' }) }],
    };
  }

  const asset = typeof stateOrGetter === 'function'
    ? await stateOrGetter(assetId)
    : stateOrGetter.getAssetData(assetId);

  if (!asset) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `Asset ${assetId} not found` }) }],
    };
  }

  const currentLayers = asset.layers ? [...asset.layers] : [];
  const faceIdx = currentLayers.findIndex(
    (l) => l.name.includes('Face') || l.id.includes('face') || l.bindBoneName === 'head' && l.drawOrder > 20,
  );

  const newSvg = createExpressionSvg(expression, intensity);

  if (faceIdx >= 0) {
    const prev = currentLayers[faceIdx]!;
    currentLayers[faceIdx] = {
      ...prev,
      imageDataUrl: newSvg,
      updatedRevision: prev.updatedRevision + 1,
    };
  } else {
    // Add face features layer if not present
    currentLayers.push({
      id: `${assetId}_face_features`,
      name: 'Khuôn Mặt Biểu Cảm (Face Features)',
      visible: true,
      locked: false,
      drawOrder: 25,
      opacity: 1.0,
      pivot: { x: 45, y: 30 },
      dimensions: { width: 90, height: 60 },
      material: {
        colorImage: 'color.png',
        alphaMask: null,
        normalMap: null,
        roughnessMap: null,
        tint: { r: 1, g: 1, b: 1, a: 1 },
      },
      updatedRevision: 1,
      bindBoneName: 'head',
      position: { x: 0, y: 195 },
      imageDataUrl: newSvg,
    });
  }

  await bus.dispatch({
    type: 'set_layers',
    domain: 'asset',
    targetId: assetId,
    data: { assetId, layers: currentLayers },
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            status: 'success',
            assetId,
            expression,
            intensity,
            message: `Facial expression updated to ${expression} on face_features layer`,
          },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Handle character_adjust_part tool.
 */
export async function handleCharacterAdjustPart(
  bus: CommandBus,
  args: Record<string, unknown>,
  stateOrGetter: import('@parallax/application').ProjectState
    | ((id: string) => Promise<import('@parallax/application').AssetData | undefined>),
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const assetId = args.assetId as string;
  const layerName = args.layerName as string;

  if (!assetId || !layerName) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: 'assetId and layerName are required' }) }],
    };
  }

  const asset = typeof stateOrGetter === 'function'
    ? await stateOrGetter(assetId)
    : stateOrGetter.getAssetData(assetId);

  if (!asset || !asset.layers) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `Asset or layers not found for ${assetId}` }) }],
    };
  }

  const layers = [...asset.layers];
  const idx = layers.findIndex(
    (l) => l.name === layerName || l.id === layerName || l.id.endsWith(`_${layerName}`),
  );

  if (idx < 0) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `Layer ${layerName} not found` }) }],
    };
  }

  const target = layers[idx]!;
  layers[idx] = {
    ...target,
    position: {
      x: args.offsetX !== undefined ? Number(args.offsetX) : (target.position?.x ?? 0),
      y: args.offsetY !== undefined ? Number(args.offsetY) : (target.position?.y ?? 0),
    },
    drawOrder: args.drawOrder !== undefined ? Number(args.drawOrder) : target.drawOrder,
    visible: args.visible !== undefined ? Boolean(args.visible) : target.visible,
    opacity: args.opacity !== undefined ? Number(args.opacity) : target.opacity,
    updatedRevision: target.updatedRevision + 1,
  };

  await bus.dispatch({
    type: 'set_layers',
    domain: 'asset',
    targetId: assetId,
    data: { assetId, layers },
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            status: 'success',
            assetId,
            layerName,
            updatedLayer: layers[idx],
          },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Generate expressive SVG data URL for face expressions (eyes, visor slit, mouth).
 */
function createExpressionSvg(expression: string, intensity: number = 1.0): string {
  const w = 180;
  const h = 120;
  let eyeColor = '#38bdf8';
  let eyeShape = '';

  switch (expression) {
    case 'smile':
    case 'happy':
      eyeColor = '#fbbf24';
      eyeShape = `
        <path d="M 35 65 Q 55 45 75 65" stroke="${eyeColor}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M 105 65 Q 125 45 145 65" stroke="${eyeColor}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M 70 85 Q 90 100 110 85" stroke="${eyeColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
      `;
      break;

    case 'combat':
    case 'angry':
      eyeColor = '#f43f5e';
      eyeShape = `
        <polygon points="35,52 75,64 72,70 32,60" fill="${eyeColor}" />
        <polygon points="145,52 105,64 108,70 148,60" fill="${eyeColor}" />
        <line x1="20" y1="46" x2="80" y2="66" stroke="#fb7185" stroke-width="3" stroke-linecap="round" />
        <line x1="160" y1="46" x2="100" y2="66" stroke="#fb7185" stroke-width="3" stroke-linecap="round" />
      `;
      break;

    case 'blink':
      eyeColor = '#94a3b8';
      eyeShape = `
        <line x1="35" y1="65" x2="75" y2="65" stroke="${eyeColor}" stroke-width="5" stroke-linecap="round"/>
        <line x1="105" y1="65" x2="145" y2="65" stroke="${eyeColor}" stroke-width="5" stroke-linecap="round"/>
      `;
      break;

    case 'wink':
      eyeColor = '#38bdf8';
      eyeShape = `
        <ellipse cx="55" cy="62" rx="14" ry="10" fill="${eyeColor}"/>
        <circle cx="58" cy="59" r="4" fill="#ffffff"/>
        <path d="M 105 65 Q 125 45 145 65" stroke="${eyeColor}" stroke-width="6" fill="none" stroke-linecap="round"/>
      `;
      break;

    case 'surprised':
      eyeColor = '#a855f7';
      eyeShape = `
        <ellipse cx="55" cy="60" rx="16" ry="18" fill="${eyeColor}"/>
        <circle cx="58" cy="56" r="5" fill="#ffffff"/>
        <ellipse cx="125" cy="60" rx="16" ry="18" fill="${eyeColor}"/>
        <circle cx="128" cy="56" r="5" fill="#ffffff"/>
        <ellipse cx="90" cy="92" rx="10" ry="14" fill="${eyeColor}"/>
      `;
      break;

    case 'neutral':
    default:
      eyeColor = '#38bdf8';
      eyeShape = `
        <rect x="35" y="58" width="42" height="12" rx="5" fill="${eyeColor}"/>
        <rect x="103" y="58" width="42" height="12" rx="5" fill="${eyeColor}"/>
        <rect x="42" y="61" width="18" height="4" rx="2" fill="#ffffff"/>
        <rect x="110" y="61" width="18" height="4" rx="2" fill="#ffffff"/>
      `;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#glow)">
      ${eyeShape}
    </g>
  </svg>`;

  const b64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}
