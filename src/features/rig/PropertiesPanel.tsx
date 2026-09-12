import React, { useState } from 'react';
import { Panel } from '../../ui/Panel.js';
import { Input } from '../../ui/Input.js';
import { Slider } from '../../ui/Slider.js';
import { Select } from '../../ui/Select.js';
import { Button } from '../../ui/Button.js';
import { useEditor } from '../../app/EditorContext.js';
import type { EditorMode } from '../../app/layout/MenuBar.js';
import './PropertiesPanel.css';

export interface PropertiesPanelProps {
  mode: EditorMode;
}

/**
 * Right panel — context-sensitive inspector.
 * Displays details for selected asset, bone, mesh, or keyframe.
 */
export function PropertiesPanel({
  mode,
}: PropertiesPanelProps): React.JSX.Element {
  const {
    snapshot,
    selectedAssetId,
    selectedBoneId,
    selectedInstanceId,
    selectedShotId,
    projectState,
    currentFrame,
    dispatch,
  } = useEditor();

  const [opacity, setOpacity] = useState<number>(100);
  const [easing, setEasing] = useState<string>('easeInOut');

  // Expression and warp sliders
  const [blinkWeight, setBlinkWeight] = useState<number>(0);
  const [mouthWeight, setMouthWeight] = useState<number>(0);
  const [smileWeight, setSmileWeight] = useState<number>(0);
  const [squashValue, setSquashValue] = useState<number>(0);

  const asset = selectedAssetId
    ? (snapshot?.assets.get(selectedAssetId) ?? projectState.getAssetData(selectedAssetId))
    : undefined;
  const bone = asset?.skeleton?.bones.find((b) => b.id === selectedBoneId);
  const activeScene = projectState.getAllSceneData()[0];
  const activeInstance = selectedInstanceId
    ? activeScene?.instances.find((i) => i.id === selectedInstanceId)
    : (activeScene?.instances.find((i) => i.assetId === selectedAssetId) || activeScene?.instances[0]);
  const activeShot = selectedShotId
    ? activeScene?.shots?.find((s) => s.id === selectedShotId)
    : activeScene?.shots?.[0];

  const handleMorphChange = async (name: string, value: number) => {
    if (!selectedAssetId) return;
    const normVal = value / 100;
    await dispatch({
      type: 'set_morph_weight',
      domain: 'rig',
      targetId: selectedAssetId,
      data: { assetId: selectedAssetId, name, weight: normVal },
    });
  };

  const handleSquashStretchChange = async (val: number) => {
    setSquashValue(val);
    if (!selectedAssetId || !asset?.mesh) return;

    const { createUniformWarpGrid, applySquashStretch } = await import('@parallax/core');
    const width = asset.dimensions.width;
    const height = asset.dimensions.height;
    const baseGrid = asset.warpGrid ?? createUniformWarpGrid(4, 4, {
      minX: -width / 2,
      minY: -height / 2,
      maxX: width / 2,
      maxY: height / 2,
    });
    const updatedGrid = applySquashStretch(baseGrid, val / 100);

    await dispatch({
      type: 'set_warp_grid',
      domain: 'rig',
      targetId: selectedAssetId,
      data: { assetId: selectedAssetId, warpGrid: updatedGrid },
    });
  };

  const handleAddKeyframe = async () => {
    if (!selectedBoneId) return;
    await dispatch({
      type: 'set_keyframe',
      domain: 'animation',
      data: {
        property: `bones.${bone?.name || 'bone'}.rotation`,
        frame: currentFrame,
        value: 0.25,
        easing: { type: easing as 'linear' | 'easeInOut' },
      },
    });
  };

  return (
    <div className="properties">
      {/* Selected Entity Info */}
      <Panel title={bone ? `Bone: ${bone.name}` : asset ? `Layer: ${asset.name}` : 'Inspector'} id="panel-entity">
        {bone ? (
          <div className="props-grid">
            <Input label="Name" value={bone.name} readOnly />
            <Input label="Head X" value={Math.round(bone.head.x)} type="number" readOnly unit="px" />
            <Input label="Head Y" value={Math.round(bone.head.y)} type="number" readOnly unit="px" />
            <Input label="Length" value={Math.round(bone.length)} type="number" readOnly unit="px" />
            <Input label="Parent" value={bone.parentId || 'None (Root)'} readOnly />
          </div>
        ) : asset ? (
          <div className="props-grid">
            <Input label="Name" value={asset.name} readOnly />
            <Input label="Width" value={asset.dimensions.width} type="number" readOnly unit="px" />
            <Input label="Height" value={asset.dimensions.height} type="number" readOnly unit="px" />
            <Input label="Rig" value={asset.skeleton ? 'Humanoid' : 'None'} readOnly />
          </div>
        ) : (
          <div className="props-empty">Select an item in hierarchy to inspect</div>
        )}
      </Panel>

      {/* Mesh Geometry Section */}
      {asset?.mesh && (
        <Panel title="Mesh Geometry" id="panel-mesh">
          <div className="props-info">
            <span className="props-info__label">Vertices</span>
            <span className="props-info__value">{asset.mesh.vertexCount}</span>
          </div>
          <div className="props-info">
            <span className="props-info__label">Triangles</span>
            <span className="props-info__value">{asset.mesh.triangleCount}</span>
          </div>
          <div className="props-info">
            <span className="props-info__label">Indices</span>
            <span className="props-info__value">{asset.mesh.indices.length}</span>
          </div>
        </Panel>
      )}

      {/* Animation Keyframe Section — Animate Mode */}
      {mode === 'animate' && (
        <Panel title="Keyframe Properties" id="panel-keyframe">
          <div className="props-grid">
            <Input label="Frame" value={currentFrame} type="number" readOnly />
            <Input label="Time" value={`${(currentFrame / 24).toFixed(3)}s`} readOnly />
            <Select
              label="Easing"
              value={easing}
              onChange={setEasing}
              options={[
                { value: 'linear', label: 'Linear' },
                { value: 'easeInOut', label: 'Ease In-Out' },
                { value: 'easeIn', label: 'Ease In' },
                { value: 'easeOut', label: 'Ease Out' },
              ]}
            />
            {selectedBoneId && (
              <Button size="sm" variant="secondary" onClick={handleAddKeyframe}>
                Insert Keyframe at Frame {currentFrame}
              </Button>
            )}
          </div>
        </Panel>
      )}

      {/* Facial Expressions & Warp Deformer Section */}
      {asset && (
        <Panel title="Facial Expressions & Warp" id="panel-expressions">
          <div className="props-grid">
            {/* Quick Expression Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {[
                { name: 'Happy', smile: 100, mouth: 15, blink: 10 },
                { name: 'Sad', smile: 0, mouth: 20, blink: 25 },
                { name: 'Surprised', smile: 0, mouth: 95, blink: 0 },
                { name: 'Angry', smile: 0, mouth: 35, blink: 15 },
                { name: 'Wink', smile: 85, mouth: 10, blink: 100 },
              ].map((p) => (
                <button
                  key={p.name}
                  className="btn btn--sm btn--ghost"
                  style={{ fontSize: '10px', padding: '2px 6px', height: '22px' }}
                  onClick={() => {
                    setSmileWeight(p.smile);
                    setMouthWeight(p.mouth);
                    setBlinkWeight(p.blink);
                    handleMorphChange('smile', p.smile);
                    handleMorphChange('mouth_open', p.mouth);
                    handleMorphChange('blink', p.blink);
                  }}
                  title={`Apply ${p.name} preset`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <Slider
              label="Blink"
              min={0}
              max={100}
              value={blinkWeight}
              onChange={(val) => {
                setBlinkWeight(val);
                handleMorphChange('blink', val);
              }}
              unit="%"
            />
            <Slider
              label="Mouth Open"
              min={0}
              max={100}
              value={mouthWeight}
              onChange={(val) => {
                setMouthWeight(val);
                handleMorphChange('mouth_open', val);
              }}
              unit="%"
            />
            <Slider
              label="Smile"
              min={0}
              max={100}
              value={smileWeight}
              onChange={(val) => {
                setSmileWeight(val);
                handleMorphChange('smile', val);
              }}
              unit="%"
            />
            <Slider
              label="Squash & Stretch"
              min={-50}
              max={50}
              value={squashValue}
              onChange={handleSquashStretchChange}
              unit="%"
            />
          </div>
        </Panel>
      )}

      {/* Stage & Camera Section — Compose Workspace */}
      {mode === 'compose' && (
        <>
          <Panel title="Stage & Camera Staging" id="panel-compose-settings">
            <div className="props-grid">
              <Input label="Active Scene" value="Scene 1 (2.5D Multiplane)" readOnly />
              <Input label="Camera Projection" value="Perspective 45°" readOnly />
              <Input label="Camera Z-Distance" value="1400 px" readOnly />
              <Input label="Depth Planes" value="3 (Fore, Mid, Back)" readOnly />
              <Slider label="Parallax Depth Strength" min={0} max={100} value={80} onChange={() => {}} unit="%" />
            </div>
          </Panel>

          {activeInstance && (
            <Panel title={`Instance: ${activeInstance.name}`} id="panel-instance-props">
              <div className="props-grid">
                <Input label="Instance ID" value={activeInstance.id} readOnly />
                <Slider
                  label="Z-Depth Layer"
                  min={-300}
                  max={300}
                  value={activeInstance.depth}
                  onChange={async (val) => {
                    await dispatch({
                      type: 'update_instance',
                      domain: 'scene',
                      data: {
                        instanceId: activeInstance.id,
                        updates: { depth: val },
                      },
                    });
                  }}
                  unit="px"
                />
                <Input
                  label="Pos X"
                  value={Math.round(activeInstance.position.x)}
                  type="number"
                  readOnly
                  unit="px"
                />
                <Input
                  label="Pos Y"
                  value={Math.round(activeInstance.position.y)}
                  type="number"
                  readOnly
                  unit="px"
                />
                <Input
                  label="Scale"
                  value={activeInstance.scale.toFixed(2)}
                  type="number"
                  readOnly
                />
                <Input
                  label="Active Clip"
                  value={activeInstance.activeClipId || 'idle'}
                  readOnly
                />
              </div>
            </Panel>
          )}
        </>
      )}

      {/* Render & Export Section — Edit Workspace */}
      {mode === 'edit' && (
        <>
          <Panel title="Sequence & Render Profile" id="panel-export-settings">
            <div className="props-grid">
              <Input label="Sequence" value="Master Sequence" readOnly />
              <Select
                label="Export Profile"
                value="4k-uhd-60"
                onChange={() => {}}
                options={[
                  { value: '4k-uhd-60', label: '4K UHD (3840×2160, 60fps)' },
                  { value: '1080p-cine-24', label: '1080p Cinema (1920×1080, 24fps)' },
                  { value: '1080p-web-30', label: '1080p Web (1920×1080, 30fps)' },
                  { value: '720p-preview', label: '720p Preview (1280×720, 24fps)' },
                ]}
              />
              <Input label="Video Codec" value="VP9 / WebM (Hardware Accel)" readOnly />
              <Input label="Output Duration" value="5.0s (120 frames)" readOnly />
            </div>
          </Panel>

          {activeShot && (
            <Panel title={`Shot: ${activeShot.name}`} id="panel-shot-props">
              <div className="props-grid">
                <Input label="Shot ID" value={activeShot.id} readOnly />
                <Input label="Start Frame" value={activeShot.startFrame} type="number" readOnly />
                <Input label="End Frame" value={activeShot.endFrame} type="number" readOnly />
                <Input
                  label="Duration"
                  value={
                    `${activeShot.endFrame - activeShot.startFrame}f ` +
                    `(${((activeShot.endFrame - activeShot.startFrame) / 24).toFixed(1)}s)`
                  }
                  readOnly
                />
                <Input label="Transition In" value={activeShot.transitionIn || 'cut'} readOnly />
                <Input
                  label="Transition Duration"
                  value={activeShot.transitionDuration || 0}
                  type="number"
                  readOnly
                  unit="f"
                />
              </div>
            </Panel>
          )}
        </>
      )}

      {/* Material Section */}
      <Panel title="Material & Normal Map" id="panel-material" defaultCollapsed>
        <div className="props-grid">
          <Slider label="Opacity" min={0} max={100} value={opacity} onChange={setOpacity} unit="%" />
          <Slider label="Normal Relief" min={0} max={100} value={75} onChange={() => {}} unit="%" />
          <Input label="Lighting Shading" value="Blinn-Phong 2.5D" readOnly />
          <Input label="Tint" value="#ffffff" readOnly />
        </div>
      </Panel>
    </div>
  );
}
