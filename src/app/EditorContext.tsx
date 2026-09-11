import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CommandBus,
  CommandRegistry,
  ProjectState,
  registerDefaultHandlers,
  reconstructSnapshot,
  type ProjectSnapshot,
  type SerializableSnapshot,
} from '@parallax/application';
import type { CommandPayload, CommandResult } from '@parallax/contracts';
import type { EditorMode } from './layout/MenuBar.js';

export interface EditorContextValue {
  projectState: ProjectState;
  commandBus: CommandBus;
  commandRegistry: CommandRegistry;
  snapshot: ProjectSnapshot | null;
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
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
  dispatch: (payload: CommandPayload) => Promise<CommandResult>;
  importImageFile: (file: File) => Promise<string | undefined>;
  loadDemoCharacter: () => Promise<string | undefined>;
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
  const [mode, setMode] = useState<EditorMode>('setup');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedBoneId, setSelectedBoneId] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);
  const [isRemoteConnected, setIsRemoteConnected] = useState<boolean>(false);

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

      return assetId;
    }
    return undefined;
  }, [dispatch]);

  const value = useMemo(
    () => ({
      projectState,
      commandBus,
      commandRegistry,
      snapshot,
      mode,
      setMode,
      selectedAssetId,
      setSelectedAssetId,
      selectedBoneId,
      setSelectedBoneId,
      currentFrame,
      setCurrentFrame,
      isPlaying,
      setIsPlaying,
      fps,
      setFps,
      isRemoteConnected,
      dispatch,
      importImageFile,
      loadDemoCharacter,
    }),
    [
      projectState,
      commandBus,
      commandRegistry,
      snapshot,
      mode,
      selectedAssetId,
      selectedBoneId,
      currentFrame,
      isPlaying,
      fps,
      isRemoteConnected,
      dispatch,
      importImageFile,
      loadDemoCharacter,
    ],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};
