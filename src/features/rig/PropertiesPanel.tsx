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
