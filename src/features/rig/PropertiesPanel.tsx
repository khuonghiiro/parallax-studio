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
    selectedAssetId,
    selectedBoneId,
    projectState,
    currentFrame,
    dispatch,
  } = useEditor();

  const [opacity, setOpacity] = useState<number>(100);
  const [easing, setEasing] = useState<string>('easeInOut');

  const asset = selectedAssetId ? projectState.getAssetData(selectedAssetId) : undefined;
  const bone = asset?.skeleton?.bones.find((b) => b.id === selectedBoneId);

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

      {/* Material Section */}
      <Panel title="Material" id="panel-material" defaultCollapsed>
        <div className="props-grid">
          <Slider label="Opacity" min={0} max={100} value={opacity} onChange={setOpacity} unit="%" />
          <Input label="Tint" value="#ffffff" readOnly />
        </div>
      </Panel>
    </div>
  );
}
