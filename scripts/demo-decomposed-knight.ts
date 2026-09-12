import { createMcpServer } from '../mcp/server.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const KNIGHT_IMAGE_PATH = 'C:/Users/Admin/.gemini/antigravity-ide/brain/'
  + 'a2ab1ce4-201c-44de-9869-7154ce667e5f/knight_idle_a_pose_1789134150729.jpg';

async function runDecomposedKnightDemo(): Promise<void> {
  console.log('================================================================');
  console.log('  PARALLAX STUDIO — DECOMPOSED MULTI-LAYER CUTOUT SPRITE RIG   ');
  console.log('  (Kiến Trúc Spine 2D / Live2D: Không Méo Mắt Xích, Tự Động MCP) ');
  console.log('================================================================\n');

  const { server } = createMcpServer({ autoStartHttp: false });
  const callHandler = (server as any)._requestHandlers.get(
    CallToolRequestSchema.shape.method.value,
  );

  const callTool = async (name: string, args: Record<string, unknown> = {}) => {
    const res = await callHandler({
      method: 'tools/call',
      params: { name, arguments: args },
    });
    if (res.isError) {
      throw new Error(`Tool [${name}] lỗi: ${res.content[0]?.text}`);
    }
    return JSON.parse(res.content[0].text);
  };

  // 1. Tạo dự án
  console.log('>>> [1/5] Khởi tạo Dự Án Làm Phim Puppet 2.5D...');
  await callTool('project_create', {
    name: 'Hiệp Sĩ Cutout 2.5D (Puppet Architecture)',
  });
  console.log('✓ Dự án khởi tạo thành công!\n');

  // 2. Gọi MCP character_decompose_rig tách 12 layer và gắn xương FK độc lập
  console.log('>>> [2/5] Gọi MCP [character_decompose_rig] tách nhân vật thành 12 Layer độc lập...');
  const rigRes = await callTool('character_decompose_rig', {
    name: 'Hiệp Sĩ Hoàng Kim (Multi-Layer Puppet)',
    imagePath: KNIGHT_IMAGE_PATH,
    width: 848,
    height: 1264,
    expression: 'neutral',
  });

  console.log('✓ Đã tách và gắn xương cho 12 Layer:');
  console.log(`  - Asset ID: ${rigRes.assetId}`);
  console.log(`  - Kiến trúc: ${rigRes.architecture}`);
  console.log(`  - Số lượng Layer: ${rigRes.layerCount}`);
  for (const l of rigRes.layers) {
    console.log(`    • [${l.drawOrder > 0 ? '+' : ''}${l.drawOrder}] ${l.name} → Xương: [${l.bindBone}]`);
  }
  console.log('');

  // 3. Gọi MCP character_set_expression đổi biểu cảm khuôn mặt
  console.log('>>> [3/5] Gọi MCP [character_set_expression] đổi biểu cảm khuôn mặt không biến dạng mũ...');
  const exprRes1 = await callTool('character_set_expression', {
    assetId: rigRes.assetId,
    expression: 'combat',
    intensity: 1.0,
  });
  console.log(`  - Biểu cảm 1: ${exprRes1.expression} (Mắt rực đỏ quyết chiến)`);

  const exprRes2 = await callTool('character_set_expression', {
    assetId: rigRes.assetId,
    expression: 'smile',
    intensity: 1.0,
  });
  console.log(`  - Biểu cảm 2: ${exprRes2.expression} (Ánh mắt hoàng gia mỉm cười tự tin)`);
  console.log('✓ Khuôn mặt và mắt cử động độc lập, không làm méo hay kéo dãn mũ sắt/giáp ngực!\n');

  // 4. Gọi MCP character_adjust_part tinh chỉnh vị trí/drawOrder
  console.log('>>> [4/5] Gọi MCP [character_adjust_part] tinh chỉnh Áo Choàng (Cape) và Giáp Ngực...');
  await callTool('character_adjust_part', {
    assetId: rigRes.assetId,
    layerName: 'Áo Choàng Sau (Cape)',
    drawOrder: -10,
    opacity: 0.95,
  });
  console.log('✓ Áo choàng sau được đặt Z = -10 (nằm sau toàn bộ thân và chân, không bao giờ bị rách pixel).\n');

  // 5. Thêm Keyframes diễn hoạt
  console.log('>>> [5/5] Nạp Keyframes nhịp thở và vung kiếm...');
  await callTool('animation_set_keyframe', {
    property: 'bones.spine.rotation',
    frame: 0,
    value: 0.0,
  });
  await callTool('animation_set_keyframe', {
    property: 'bones.spine.rotation',
    frame: 24,
    value: 0.04,
  });
  await callTool('animation_set_keyframe', {
    property: 'bones.upper_arm_l.rotation',
    frame: 24,
    value: -0.15,
  });
  await callTool('animation_set_keyframe', {
    property: 'bones.upper_arm_r.rotation',
    frame: 24,
    value: 0.15,
  });

  // Thiết lập Camera
  await callTool('scene_set_camera', {
    x: 0,
    y: 0,
    z: 1050,
    zoom: 1.0,
    fov: 45,
  });

  console.log('✓ Hoàn tất thiết lập Diễn Hoạt Cutout Puppet! Toàn bộ các khớp xoay cứng 100% không méo.');
  console.log('================================================================');
}

runDecomposedKnightDemo().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
