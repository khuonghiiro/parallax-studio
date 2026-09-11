import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  CommandBus,
  CommandRegistry,
  ProjectState,
  registerDefaultHandlers,
} from '@parallax/application';
import {
  handleDirectorParseScript,
  handleDirectorStageScene,
  handleDirectorRenderPreview,
  handleDirectorExportScene,
} from './director-tools.js';

/**
 * Parallax Studio MCP Server.
 * Exposes core animation, rigging, and project pipeline tools to AI agents.
 */
export function createMcpServer(): {
  server: Server;
  bus: CommandBus;
  state: ProjectState;
} {
  const bus = new CommandBus();
  const registry = new CommandRegistry();
  const state = new ProjectState();

  registerDefaultHandlers(bus, registry, state);

  // Initialize a default project
  bus.dispatch({
    type: 'create_project',
    domain: 'project',
    data: { name: 'MCP Default Project' },
  });

  const server = new Server(
    {
      name: 'parallax-studio-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // List all available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'project_create',
          description: 'Create a new Parallax animation project',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project title' },
            },
            required: ['name'],
          },
        },
        {
          name: 'project_get_info',
          description: 'Get project metadata, revision, and asset list',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'project_save',
          description: 'Save project manifest and assets to disk',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Directory path' },
            },
          },
        },
        {
          name: 'asset_import_image',
          description: 'Import image into project with contour extraction and 2.5D mesh generation',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Layer or asset name' },
              dataUrl: { type: 'string', description: 'Image base64 data URL' },
              width: { type: 'number', description: 'Image width in px' },
              height: { type: 'number', description: 'Image height in px' },
            },
            required: ['name', 'dataUrl'],
          },
        },
        {
          name: 'asset_list',
          description: 'List all imported image assets and rig statuses in the project',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'mesh_get_info',
          description: 'Get mesh geometry details (vertex count, triangles, topology) for an asset',
          inputSchema: {
            type: 'object',
            properties: {
              assetId: { type: 'string', description: 'Target asset entity ID' },
            },
            required: ['assetId'],
          },
        },
        {
          name: 'rig_apply_template',
          description: 'Apply skeletal rig template and auto-calculate vertex skinning weights',
          inputSchema: {
            type: 'object',
            properties: {
              assetId: { type: 'string', description: 'Asset ID to rig' },
              template: { type: 'string', enum: ['humanoid'], description: 'Rig template type' },
            },
            required: ['assetId'],
          },
        },
        {
          name: 'animation_set_keyframe',
          description: 'Add or update a keyframe value on an animation property track',
          inputSchema: {
            type: 'object',
            properties: {
              property: { type: 'string', description: 'Property path (e.g. bones.spine.rotation)' },
              frame: { type: 'number', description: 'Timeline frame number (24fps)' },
              value: { type: 'number', description: 'Numeric property value' },
              sceneId: { type: 'string', description: 'Optional scene ID' },
            },
            required: ['property', 'frame', 'value'],
          },
        },
        {
          name: 'director_parse_script',
          description: 'AI Director: Parse screenplay text into structured shots and character cues',
          inputSchema: {
            type: 'object',
            properties: {
              scriptText: { type: 'string', description: 'Screenplay or prompt text' },
              fps: { type: 'number', description: 'Frames per second (default 24)' },
            },
            required: ['scriptText'],
          },
        },
        {
          name: 'director_stage_scene',
          description: 'AI Director: Automatically place shots, set camera framing, and stage animation',
          inputSchema: {
            type: 'object',
            properties: {
              scriptText: { type: 'string', description: 'Screenplay text to stage' },
              sceneId: { type: 'string', description: 'Target scene entity ID' },
            },
          },
        },
        {
          name: 'director_render_preview',
          description: 'AI Director: Inspect shot framing, camera depth, and visual composition metadata',
          inputSchema: {
            type: 'object',
            properties: {
              sceneId: { type: 'string', description: 'Scene entity ID' },
              frame: { type: 'number', description: 'Timeline frame number' },
            },
          },
        },
        {
          name: 'director_export_scene',
          description: 'AI Director: Queue scene film export for final video rendering',
          inputSchema: {
            type: 'object',
            properties: {
              sceneId: { type: 'string', description: 'Scene entity ID' },
              profileName: { type: 'string', description: 'Target export profile name' },
            },
          },
        },
      ],
    };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    switch (name) {
      case 'project_create': {
        const res = await bus.dispatch({
          type: 'create_project',
          domain: 'project',
          data: { name: args.name as string },
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      }

      case 'project_get_info': {
        const snap = state.getSnapshot();
        return {
          content: [{ type: 'text', text: JSON.stringify(snap, null, 2) }],
        };
      }

      case 'project_save': {
        const res = await bus.dispatch({
          type: 'save_project',
          domain: 'project',
          data: { projectPath: args.projectPath as string },
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      }

      case 'asset_import_image': {
        const res = await bus.dispatch({
          type: 'import_image',
          domain: 'asset',
          data: {
            name: args.name as string,
            dataUrl: args.dataUrl as string,
            width: (args.width as number) || 512,
            height: (args.height as number) || 512,
          },
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      }

      case 'asset_list': {
        const assets = state.getAllAssetData().map((a) => ({
          id: a.id,
          name: a.name,
          dimensions: a.dimensions,
          hasMesh: Boolean(a.mesh),
          vertexCount: a.mesh?.vertexCount ?? 0,
          triangleCount: a.mesh?.triangleCount ?? 0,
          hasRig: Boolean(a.skeleton),
          boneCount: a.skeleton?.bones.length ?? 0,
        }));
        return {
          content: [{ type: 'text', text: JSON.stringify(assets, null, 2) }],
        };
      }

      case 'mesh_get_info': {
        const assetId = args.assetId as string;
        const asset = state.getAssetData(assetId);
        if (!asset || !asset.mesh) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Mesh not found for asset: ${assetId}` }],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  assetId,
                  vertexCount: asset.mesh.vertexCount,
                  triangleCount: asset.mesh.triangleCount,
                  indicesCount: asset.mesh.indices.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'rig_apply_template': {
        const res = await bus.dispatch({
          type: 'apply_rig_template',
          domain: 'rig',
          targetId: args.assetId as string,
          data: {
            assetId: args.assetId as string,
            template: (args.template as string) || 'humanoid',
          },
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      }

      case 'animation_set_keyframe': {
        const res = await bus.dispatch({
          type: 'set_keyframe',
          domain: 'animation',
          data: {
            sceneId: args.sceneId as string,
            property: args.property as string,
            frame: args.frame as number,
            value: args.value as number,
          },
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      }

      case 'director_parse_script':
        return handleDirectorParseScript(args);

      case 'director_stage_scene':
        return await handleDirectorStageScene(bus, state, args);

      case 'director_render_preview':
        return handleDirectorRenderPreview(state, args);

      case 'director_export_scene':
        return handleDirectorExportScene(state, args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return { server, bus, state };
}

async function run(): Promise<void> {
  const { server } = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Start stdio transport when executed directly
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  run().catch((err) => {
    console.error('MCP Server error:', err);
    process.exit(1);
  });
}
