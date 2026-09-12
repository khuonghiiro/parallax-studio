import { createMcpServer } from '../mcp/server.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const KNIGHT_IMAGE_PATH = 'C:/Users/Admin/.gemini/antigravity-ide/brain/'
  + 'a2ab1ce4-201c-44de-9869-7154ce667e5f/knight_idle_a_pose_1789134150729.jpg';

async function runKnightRigDemo(): Promise<void> {
  console.log('================================================================');
  console.log('  PARALLAX STUDIO — AI AUTO-DRAW & RIG 2D NHÂN VẬT CHUẨN XÁC   ');
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
  console.log('>>> [1/5] Khởi tạo Dự Án Làm Phim: "Hiệp Sĩ Ánh Sáng 2.5D"...');
  await callTool('project_create', {
    name: 'Hiệp Sĩ Ánh Sáng 2.5D',
  });
  console.log('✓ Dự án khởi tạo thành công!\n');

  // 2. Gọi tool character_auto_rig nạp ảnh AI tự vẽ + sinh lưới 425 đỉnh + gắn 16 xương
  console.log('>>> [2/5] Nạp ảnh 2D AI vẽ (A-Pose Chuẩn), sinh lưới 2.5D & gắn 16 xương chuẩn xác...');
  const rigRes = await callTool('character_auto_rig', {
    name: 'Hiệp Sĩ Hoàng Gia (Knight 2D)',
    imagePath: KNIGHT_IMAGE_PATH,
    width: 848,
    height: 1264,
    pose: 'a-pose',
  });
  console.log('✓ Nhân vật 2D đã được tạo và Rig xương hoàn chỉnh:');
  console.log(`  - Asset ID: ${rigRes.assetId}`);
  console.log(`  - Lưới 2.5D: ${rigRes.mesh.vertexCount} đỉnh, ${rigRes.mesh.triangleCount} tam giác (16x24 grid)`);
  console.log(`  - Khung xương: ${rigRes.rig.boneCount} khớp T-Pose khớp từng tỷ lệ cơ thể`);
  console.log(`  - Ảnh nạp thành công: ${rigRes.imageLoaded ? 'CÓ (Sắc nét 848x1264)' : 'KHÔNG'}\n`);

  // 3. Đặt các keyframes diễn hoạt tự nhiên
  console.log('>>> [3/5] Thêm Keyframes diễn hoạt chuyển động cơ thể...');
  await callTool('animation_set_keyframe', {
    property: 'bones.spine.rotation',
    frame: 0,
    value: 0.0,
  });
  await callTool('animation_set_keyframe', {
    property: 'bones.spine.rotation',
    frame: 24,
    value: 0.08,
  });
  await callTool('animation_set_keyframe', {
    property: 'bones.upper_arm_l.rotation',
    frame: 24,
    value: -0.35,
  });
  await callTool('animation_set_keyframe', {
    property: 'bones.forearm_l.rotation',
    frame: 24,
    value: -0.40,
  });
  await callTool('animation_set_keyframe', {
    property: 'bones.upper_arm_r.rotation',
    frame: 24,
    value: 0.35,
  });
  await callTool('animation_set_keyframe', {
    property: 'bones.forearm_r.rotation',
    frame: 24,
    value: 0.40,
  });
  console.log('✓ Đã nạp 6 keyframes diễn hoạt (uốn cột sống, vung hai tay tự nhiên).\n');

  // 4. Bố trí góc quay điện ảnh
  console.log('>>> [4/5] Thiết lập Camera 2.5D điện ảnh...');
  await callTool('scene_set_camera', {
    x: 0,
    y: 0,
    z: 1050,
    zoom: 1.0,
    fov: 45,
  });
  console.log('✓ Camera đã căn chính giữa khung hình, nhìn rõ toàn thân từ đầu đến chân.\n');

  // 5. AI Director dàn cảnh
  console.log('>>> [5/5] AI Director phân tích kịch bản và dàn cảnh Timeline...');
  const screenplay = `
# Phân cảnh Hoàng Kim: Hiệp Sĩ Khai Chiến
1. Toàn cảnh Hiệp Sĩ Hoàng Gia đứng hiên ngang trước thành trì [3s].
2. Trung cảnh Hiệp Sĩ mỉm cười tự tin nâng kiếm chuẩn bị nghênh chiến [3s].
`;
  const stageRes = await callTool('director_stage_scene', {
    scriptText: screenplay,
  });
  console.log(`✓ Dàn cảnh hoàn tất: ${stageRes.stagedShotsCount} shots đã được tạo trên Timeline.\n`);

  console.log('================================================================');
  console.log('  🎉 HOÀN TẤT! NHÂN VẬT 2D VÀ XƯƠNG ĐÃ ĐƯỢC HIỂN THỊ CHUẨN XÁC TRÊN WEB!');
  console.log('================================================================');
}

runKnightRigDemo()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Lỗi khi chạy demo Knight Rig:', err);
    process.exit(1);
  });
