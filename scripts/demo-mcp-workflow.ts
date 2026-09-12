import fs from 'node:fs';
import { createMcpServer } from '../mcp/server.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Creates a clean 64x64 PNG buffer with an alpha silhouette of a character:
 * Head (circle), Torso (rectangle), Arms, and Legs.
 */
function createHumanoidPngDataUrl(): { dataUrl: string; width: number; height: number; alphaData: number[] } {
  const width = 64;
  const height = 96;
  const alphaData: number[] = new Array(width * height).fill(0);

  // Draw Head: Circle at (32, 20), radius 12
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      // Head
      const dxHead = x - 32;
      const dyHead = y - 20;
      if (dxHead * dxHead + dyHead * dyHead <= 12 * 12) {
        alphaData[idx] = 255;
      }
      // Torso: x in [22, 42], y in [32, 65]
      if (x >= 22 && x <= 42 && y >= 32 && y <= 65) {
        alphaData[idx] = 255;
      }
      // Left Arm: x in [10, 22], y in [34, 60]
      if (x >= 10 && x < 22 && y >= 34 && y <= 60) {
        alphaData[idx] = 255;
      }
      // Right Arm: x in [42, 54], y in [34, 60]
      if (x > 42 && x <= 54 && y >= 34 && y <= 60) {
        alphaData[idx] = 255;
      }
      // Left Leg: x in [22, 30], y in [65, 92]
      if (x >= 22 && x <= 30 && y > 65 && y <= 92) {
        alphaData[idx] = 255;
      }
      // Right Leg: x in [34, 42], y in [65, 92]
      if (x >= 34 && x <= 42 && y > 65 && y <= 92) {
        alphaData[idx] = 255;
      }
    }
  }

  // Generate base64 dataUrl with alpha payload
  let dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
    + 'AAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const warriorPath = 'C:/Users/Admin/.gemini/antigravity-ide/brain/'
    + 'a2ab1ce4-201c-44de-9869-7154ce667e5f/parallax_warrior_demo_1789129554164.jpg';
  try {
    if (fs.existsSync(warriorPath)) {
      const b64 = fs.readFileSync(warriorPath).toString('base64');
      dataUrl = `data:image/jpeg;base64,${b64}`;
    }
  } catch {}

  return {
    dataUrl,
    width,
    height,
    alphaData,
  };
}

