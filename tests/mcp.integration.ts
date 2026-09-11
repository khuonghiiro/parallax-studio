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

  console.log('--- MCP Integration Test Passed Successfully! ---');
}

runIntegrationTest().catch((err) => {
  console.error('MCP Integration Test Failed:', err);
  process.exit(1);
});
