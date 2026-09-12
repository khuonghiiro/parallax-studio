import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CommandBus,
  CommandRegistry,
  ProjectState,
  registerDefaultHandlers,
  reconstructSnapshot,
  type ProjectSnapshot,
  type SerializableSnapshot,
  type AssetData,
} from '@parallax/application';
import type { CommandPayload, CommandResult } from '@parallax/contracts';
import type { WorkspaceId } from './layout/MenuBar.js';

export interface EditorContextValue {
  projectState: ProjectState;
  commandBus: CommandBus;
  commandRegistry: CommandRegistry;
  snapshot: ProjectSnapshot | null;
  workspace: WorkspaceId;
  setWorkspace: (ws: WorkspaceId) => void;
  mode: WorkspaceId;
  setMode: (mode: WorkspaceId) => void;
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  selectedBoneId: string | null;
  setSelectedBoneId: (id: string | null) => void;
  currentFrame: number;
  setCurrentFrame: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  fps: number;
  setFps: (fps: number) => void;
  isRemoteConnected: boolean;
  getAssetData: (id: string) => AssetData | undefined;
  dispatch: (payload: CommandPayload) => Promise<CommandResult>;
  importImageFile: (file: File) => Promise<string | undefined>;
  loadDemoCharacter: () => Promise<string | undefined>;
  activeClipId: string;
  setActiveClipId: (clip: string) => void;
  selectedInstanceId: string | null;
  setSelectedInstanceId: (id: string | null) => void;
  selectedShotId: string | null;
  setSelectedShotId: (id: string | null) => void;
  loadProjectFile: (file: File) => Promise<boolean>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return ctx;
}

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projectState] = useState(() => new ProjectState());
  const [commandBus] = useState(() => new CommandBus());
  const [commandRegistry] = useState(() => new CommandRegistry());

  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [mode, setMode] = useState<WorkspaceId>('draw');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedBoneId, setSelectedBoneId] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);
  const [isRemoteConnected, setIsRemoteConnected] = useState<boolean>(false);
  const [activeClipId, setActiveClipId] = useState<string>('idle');

  // Synchronize instance selection with asset selection
  const handleSelectInstance = useCallback((id: string | null) => {
    setSelectedInstanceId(id);
    if (id) {
      const scene = projectState.getAllSceneData()[0];
      const inst = scene?.instances?.find((i) => i.id === id);
      if (inst && inst.assetId) {
        setSelectedAssetId(inst.assetId);
      }
    }
  }, [projectState]);

  // Synchronize shot selection with playhead seek
  const handleSelectShot = useCallback((id: string | null) => {
    setSelectedShotId(id);
    if (id) {
      const scene = projectState.getAllSceneData()[0];
      const shot = scene?.shots?.find((s) => s.id === id);
      if (shot) {
        setCurrentFrame(shot.startFrame);
      }
    }
  }, [projectState]);

  // Initialize local command handlers & fallback project
  useEffect(() => {
    registerDefaultHandlers(commandBus, commandRegistry, projectState);

    const unsubscribe = projectState.subscribe((snap) => {
      // Only use local state if remote service is not connected
      if (!isRemoteConnected) {
        setSnapshot(snap);
      }
    });

    if (!projectState.isLoaded) {
      commandBus.dispatch({
        type: 'create_project',
        domain: 'project',
        data: { name: 'Parallax Film Project' },
      });
    }

    return () => {
      unsubscribe();
    };
  }, [commandBus, commandRegistry, projectState, isRemoteConnected]);

  // Connect to authoritative local Application Service via SSE
  useEffect(() => {
    let sse: EventSource | null = null;
    try {
      sse = new EventSource('/api/events');

      sse.onopen = () => {
        setIsRemoteConnected(true);
      };

      sse.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as {
            type: string;
            snapshot?: SerializableSnapshot;
          };
          if (parsed.snapshot) {
            const reconstructed = reconstructSnapshot(parsed.snapshot);
            setSnapshot(reconstructed);
            setIsRemoteConnected(true);

            // Synchronize in-browser projectState cache
            for (const [id, assetData] of reconstructed.assets) {
              projectState.setAssetData(id, assetData);
            }
            for (const [id, sceneData] of reconstructed.scenes) {
              projectState.setSceneData(id, sceneData);
            }
            if (reconstructed.manifest) {
              projectState.load(reconstructed.manifest);
            }

            // Auto-select latest asset when assets change
            setSelectedAssetId((prev) => {
              if (prev && reconstructed.assets.has(prev)) {
                return prev;
              }
              const keys = Array.from(reconstructed.assets.keys());
              return keys[keys.length - 1] || null;
            });
          }
        } catch {
          // Ignore parse errors on ping
        }
      };

      sse.onerror = () => {
        setIsRemoteConnected(false);
      };
    } catch {
      setIsRemoteConnected(false);
    }

    return () => {
      sse?.close();
    };
  }, []);

  const dispatch = useCallback(
    async (payload: CommandPayload): Promise<CommandResult> => {
      if (isRemoteConnected) {
        try {
          const res = await fetch('/api/commands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            return (await res.json()) as CommandResult;
          }
        } catch {
          // Fall back to local command bus if fetch fails
        }
      }
      return commandBus.dispatch(payload);
    },
    [commandBus, isRemoteConnected],
  );

  // Import image file from user's computer
  const importImageFile = useCallback(
    async (file: File): Promise<string | undefined> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            let alphaData: number[] | undefined;

            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imgData = ctx.getImageData(0, 0, img.width, img.height);
              alphaData = [];
              for (let i = 3; i < imgData.data.length; i += 4) {
                alphaData.push(imgData.data[i]!);
              }
            }

            const result = await dispatch({
              type: 'import_image',
              domain: 'asset',
              data: {
                name: file.name.replace(/\.[^/.]+$/, ''),
                dataUrl,
                width: img.width,
                height: img.height,
                alphaData,
              },
            });

            if (result.status === 'success' && result.entityId) {
              setSelectedAssetId(result.entityId);
              resolve(result.entityId);
            } else {
              resolve(undefined);
            }
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });
    },
    [dispatch],
  );

  // Load a demo character asset with silhouette and auto-rig
  const loadDemoCharacter = useCallback(async (): Promise<string | undefined> => {
    const width = 300;
    const height = 500;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Draw demo stylized 2D character silhouette
      ctx.fillStyle = '#6380ff';
      // Head
      ctx.beginPath();
      ctx.arc(width / 2, 70, 45, 0, Math.PI * 2);
      ctx.fill();

      // Torso
      ctx.beginPath();
      ctx.roundRect(width / 2 - 40, 120, 80, 150, 16);
      ctx.fill();

      // Left Arm
      ctx.beginPath();
      ctx.roundRect(width / 2 - 95, 130, 26, 120, 12);
      ctx.fill();

      // Right Arm
      ctx.beginPath();
      ctx.roundRect(width / 2 + 70, 130, 26, 120, 12);
      ctx.fill();

      // Left Leg
      ctx.beginPath();
      ctx.roundRect(width / 2 - 45, 280, 32, 180, 14);
      ctx.fill();

      // Right Leg
      ctx.beginPath();
      ctx.roundRect(width / 2 + 13, 280, 32, 180, 14);
      ctx.fill();
    }

    const dataUrl = canvas.toDataURL('image/png');
    const imgData = ctx?.getImageData(0, 0, width, height);
    const alphaData: number[] = [];
    if (imgData) {
      for (let i = 3; i < imgData.data.length; i += 4) {
        alphaData.push(imgData.data[i]!);
      }
    }

    const result = await dispatch({
      type: 'import_image',
      domain: 'asset',
      data: {
        name: 'Hero Character',
        dataUrl,
        width,
        height,
        alphaData,
      },
    });

    if (result.status === 'success' && result.entityId) {
      const assetId = result.entityId;
      setSelectedAssetId(assetId);

      // Automatically apply rig template
      await dispatch({
        type: 'apply_rig_template',
        domain: 'rig',
        targetId: assetId,
        data: { assetId, template: 'humanoid' },
      });

      // Automatically stage character on 2.5D scene
      const sceneData = projectState.getAllSceneData()[0];
      const sceneId = sceneData?.id ?? 'scene-default';
      const instRes = await dispatch({
        type: 'add_instance',
        domain: 'scene',
        data: {
          sceneId,
          assetId,
          name: 'Hero Character',
          position: { x: 0, y: 0 },
          depth: 0,
          scale: 1,
          rotation: 0,
        },
      });
      if (instRes.status === 'success' && instRes.entityId) {
        setSelectedInstanceId(instRes.entityId);
      }

      return assetId;
    }
    return undefined;
  }, [dispatch, projectState]);

  // Load a full saved project JSON file
  const loadProjectFile = useCallback(
    async (file: File): Promise<boolean> => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data && data.manifest) {
          if (data.assets && Array.isArray(data.assets)) {
            for (const a of data.assets) {
              projectState.setAssetData(a.id, a);
            }
          }
          if (data.scenes && Array.isArray(data.scenes)) {
            for (const s of data.scenes) {
              projectState.setSceneData(s.id, s);
            }
          }
          projectState.load(data.manifest);
          projectState.incrementRevision();
          const firstAsset = data.assets?.[0]?.id || Object.keys(data.manifest.assets || {})[0];
          if (firstAsset) setSelectedAssetId(firstAsset);
          const firstScene = data.scenes?.[0];
          if (firstScene?.instances?.[0]) setSelectedInstanceId(firstScene.instances[0].id);
          if (firstScene?.shots?.[0]) setSelectedShotId(firstScene.shots[0].id);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [projectState],
  );

  const getAssetData = useCallback(
    (id: string): AssetData | undefined => {
      return snapshot?.assets.get(id) ?? projectState.getAssetData(id);
    },
    [snapshot, projectState],
  );

  const value = useMemo(
    () => ({
      projectState,
      commandBus,
      commandRegistry,
      snapshot,
      workspace: mode,
      setWorkspace: setMode,
      mode,
      setMode,
      selectedAssetId,
      setSelectedAssetId,
      selectedBoneId,
      setSelectedBoneId,
      selectedInstanceId,
      setSelectedInstanceId: handleSelectInstance,
      selectedShotId,
      setSelectedShotId: handleSelectShot,
      currentFrame,
      setCurrentFrame,
      isPlaying,
      setIsPlaying,
      fps,
      setFps,
      isRemoteConnected,
      getAssetData,
      dispatch,
      importImageFile,
      loadDemoCharacter,
      loadProjectFile,
      activeClipId,
      setActiveClipId,
    }),
    [
      projectState,
      commandBus,
      commandRegistry,
      snapshot,
      mode,
      selectedAssetId,
      selectedBoneId,
      selectedInstanceId,
      handleSelectInstance,
      selectedShotId,
      handleSelectShot,
      currentFrame,
      isPlaying,
      fps,
      isRemoteConnected,
      getAssetData,
      dispatch,
      importImageFile,
      loadDemoCharacter,
      loadProjectFile,
      activeClipId,
    ],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};
