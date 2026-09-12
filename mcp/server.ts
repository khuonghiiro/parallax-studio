import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  CommandBus,
  ProjectState,
  ApplicationService,
  getApplicationService,
  reconstructSnapshot,
  type ProjectSnapshot,
  type SerializableSnapshot,
} from '@parallax/application';
import type { CommandPayload, CommandResult } from '@parallax/contracts';
import { startApplicationService } from '../packages/application/src/service/http-server.js';
import {
  handleDirectorParseScript,
  handleDirectorStageScene,
  handleDirectorRenderPreview,
  handleDirectorExportScene,
} from './director-tools.js';
import {
  CHARACTER_TOOL_DEFS,
  handleCharacterAutoRig,
  handleCharacterDecomposeRig,
  handleCharacterSetExpression,
  handleCharacterAdjustPart,
} from './character-tools.js';

export interface McpServerOptions {
  service?: ApplicationService;
  remoteUrl?: string;
  autoStartHttp?: boolean;
  port?: number;
}

/**
 * Parallax Studio MCP Server.
 * Exposes core animation, rigging, and project pipeline tools to AI agents.
 */
export function createMcpServer(options: McpServerOptions = {}): {
  server: Server;
  bus: CommandBus;
  state: ProjectState;
  service: ApplicationService;
} {
  const service = options.service ?? getApplicationService();
  const bus = service.commandBus;
  const state = service.projectState;
  const remoteUrl = options.remoteUrl ?? process.env.PARALLAX_REMOTE_URL;

  // When remoteUrl is explicitly configured, relay commands to remote app without dual-execution or local fallback
  if (remoteUrl) {
    bus.use(async (payload) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${remoteUrl}/commands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          return (await res.json()) as CommandResult;
        }
        const errorText = await res.text().catch(() => '');
        return {
          status: 'error',
          error: `Remote relay error (${res.status}): ${errorText || res.statusText}`,
        };
      } catch (err) {
        return {
          status: 'error',
          error: `Remote relay unreachable at ${remoteUrl}: ${(err as Error).message}`,
        };
      }
    });
  }

  async function getActiveSnapshot(): Promise<ProjectSnapshot | null> {
    if (remoteUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${remoteUrl}/state`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const body = (await res.json()) as { status: string; snapshot: SerializableSnapshot };
          if (body.snapshot) {
            return reconstructSnapshot(body.snapshot);
          }
        }
      } catch {}
      return null;
    }
    return state.getSnapshot();
  }

  if (options.autoStartHttp === true) {
    startApplicationService({
      port: options.port ?? 3100,
      service,
    }).catch(() => {
      // Ignore if port 3100 is already bound by existing service process
    });
  }

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
        {
          name: 'rig_get_info',
          description: 'Inspect bone hierarchy, landmarks, and morph targets for an asset',
          inputSchema: {
            type: 'object',
            properties: {
              assetId: { type: 'string', description: 'Target asset entity ID' },
            },
            required: ['assetId'],
          },
        },
        {
          name: 'rig_set_morph',
          description: 'Set blend weight for facial morph target (smile, blink, mouth, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              assetId: { type: 'string', description: 'Target asset entity ID' },
              name: { type: 'string', description: 'Morph target name' },
              weight: { type: 'number', description: 'Blend weight from 0.0 to 1.0' },
            },
            required: ['assetId', 'name', 'weight'],
          },
        },
        {
          name: 'scene_add_instance',
          description: 'Stage an asset instance into the 2.5D scene with position, depth, and view angle',
          inputSchema: {
            type: 'object',
            properties: {
              assetId: { type: 'string', description: 'Asset ID to stage' },
              name: { type: 'string', description: 'Instance label' },
              x: { type: 'number', description: 'X position in world units' },
              y: { type: 'number', description: 'Y position in world units' },
              z: { type: 'number', description: 'Z depth for parallax sorting' },
              scale: { type: 'number', description: 'Uniform scale multiplier' },
              viewAngle: { type: 'string', description: 'Active view angle' },
            },
            required: ['assetId'],
          },
        },
        {
          name: 'scene_set_camera',
          description: 'Configure 2.5D perspective/orthographic camera framing, position, and zoom',
          inputSchema: {
            type: 'object',
            properties: {
              x: { type: 'number', description: 'Camera X position' },
              y: { type: 'number', description: 'Camera Y position' },
              z: { type: 'number', description: 'Camera Z depth distance' },
              zoom: { type: 'number', description: 'Camera zoom factor' },
              fov: { type: 'number', description: 'Field of view in degrees' },
            },
          },
        },
        ...CHARACTER_TOOL_DEFS,
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
        const snap = await getActiveSnapshot();
        const manifest = snap?.manifest ?? state.getManifest();
        const revision = snap?.revision ?? state.getRevision();
        const assetMap = snap?.assets ?? state.getSnapshot().assets;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  manifest,
                  revision,
                  assetCount: assetMap.size,
                  assets: Array.from(assetMap.values()).map((a) => ({
                    id: a.id,
                    name: a.name,
                  })),
                },
                null,
                2,
              ),
            },
          ],
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
            alphaData: args.alphaData as number[] | undefined,
          },
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      }

      case 'asset_list': {
        const snap = await getActiveSnapshot();
        const assetMap = snap?.assets ?? state.getSnapshot().assets;
        const assets = Array.from(assetMap.values()).map((a) => ({
          id: a.id,
          name: a.name,
          dimensions: a.dimensions,
          hasMesh: Boolean(a.mesh),
          vertexCount: a.mesh?.vertexCount ?? 0,
          triangleCount: a.mesh?.triangleCount ?? 0,
          hasRig: Boolean(a.skeleton),
          boneCount: a.skeleton?.bones?.length ?? 0,
        }));
        return {
          content: [{ type: 'text', text: JSON.stringify(assets, null, 2) }],
        };
      }

      case 'mesh_get_info': {
        const assetId = args.assetId as string;
        const snap = await getActiveSnapshot();
        const asset = snap?.assets?.get(assetId) ?? state.getAssetData(assetId);
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

      case 'rig_get_info': {
        const assetId = args.assetId as string;
        const snap = await getActiveSnapshot();
        const asset = snap?.assets?.get(assetId) ?? state.getAssetData(assetId);
        if (!asset) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Asset ${assetId} not found` }],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  assetId,
                  hasRig: Boolean(asset.skeleton),
                  boneCount: asset.skeleton?.bones.length ?? 0,
                  bones: asset.skeleton?.bones ?? [],
                  weightsCount: asset.weights?.length ?? 0,
                  morphTargets: asset.morphTargets ?? [],
                  activeView: asset.viewSet?.activeView ?? 'front',
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'rig_set_morph': {
        const res = await bus.dispatch({
          type: 'set_morph_weight',
          domain: 'rig',
          targetId: args.assetId as string,
          data: {
            assetId: args.assetId as string,
            name: args.name as string,
            weight: Number(args.weight),
          },
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      }

      case 'scene_add_instance': {
        const res = await bus.dispatch({
          type: 'add_instance',
          domain: 'scene',
          data: {
            assetId: args.assetId as string,
            name: (args.name as string) || 'Character Instance',
            position: {
              x: Number(args.x ?? 0),
              y: Number(args.y ?? 0),
              z: Number(args.z ?? 0),
            },
            scale: {
              x: Number(args.scale ?? 1),
              y: Number(args.scale ?? 1),
            },
            viewAngle: args.viewAngle as string,
          },
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      }

      case 'scene_set_camera': {
        const res = await bus.dispatch({
          type: 'set_camera',
          domain: 'scene',
          data: {
            camera: {
              position: {
                x: Number(args.x ?? 0),
                y: Number(args.y ?? 0),
                z: Number(args.z ?? 1000),
              },
              zoom: Number(args.zoom ?? 1),
              fov: Number(args.fov ?? 45),
            },
          },
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      }

      case 'character_auto_rig':
        return await handleCharacterAutoRig(bus, args);

      case 'character_decompose_rig':
        return await handleCharacterDecomposeRig(bus, args);

      case 'character_set_expression': {
        const getAsset = async (id: string) => {
          const snap = await getActiveSnapshot();
          return snap?.assets?.get(id) ?? state.getAssetData(id);
        };
        return await handleCharacterSetExpression(bus, args, getAsset);
      }

      case 'character_adjust_part': {
        const getAsset = async (id: string) => {
          const snap = await getActiveSnapshot();
          return snap?.assets?.get(id) ?? state.getAssetData(id);
        };
        return await handleCharacterAdjustPart(bus, args, getAsset);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return { server, bus, state };
}

async function run(): Promise<void> {
  const { server } = createMcpServer({ autoStartHttp: true });
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
