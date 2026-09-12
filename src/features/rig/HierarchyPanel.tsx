import React, { useState } from 'react';
import { Layers, Bone, Image, Film, Plus, Wand2 } from 'lucide-react';
import { Panel } from '../../ui/Panel.js';
import { Button } from '../../ui/Button.js';
import { Icon } from '../../ui/Icon.js';
import { useEditor } from '../../app/EditorContext.js';
import type { EditorMode } from '../../app/layout/MenuBar.js';
import './HierarchyPanel.css';

export interface HierarchyPanelProps {
  mode: EditorMode;
}

/**
 * Left panel — hierarchy tree showing layers, bones, views, and animations.
 */
export function HierarchyPanel({
  mode,
}: HierarchyPanelProps): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const {
    snapshot,
    selectedAssetId,
    setSelectedAssetId,
    selectedBoneId,
    setSelectedBoneId,
    selectedInstanceId,
    setSelectedInstanceId,
    selectedShotId,
    setSelectedShotId,
    projectState,
    dispatch,
    loadDemoCharacter,
    activeClipId,
    setActiveClipId,
  } = useEditor();

  const assets = snapshot ? Object.entries(snapshot.manifest.assets) : [];
  const currentAssetData = selectedAssetId
    ? (snapshot?.assets.get(selectedAssetId) ?? projectState.getAssetData(selectedAssetId))
    : undefined;
  const bones = currentAssetData?.skeleton?.bones || [];

  const filteredAssets = assets.filter(([_, a]) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredBones = bones.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleApplyRig = async () => {
    if (!selectedAssetId) return;
    await dispatch({
      type: 'apply_rig_template',
      domain: 'rig',
      targetId: selectedAssetId,
      data: { assetId: selectedAssetId, template: 'humanoid' },
    });
  };

  const activeViewAngle = currentAssetData?.viewSet?.activeView ?? 'front';
  const handleSwitchView = async (angle: string) => {
    if (!selectedAssetId) return;
    await dispatch({
      type: 'set_active_view',
      domain: 'asset',
      targetId: selectedAssetId,
      data: { assetId: selectedAssetId, viewAngle: angle },
    });
  };

  return (
    <div className="hierarchy">
      {/* Search */}
      <div className="hierarchy__search">
        <input
          type="text"
          placeholder="Search hierarchy..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="hierarchy__search-input"
        />
      </div>

      {/* Layers Panel */}
      <Panel
        title="Layers"
        id="panel-layers"
        headerActions={
          <Button
            icon={Plus}
            iconOnly
            size="sm"
            variant="ghost"
            title="Load Demo Asset"
            onClick={loadDemoCharacter}
          />
        }
      >
        {filteredAssets.length === 0 ? (
          <div className="hierarchy__empty">
            <Icon icon={Layers} size="lg" color="var(--text-muted)" />
            <span>No assets imported yet</span>
          </div>
        ) : (
          <div className="hierarchy__list">
            {filteredAssets.map(([id, asset]) => (
              <React.Fragment key={id}>
                <div
                  className={`tree-item ${selectedAssetId === id ? 'tree-item--selected' : ''}`}
                  onClick={() => setSelectedAssetId(id)}
                >
                  <Icon icon={Layers} size="sm" color="var(--accent)" />
                  <span className="tree-item__label">{asset.name}</span>
                  {asset.hasRig && <span className="badge badge--success">Rigged</span>}
                </div>
                {selectedAssetId === id && currentAssetData?.layers && currentAssetData.layers.length > 0 && (
                  <div className="hierarchy__sublist" style={{ paddingLeft: '16px' }}>
                    {currentAssetData.layers.map((layer) => (
                      <div
                        key={layer.id}
                        className="tree-item"
                        style={{ fontSize: '11px', opacity: layer.visible ? 0.9 : 0.4 }}
                      >
                        <span style={{ color: 'var(--accent)', fontSize: '10px' }}>▪</span>
                        <span className="tree-item__label">{layer.name}</span>
                        <span className="badge badge--neutral" style={{ fontSize: '9px' }}>
                          {layer.bindBoneName || `z:${layer.drawOrder}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </Panel>

      {/* Skeleton Panel — Rig & Setup workspaces */}
      {(mode === 'rig' || mode === 'draw') && (
        <Panel
          title="Skeleton & Bones"
          id="panel-skeleton"
          headerActions={
            selectedAssetId && !currentAssetData?.skeleton ? (
              <Button
                icon={Wand2}
                iconOnly
                size="sm"
                variant="ghost"
                title="Auto Rig Humanoid"
                onClick={handleApplyRig}
              />
            ) : undefined
          }
        >
          {filteredBones.length === 0 ? (
            <div className="hierarchy__empty">
              <Icon icon={Bone} size="lg" color="var(--text-muted)" />
              <span>{selectedAssetId ? 'Click Auto Rig to create bones' : 'Select an asset first'}</span>
            </div>
          ) : (
            <div className="hierarchy__list">
              {filteredBones.map((bone) => (
                <div
                  key={bone.id}
                  className={`tree-item ${selectedBoneId === bone.id ? 'tree-item--selected' : ''}`}
                  onClick={() => setSelectedBoneId(bone.id)}
                >
                  <Icon icon={Bone} size="sm" color="var(--success)" />
                  <span className="tree-item__label">{bone.name}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* Views Panel — Rig workspace */}
      {mode === 'rig' && (
        <Panel title="Views" id="panel-views" defaultCollapsed={false}>
          <div className="hierarchy__list">
            {[
              { angle: 'front', label: 'Front View' },
              { angle: 'quarter-left', label: 'Quarter-Left (3/4 L)' },
              { angle: 'quarter-right', label: 'Quarter-Right (3/4 R)' },
              { angle: 'side-left', label: 'Side-Left' },
              { angle: 'side-right', label: 'Side-Right' },
              { angle: 'back', label: 'Back View' },
            ].map(({ angle, label }) => {
              const isSelected = activeViewAngle === angle;
              const isPopulated =
                angle === 'front' ||
                Boolean(currentAssetData?.viewSet?.views.some((v) => v.angle === angle));
              return (
                <div
                  key={angle}
                  className={`tree-item ${isSelected ? 'tree-item--selected' : ''}`}
                  onClick={() => handleSwitchView(angle)}
                  style={{ opacity: isPopulated ? 1 : 0.6 }}
                >
                  <Icon
                    icon={Image}
                    size="sm"
                    color={isSelected ? 'var(--accent)' : 'var(--text-secondary)'}
                  />
                  <span className="tree-item__label">{label}</span>
                  {isSelected && <span className="badge badge--success">Active</span>}
                  {!isSelected && isPopulated && <span className="badge badge--info">Ready</span>}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Animations Panel — Animate workspace */}
      {mode === 'animate' && (
        <Panel
          title="Animation Clips"
          id="panel-animations"
          headerActions={
            <Button
              icon={Plus}
              iconOnly
              size="sm"
              variant="ghost"
              title="Add Custom Clip"
              onClick={() => {
                const name = prompt('Clip name:');
                if (name) setActiveClipId(name.trim().toLowerCase());
              }}
            />
          }
        >
          <div className="hierarchy__list">
            {[
              { id: 'idle', label: '🌿 Đứng thở (Idle)' },
              { id: 'walk', label: '🚶‍♂️ Bước đi (Walk)' },
              { id: 'ready', label: '⚔️ Thủ thế (Ready)' },
              ...(activeClipId && !['idle', 'walk', 'ready'].includes(activeClipId)
                ? [{ id: activeClipId, label: `✨ ${activeClipId}` }]
                : []),
            ].map((clip) => (
              <div
                key={clip.id}
                className={`tree-item ${activeClipId === clip.id ? 'tree-item--selected' : ''}`}
                onClick={() => setActiveClipId(clip.id)}
                style={{ cursor: 'pointer' }}
              >
                <Icon
                  icon={Film}
                  size="sm"
                  color={activeClipId === clip.id ? 'var(--accent)' : 'var(--warning)'}
                />
                <span className="tree-item__label">{clip.label}</span>
                {activeClipId === clip.id && <span className="badge badge--success">Active</span>}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Scene Staging Panel — Compose workspace */}
      {mode === 'compose' && (
        <Panel
          title="Scene Instances"
          id="panel-scene-instances"
          headerActions={
            selectedAssetId ? (
              <Button
                icon={Plus}
                iconOnly
                size="sm"
                variant="ghost"
                title="Stage Asset Instance"
                onClick={async () => {
                  await dispatch({
                    type: 'add_instance',
                    domain: 'scene',
                    data: {
                      assetId: selectedAssetId,
                      name: `${currentAssetData?.name || 'Asset'} Instance`,
                      position: { x: 0, y: 0 },
                      depth: 0,
                      scale: 1,
                      rotation: 0,
                    },
                  });
                }}
              />
            ) : undefined
          }
        >
          <div className="hierarchy__list">
            {projectState.getAllSceneData()[0]?.instances?.length ? (
              projectState.getAllSceneData()[0]?.instances?.map((inst) => {
                const isSelected = selectedInstanceId === inst.id;
                const depthLabel =
                  inst.depth > 50
                    ? 'Hậu cảnh'
                    : inst.depth < -50
                      ? 'Tiền cảnh'
                      : 'Trung cảnh';
                return (
                  <div
                    key={inst.id}
                    className={`tree-item ${isSelected ? 'tree-item--selected' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedInstanceId(inst.id)}
                  >
                    <Icon icon={Layers} size="sm" color={isSelected ? 'var(--accent)' : 'var(--info)'} />
                    <span className="tree-item__label">{inst.name}</span>
                    <span className="badge badge--neutral">
                      {depthLabel} ({inst.depth})
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="hierarchy__empty">
                <Icon icon={Layers} size="lg" color="var(--text-muted)" />
                <span>No instances staged yet. Click + to stage.</span>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Shots & Sequence Panel — Edit workspace */}
      {mode === 'edit' && (
        <Panel title="Sequence Shots" id="panel-sequence-shots">
          <div className="hierarchy__list">
            {(projectState.getAllSceneData()[0]?.shots || [
              { id: 'shot-1', name: 'Shot 1: Wide' },
              { id: 'shot-2', name: 'Shot 2: Close-up' },
            ]).map((s) => {
              const isSelected = selectedShotId === s.id;
              return (
                <div
                  key={s.id}
                  className={`tree-item ${isSelected ? 'tree-item--selected' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedShotId(s.id)}
                >
                  <Icon icon={Film} size="sm" color={isSelected ? 'var(--accent)' : 'var(--warning)'} />
                  <span className="tree-item__label">{s.name}</span>
                  {isSelected && <span className="badge badge--success">Active</span>}
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
