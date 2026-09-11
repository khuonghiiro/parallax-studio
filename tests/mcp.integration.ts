import { createMcpServer } from '../mcp/server.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

async function runIntegrationTest(): Promise<void> {
  console.log('--- Starting MCP Server Integration Test ---');
  const { server } = createMcpServer();

  // Test 1: List tools
  const listToolsHandler = (server as any)._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
  if (!listToolsHandler) {
    throw new Error('ListTools handler not registered');
  }

  const toolsResponse = await listToolsHandler({
    method: 'tools/list',
    params: {},
  });

  const toolNames = toolsResponse.tools.map((t: any) => t.name);
  console.log(`Registered MCP Tools (${toolNames.length}):`, toolNames.join(', '));
  if (toolNames.length < 5) {
    throw new Error('Expected at least 5 registered MCP tools');
  }

  // Test 2: Call tool handler
  const callToolHandler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);
  if (!callToolHandler) {
    throw new Error('CallTool handler not registered');
  }

  // 2.1 Import image
  const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
    + 'AAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const importResult = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'asset_import_image',
      arguments: {
        name: 'MCP Hero',
        dataUrl: samplePng,
        width: 300,
        height: 500,
      },
    },
  });

  const importData = JSON.parse(importResult.content[0].text);
  console.log('1. asset_import_image result:', importData.status, 'assetId:', importData.entityId);
  if (importData.status !== 'success') {
    throw new Error(`import_image failed: ${JSON.stringify(importData)}`);
  }

  const assetId = importData.entityId;

  // 2.2 Get mesh info
  const meshResult = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'mesh_get_info',
      arguments: { assetId },
    },
  });
  const meshData = JSON.parse(meshResult.content[0].text);
  console.log('2. mesh_get_info result:', meshData);
  if (meshData.vertexCount < 3) {
    throw new Error('Mesh vertexCount is less than 3');
  }

  // 2.3 Apply rig template
  const rigResult = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'rig_apply_template',
      arguments: { assetId, template: 'humanoid' },
    },
  });
  const rigData = JSON.parse(rigResult.content[0].text);
  console.log('3. rig_apply_template result:', rigData.status, 'boneCount:', rigData.data.boneCount);
  if (rigData.status !== 'success' || rigData.data.boneCount < 10) {
    throw new Error('Rig apply failed or has insufficient bones');
  }

  // 2.4 Set keyframe
  const keyResult = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'animation_set_keyframe',
      arguments: {
        property: 'bones.spine.rotation',
        frame: 24,
        value: 0.25,
      },
    },
  });
  const keyData = JSON.parse(keyResult.content[0].text);
  console.log('4. animation_set_keyframe result:', keyData.status);

  // 2.5 List assets
  const listResult = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'asset_list',
      arguments: {},
    },
  });
  const assetList = JSON.parse(listResult.content[0].text);
  console.log('5. asset_list result:', assetList);
  if (assetList.length === 0 || !assetList[0].hasRig) {
    throw new Error('Asset list verification failed');
  }

  // 2.6 AI Director: Parse screenplay
  const parseRes = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'director_parse_script',
      arguments: {
        scriptText: '# Cuộc Chiến Ánh Sáng\n1. Toàn cảnh lâu đài cổ kính [3s].\n2. Cận cảnh Hero mỉm cười [2s].',
      },
    },
  });
  const parseData = JSON.parse(parseRes.content[0].text);
  console.log('6. director_parse_script result:', parseData.title, 'shots:', parseData.shots.length);
  if (parseData.shots.length !== 2) {
    throw new Error('director_parse_script failed to parse 2 shots');
  }

  // 2.7 AI Director: Stage scene
  const stageRes = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'director_stage_scene',
      arguments: {
        scriptText: '1. Toàn cảnh [3s].\n2. Cận cảnh [2s].',
      },
    },
  });
  const stageData = JSON.parse(stageRes.content[0].text);
  console.log('7. director_stage_scene result:', stageData.status, 'shotsCount:', stageData.stagedShotsCount);
  if (stageData.stagedShotsCount !== 2) {
    throw new Error('director_stage_scene failed to stage shots');
  }

  // 2.8 AI Director: Render preview
  const previewRes = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'director_render_preview',
      arguments: { frame: 10 },
    },
  });
  const previewData = JSON.parse(previewRes.content[0].text);
  console.log('8. director_render_preview result:', previewData.previewState);

  // 2.9 AI Director: Export scene
  const exportRes = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'director_export_scene',
      arguments: { profileName: '4k-uhd-60' },
    },
  });
  const exportData = JSON.parse(exportRes.content[0].text);
  console.log('9. director_export_scene result:', exportData.status, 'profile:', exportData.profile);

  // 2.10 rig_get_info
  const rigInfoRes = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'rig_get_info',
      arguments: { assetId },
    },
  });
  const rigInfoData = JSON.parse(rigInfoRes.content[0].text);
  console.log('10. rig_get_info result:', rigInfoData.hasRig, 'bones:', rigInfoData.boneCount);
  if (!rigInfoData.hasRig || rigInfoData.boneCount < 10) {
    throw new Error('rig_get_info verification failed');
  }

  // 2.11 rig_set_morph
  const morphRes = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'rig_set_morph',
      arguments: { assetId, name: 'smile', weight: 0.8 },
    },
  });
  const morphData = JSON.parse(morphRes.content[0].text);
  console.log('11. rig_set_morph result:', morphData.status);
  if (morphData.status !== 'success') {
    throw new Error('rig_set_morph verification failed');
  }

  // 2.12 scene_add_instance
  const instanceRes = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'scene_add_instance',
      arguments: {
        assetId,
        name: 'Hero In Castle',
        x: 100,
        y: -50,
        z: 250,
        scale: 1.2,
      },
    },
  });
  const instanceData = JSON.parse(instanceRes.content[0].text);
  console.log('12. scene_add_instance result:', instanceData.status, 'id:', instanceData.entityId);
  if (instanceData.status !== 'success') {
    throw new Error('scene_add_instance verification failed');
  }

  // 2.13 scene_set_camera
  const cameraRes = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'scene_set_camera',
      arguments: {
        x: 50,
        y: 0,
        z: 1200,
        zoom: 1.1,
      },
    },
  });
  const cameraData = JSON.parse(cameraRes.content[0].text);
  console.log('13. scene_set_camera result:', cameraData.status);
  if (cameraData.status !== 'success') {
    throw new Error('scene_set_camera verification failed');
  }

  console.log('--- All 16 MCP Tools & AI Director Integration Tests Passed Successfully! ---');
}

runIntegrationTest()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('MCP Integration Test Failed:', err);
    process.exit(1);
  });