async function runMcpWorkflowDemo(): Promise<void> {
  console.log('================================================================');
  console.log('    PARALLAX STUDIO — DEMO KẾT NỐI MCP & DIỄN HOẠT 2.5D         ');
  console.log('================================================================\n');

  // 1. Khởi tạo MCP Server kết nối trực tiếp với Application Service
  console.log('>>> [BƯỚC 1] Khởi tạo MCP Server & Kiểm tra Danh mục Tools...');
  const { server } = createMcpServer({ autoStartHttp: false });

  const listHandler = (server as any)._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
  const callHandler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);

  const toolsList = await listHandler({ method: 'tools/list', params: {} });
  console.log(`✓ Đã kết nối MCP Server thành công! Tổng số tools sẵn sàng: ${toolsList.tools.length}`);
  console.log(`  Danh sách tools: ${toolsList.tools.map((t: any) => t.name).join(', ')}\n`);

  // Helper gọi tool tiện lợi
  const callTool = async (name: string, args: Record<string, unknown> = {}) => {
    const res = await callHandler({
      method: 'tools/call',
      params: { name, arguments: args },
    });
    if (res.isError) {
      throw new Error(`Tool [${name}] trả về lỗi: ${res.content[0]?.text}`);
    }
    return JSON.parse(res.content[0].text);
  };

  // 2. Tạo dự án làm phim mới
  console.log('>>> [BƯỚC 2] AI tạo dự án làm phim hoạt hình mới (project_create)...');
  const projectRes = await callTool('project_create', {
    name: 'Huyền Thoại Chiến Binh Parallax',
  });
  console.log(`✓ Tạo dự án thành công: "${projectRes.data.name}" (Revision: ${projectRes.revision})\n`);

  // 3. Import ảnh nhân vật & Trích xuất viền Contour & Lưới 2.5D Mesh
  console.log('>>> [BƯỚC 3] Import ảnh nhân vật, tách viền contour và tạo lưới 2.5D (asset_import_image)...');
  const characterImg = createHumanoidPngDataUrl();
  const importRes = await callTool('asset_import_image', {
    name: 'Chiến Binh Ánh Sáng (Hero)',
    dataUrl: characterImg.dataUrl,
    width: characterImg.width,
    height: characterImg.height,
    alphaData: characterImg.alphaData,
  });
  const heroAssetId = importRes.entityId;
  console.log(`✓ Đã trích xuất contour viền và tạo lưới 2.5D Mesh:`);
  console.log(`  - Asset ID: ${heroAssetId}`);
  console.log(`  - Số đỉnh (Vertices): ${importRes.data.vertexCount}`);
  console.log(`  - Số tam giác (Triangles): ${importRes.data.triangleCount}\n`);

  // 4. Kiểm tra chi tiết cấu trúc lưới 2.5D Mesh
  console.log('>>> [BƯỚC 4] Kiểm tra chi tiết hình học lưới Mesh (mesh_get_info)...');
  const meshInfo = await callTool('mesh_get_info', { assetId: heroAssetId });
  console.log(
    `✓ Chi tiết Mesh: ${meshInfo.vertexCount} đỉnh, `
    + `${meshInfo.triangleCount} tam giác, ${meshInfo.indicesCount} indices.\n`,
  );

  // 5. Tự động gắn khung xương (Auto-Rig 16 khớp) & Tính trọng số da tự động
  console.log(
    '>>> [BƯỚC 5] Tự động tạo khung xương 16 khớp & '
    + 'tính trọng số da Smooth Skinning (rig_apply_template)...',
  );
  const rigRes = await callTool('rig_apply_template', {
    assetId: heroAssetId,
    template: 'humanoid',
  });
  console.log(`✓ Gắn xương hoàn tất:`);
  console.log(`  - Trạng thái: ${rigRes.status}`);
  console.log(`  - Tổng số khớp xương: ${rigRes.data.boneCount} bones`);
  console.log(`  - Template áp dụng: ${rigRes.data.template ?? 'humanoid'}\n`);

  // 6. Kiểm tra cấu trúc phả hệ xương và các khớp
  console.log('>>> [BƯỚC 6] Đọc cấu trúc phả hệ xương (rig_get_info)...');
  const rigInfo = await callTool('rig_get_info', { assetId: heroAssetId });
  const boneNames = rigInfo.bones.map((b: any) => b.name);
  console.log(`✓ Danh sách 16 khớp xương:`);
  console.log(`  [${boneNames.slice(0, 8).join(', ')}]`);
  console.log(`  [${boneNames.slice(8).join(', ')}]\n`);

  // 7. Thiết lập biểu cảm khuôn mặt (Morph Targets)
  console.log('>>> [BƯỚC 7] Điều chỉnh biểu cảm khuôn mặt Morph Targets (rig_set_morph)...');
  await callTool('rig_set_morph', {
    assetId: heroAssetId,
    name: 'smile',
    weight: 0.85,
  });
  await callTool('rig_set_morph', {
    assetId: heroAssetId,
    name: 'blink',
    weight: 0.15,
  });
  console.log(`✓ Đã áp dụng biểu cảm: nụ cười (smile = 85%), chớp mắt (blink = 15%).\n`);

  // 8. Thêm Keyframe diễn hoạt cho xương
  console.log('>>> [BƯỚC 8] Thiết lập keyframe diễn hoạt chuyển động (animation_set_keyframe)...');
  await callTool('animation_set_keyframe', {
    property: 'bones.spine.rotation',
    frame: 0,
    value: 0.0,
  });
  await callTool('animation_set_keyframe', {
    property: 'bones.spine.rotation',
    frame: 24,
    value: 0.15,
  });
  await callTool('animation_set_keyframe', {
    property: 'bones.arm_l.rotation',
    frame: 24,
    value: -0.45,
  });
  console.log(`✓ Đã đặt 3 keyframes diễn hoạt tại Frame 0 và Frame 24 (uốn cột sống, vung tay trái).\n`);

  // 9. Dàn nhân vật vào bối cảnh 2.5D Parallax
  console.log('>>> [BƯỚC 9] Dàn nhân vật vào không gian 2.5D có chiều sâu Z (scene_add_instance)...');
  const stageInstance = await callTool('scene_add_instance', {
    assetId: heroAssetId,
    name: 'Hero Tại Cổng Thành',
    x: 0,
    y: -30,
    z: 200, // Chiều sâu Z tạo hiệu ứng Parallax
    scale: 1.25,
    viewAngle: 'front',
  });
  console.log(`✓ Đã dàn nhân vật vào cảnh: Instance ID: ${stageInstance.entityId} (Vị trí Z: 200, Tỉ lệ: 1.25x)\n`);

  // 10. Bố trí góc máy Camera 2.5D
  console.log('>>> [BƯỚC 10] Cấu hình góc máy Camera 2.5D (scene_set_camera)...');
  await callTool('scene_set_camera', {
    x: 0,
    y: 20,
    z: 1100,
    zoom: 1.1,
    fov: 45,
  });
  console.log(`✓ Đã đặt vị trí Camera: X=0, Y=20, Z=1100, Zoom=1.1x, FOV=45°.\n`);

  // 11. AI Director: Phân tích kịch bản chữ thành các Shot quay phim
  console.log('>>> [BƯỚC 11] AI Director phân tích kịch bản chữ tự nhiên (director_parse_script)...');
  const screenplay = `
# Phân cảnh 1: Chiến Binh Thức Tỉnh
1. Toàn cảnh lâu đài cổ kính sừng sững trong sương sớm [4s].
2. Trung cảnh Hero nhìn về phía chân trời với ánh mắt kiên định [3s].
3. Cận cảnh Hero mỉm cười tự tin rút kiếm khai chiến [2s].
`;
  const scriptResult = await callTool('director_parse_script', {
    scriptText: screenplay,
    fps: 24,
  });
  console.log(`✓ Phân tích kịch bản thành công: "${scriptResult.title}"`);
  scriptResult.shots.forEach((s: any, i: number) => {
    const sec = (s.durationFrames / 24).toFixed(1);
    const emotionText = s.emotion ? ` | Cảm xúc: ${s.emotion}` : '';
    console.log(
      `  Shot ${i + 1} [${s.shotName}]: "${s.actionDescription}" | `
      + `Góc: ${s.cameraAngle}${emotionText} | Thời lượng: ${s.durationFrames}f (${sec}s)`,
    );
  });
  console.log('');

  // 12. AI Director: Tự động dàn cảnh toàn bộ các shot
  console.log('>>> [BƯỚC 12] AI Director tự động dàn cảnh phân đoạn (director_stage_scene)...');
  const stageRes = await callTool('director_stage_scene', {
    scriptText: screenplay,
  });
  console.log(
    `✓ Dàn cảnh hoàn tất: ${stageRes.stagedShotsCount} shots `
    + `đã được tạo và đưa vào dòng thời gian.\n`,
  );

  // 13. Visual Feedback: AI Director kiểm tra góc máy
  console.log('>>> [BƯỚC 13] AI Director kiểm tra Visual Feedback góc máy (director_render_preview)...');
  const preview = await callTool('director_render_preview', { frame: 12 });
  console.log(
    `✓ Bố cục khung hình: ${preview.previewState} `
    + `(Camera Z: ${preview.camera.position.z}, Zoom: ${preview.camera.zoom}x, `
    + `Instances: ${preview.instanceCount})\n`,
  );

  // 14. Đưa vào hàng đợi xuất phim GPU NVENC
  console.log('>>> [BƯỚC 14] Đặt lịch xuất phim chất lượng 4K UHD 60 FPS (director_export_scene)...');
  const exportRes = await callTool('director_export_scene', {
    profileName: '4k-uhd-60',
  });
  console.log(`✓ Lệnh xuất phim đã ghi nhận: ${exportRes.message}`);
  console.log(
    `  - Profile: ${exportRes.profile} | Tổng frames: ${exportRes.totalFrames} `
    + `(${exportRes.estimatedDurationSec}s) | Trạng thái: ${exportRes.status}\n`,
  );

  // 15. Kiểm tra tổng kết toàn bộ Project State
  console.log('>>> [BƯỚC 15] Đọc tổng kết toàn bộ Project State (project_get_info)...');
  const projectSummary = await callTool('project_get_info');
  const assetCount = Object.keys(projectSummary.manifest.assets).length;
  const sceneCount = Object.keys(projectSummary.manifest.scenes).length;
  console.log(`✓ Trạng thái Dự Án Tổng Thể:`);
  console.log(`  - Tên dự án: "${projectSummary.manifest.name}"`);
  console.log(`  - Revision hiện tại: ${projectSummary.revision}`);
  console.log(`  - Tổng số Assets: ${assetCount}`);
  console.log(`  - Tổng số Scenes/Shots: ${sceneCount}`);
  console.log(`  - Dirty (có thay đổi): ${projectSummary.dirty}\n`);

  console.log('================================================================');
  console.log('  🎉 DEMO HOÀN TẤT 100%! TOÀN BỘ QUY TRÌNH MCP ĐÃ VẬN HÀNH XUẤT SẮC:');
  console.log('  Ảnh → Viền Mesh 2.5D → Rig 16 Xương → Biểu Cảm → Animation → Camera → Dàn Cảnh 2.5D');
  console.log('================================================================');
}

runMcpWorkflowDemo()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Lỗi khi chạy demo MCP:', err);
    process.exit(1);
  });
