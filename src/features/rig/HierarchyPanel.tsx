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
    projectState,
    dispatch,
    loadDemoCharacter,
  } = useEditor();

  const assets = snapshot ? Object.entries(snapshot.manifest.assets) : [];
  const currentAssetData = selectedAssetId ? projectState.getAssetData(selectedAssetId) : undefined;
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
              <div
                key={id}
                className={`tree-item ${selectedAssetId === id ? 'tree-item--selected' : ''}`}
                onClick={() => setSelectedAssetId(id)}
              >
                <Icon icon={Layers} size="sm" color="var(--accent)" />
                <span className="tree-item__label">{asset.name}</span>
                {asset.hasRig && <span className="badge badge--success">Rigged</span>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Skeleton Panel */}
      <Panel
        title="Skeleton"
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

      {/* Views Panel — Setup mode only */}
      {mode === 'setup' && (
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

      {/* Animations Panel — Animate mode only */}
      {mode === 'animate' && (
        <Panel title="Animations" id="panel-animations">
          <div className="hierarchy__list">
            <div className="tree-item tree-item--selected">
              <Icon icon={Film} size="sm" color="var(--warning)" />
              <span className="tree-item__label">Walk / Sway Demo Clip</span>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
