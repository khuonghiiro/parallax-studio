import React, { useState, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Play,
  CheckCircle2,
  Clock,
  Film,
  Camera,
  User,
  Copy,
  Check,
  X,
  Layers,
  Terminal,
  ArrowRight,
} from 'lucide-react';
import { parseScreenplay } from '@parallax/core';
import type { ScriptParseResult, ParsedShot } from '@parallax/contracts';
import { useEditor } from '../../app/EditorContext.js';
import './AiDirectorDrawer.css';

export interface AiDirectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActivityLogItem {
  id: string;
  time: string;
  action: string;
  status: 'pending' | 'success' | 'error';
  detail: string;
}

const SAMPLE_SCRIPTS: Record<string, { label: string; text: string }> = {
  actionVi: {
    label: '⚔️ Kịch bản 1: Trận Chiến Ánh Sáng (Tiếng Việt)',
    text: `# Cuộc Chiến Ánh Sáng
1. Toàn cảnh chiến trường hoang vu trong ánh tà dương, gió lốc cuốn bụi mù mịt [3.5s].
2. Cận cảnh Hiệp Sĩ rút thanh gươm phát sáng, ánh mắt kiên định giận dữ [2.5s].
Hiệp Sĩ: Ta sẽ bảo vệ vùng đất này đến hơi thở cuối cùng!
3. Góc máy qua vai nhìn về phía Quái Thú bóng đêm khổng lồ gầm rú [3.0s].
Quái Thú: Ngươi không thể ngăn cản bóng tối vĩnh cửu!
4. Cận cảnh nụ cười tự tin của Hiệp Sĩ khi nguồn sáng thiêng bừng tỉnh [2.0s].`,
  },
  dialogueVi: {
    label: '☕ Kịch bản 2: Cuộc Gặp Nửa Đêm (Hội thoại & Biểu cảm)',
    text: `# Cuộc Gặp Nửa Đêm
1. Toàn cảnh quán trà cổ điển dưới mưa đêm rả rích [3.0s].
2. Cận cảnh Thám Tử trầm ngâm suy tư lật từng trang hồ sơ mật [2.5s].
Thám Tử: Manh mối cuối cùng dẫn tới bến cảng lúc rạng đông.
3. Góc máy qua vai đối diện với Nhân Chứng bí ẩn trùm áo choàng [2.5s].
Nhân Chứng: Hãy cẩn thận, có kẻ đang theo dõi chúng ta!
4. Cận cảnh nụ cười nhẹ của Thám Tử nhận ra chân tướng [2.0s].`,
  },
  cinematicEn: {
    label: '🎬 Script 3: Cyberpunk Pursuit (English)',
    text: `# Cyberpunk Pursuit
1. Wide shot of the foggy neo-city alleyway illuminated by flickering neon signs [3.0s].
2. Close-up of Cyborg Hacker scanning the biometric security terminal [2.0s].
Hacker: Firewalls bypassed, download starting now.
3. Over-the-shoulder shot tracking the stealth drone descending from rooftops [3.0s].
Drone: Intruder detected in sector 7.
4. Medium shot Hacker dashing into the rain with a triumphant smile [2.5s].`,
  },
};

export function AiDirectorDrawer({
  isOpen,
  onClose,
}: AiDirectorDrawerProps): React.JSX.Element | null {
  const {
    fps,
    projectState,
    snapshot,
    isRemoteConnected,
    dispatch,
    setMode,
    setCurrentFrame,
  } = useEditor();

  const [activeTab, setActiveTab] = useState<'script' | 'activity'>('script');
  const [selectedPreset, setSelectedPreset] = useState<string>('actionVi');
  const [scriptText, setScriptText] = useState<string>(SAMPLE_SCRIPTS.actionVi.text);
  const [parseResult, setParseResult] = useState<ScriptParseResult | null>(null);
  const [isStaging, setIsStaging] = useState<boolean>(false);
  const [stagedCount, setStagedCount] = useState<number | null>(null);
  const [copiedMcp, setCopiedMcp] = useState<boolean>(false);
  const [logs, setLogs] = useState<ActivityLogItem[]>([
    {
      id: 'init',
      time: new Date().toLocaleTimeString(),
      action: 'Session Ready',
      status: 'success',
      detail: 'AI Director module loaded and connected to Command Bus.',
    },
  ]);

  const addLog = useCallback((action: string, status: 'pending' | 'success' | 'error', detail: string) => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(2, 7),
        time: new Date().toLocaleTimeString(),
        action,
        status,
        detail,
      },
      ...prev.slice(0, 19),
    ]);
  }, []);

  const handlePresetChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value;
    setSelectedPreset(key);
    if (SAMPLE_SCRIPTS[key]) {
      setScriptText(SAMPLE_SCRIPTS[key].text);
      setParseResult(null);
      setStagedCount(null);
    }
  }, []);

  const handleParseOnly = useCallback(() => {
    try {
      const result = parseScreenplay(scriptText, fps);
      setParseResult(result);
      setStagedCount(null);
      addLog('parseScreenplay', 'success', `Parsed "${result.title}" with ${result.shots.length} shots.`);
    } catch (err) {
      addLog('parseScreenplay', 'error', err instanceof Error ? err.message : String(err));
    }
  }, [scriptText, fps, addLog]);

  const handleAutoStage = useCallback(async () => {
    setIsStaging(true);
    try {
      const result = parseScreenplay(scriptText, fps);
      setParseResult(result);

      const scenes = projectState.getAllSceneData();
      const sceneId = scenes[0]?.id ?? 'scene-default';

      let count = 0;
      for (const shot of result.shots) {
        // 1. Dispatch add_shot
        await dispatch({
          type: 'add_shot',
          domain: 'scene',
          data: {
            sceneId,
            id: shot.id,
            name: shot.shotName,
            startFrame: shot.startFrame,
            endFrame: shot.startFrame + shot.durationFrames,
            transitionIn: shot.cameraAngle === 'wide' ? 'fade' : 'cut',
            transitionDuration: shot.cameraAngle === 'wide' ? 12 : 0,
          },
        });

        // 2. Dispatch camera framing adjustment based on shot angle
        let zoom = 1.0;
        if (shot.cameraAngle === 'wide') zoom = 0.65;
        else if (shot.cameraAngle === 'close-up') zoom = 1.85;
        else if (shot.cameraAngle === 'over-the-shoulder') zoom = 1.35;

        await dispatch({
          type: 'set_camera',
          domain: 'scene',
          data: {
            sceneId,
            camera: { zoom, projection: 'perspective' },
          },
        });

        count++;
      }

      setStagedCount(count);
      setCurrentFrame(0);
      addLog('autoStage', 'success', `Successfully staged ${count} shots to timeline for scene "${sceneId}".`);
    } catch (err) {
      addLog('autoStage', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setIsStaging(false);
    }
  }, [scriptText, fps, projectState, dispatch, setCurrentFrame, addLog]);

  const handleCopyMcpConfig = useCallback(() => {
    const config = {
      mcpServers: {
        'parallax-studio': {
          command: 'npx',
          args: ['-y', 'tsx', 'mcp/server.ts'],
          env: {
            PORT: '3001',
          },
        },
      },
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
    addLog('copyDiagnostics', 'success', 'Copied Codex/Antigravity MCP config snippet to clipboard.');
  }, [addLog]);

  const totalDurationSec = useMemo(() => {
    if (!parseResult) return 0;
    return (parseResult.totalFrames / fps).toFixed(1);
  }, [parseResult, fps]);

  if (!isOpen) return null;

  return (
    <div className="ai-drawer-overlay" onClick={onClose}>
      <aside className="ai-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ai-drawer__header">
          <div className="ai-drawer__title-group">
            <Sparkles size={18} color="#818cf8" />
            <h2 className="ai-drawer__title">AI Filmmaker Assistant</h2>
            <span
              className={`ai-drawer__status-pill ${
                isRemoteConnected
                  ? 'ai-drawer__status-pill--active'
                  : 'ai-drawer__status-pill--local'
              }`}
            >
              {isRemoteConnected ? '● SSE Active' : '● Local Bus (rev ' + (snapshot?.revision ?? 0) + ')'}
            </span>
          </div>
          <button className="ai-drawer__close-btn" onClick={onClose} title="Close drawer">
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="ai-drawer__tabs">
          <button
            className={`ai-drawer__tab ${activeTab === 'script' ? 'ai-drawer__tab--active' : ''}`}
            onClick={() => setActiveTab('script')}
          >
            <Film size={15} />
            <span>Kịch bản & Dàn cảnh</span>
          </button>
          <button
            className={`ai-drawer__tab ${activeTab === 'activity' ? 'ai-drawer__tab--active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Terminal size={15} />
            <span>Nhật ký MCP & AI</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="ai-drawer__content">
          {activeTab === 'script' ? (
            <>
              {/* Presets */}
              <div className="ai-drawer__field">
                <label className="ai-drawer__label" htmlFor="script-preset">
                  <span>Mẫu kịch bản điện ảnh:</span>
                </label>
                <select
                  id="script-preset"
                  className="ai-drawer__select"
                  value={selectedPreset}
                  onChange={handlePresetChange}
                >
                  {Object.entries(SAMPLE_SCRIPTS).map(([k, item]) => (
                    <option key={k} value={k}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Script Input Textarea */}
              <div className="ai-drawer__field">
                <label className="ai-drawer__label" htmlFor="script-editor">
                  <span>Nội dung kịch bản (Text/Markdown):</span>
                  <span className="ai-drawer__hint">{fps} FPS</span>
                </label>
                <textarea
                  id="script-editor"
                  className="ai-drawer__textarea"
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Nhập kịch bản (ví dụ: Cảnh 1 [3s]: Toàn cảnh...)"
                />
                <span className="ai-drawer__hint">
                  Hỗ trợ từ khóa: <b>toàn cảnh</b> (wide), <b>cận cảnh</b> (close-up),
                  {' '}<b>qua vai</b> (OTS), <b>[3s]</b>, và biểu cảm (cười, buồn, giận).
                </span>
              </div>

              {/* Action Buttons */}
              <div className="ai-drawer__actions">
                <button
                  className="ai-drawer__btn ai-drawer__btn--primary"
                  onClick={handleAutoStage}
                  disabled={isStaging || !scriptText.trim()}
                >
                  <Sparkles size={16} />
                  <span>{isStaging ? 'Đang dàn cảnh...' : '⚡ Phân tích & Dàn cảnh tự động'}</span>
                </button>
                <button
                  className="ai-drawer__btn ai-drawer__btn--secondary"
                  onClick={handleParseOnly}
                  disabled={isStaging || !scriptText.trim()}
                >
                  <span>Chỉ phân tích</span>
                </button>
              </div>

              {/* Parse Summary Bar */}
              {parseResult && (
                <div className="ai-drawer__summary">
                  <div className="ai-drawer__stat">
                    <span className="ai-drawer__stat-val">{parseResult.shots.length}</span>
                    <span className="ai-drawer__stat-lbl">Phân cảnh (Shots)</span>
                  </div>
                  <div className="ai-drawer__stat">
                    <span className="ai-drawer__stat-val">{parseResult.totalFrames}</span>
                    <span className="ai-drawer__stat-lbl">Tổng frames</span>
                  </div>
                  <div className="ai-drawer__stat">
                    <span className="ai-drawer__stat-val">{totalDurationSec}s</span>
                    <span className="ai-drawer__stat-lbl">Thời lượng</span>
                  </div>
                </div>
              )}

              {/* Post-staging workspace switchers */}
              {stagedCount !== null && (
                <div className="ai-drawer__switchers">
                  <button
                    className="ai-drawer__switcher-btn"
                    onClick={() => {
                      setMode('compose');
                      onClose();
                    }}
                  >
                    <Layers size={14} />
                    <span>Xem Stage 2.5D</span>
                    <ArrowRight size={13} />
                  </button>
                  <button
                    className="ai-drawer__switcher-btn"
                    onClick={() => {
                      setMode('edit');
                      onClose();
                    }}
                  >
                    <Film size={14} />
                    <span>Xem Dựng phim</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}

              {/* Parsed Shots List */}
              {parseResult && (
                <div className="ai-drawer__field">
                  <div className="ai-drawer__shots-title">
                    <span>Danh sách phân cảnh chi tiết ({parseResult.shots.length})</span>
                    {stagedCount !== null && (
                      <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        <CheckCircle2 size={13} /> Đã đưa vào Timeline
                      </span>
                    )}
                  </div>
                  <div className="ai-drawer__shot-list">
                    {parseResult.shots.map((shot: ParsedShot, idx: number) => {
                      let badgeClass = 'ai-drawer__badge--medium';
                      if (shot.cameraAngle === 'wide') badgeClass = 'ai-drawer__badge--wide';
                      if (shot.cameraAngle === 'close-up') badgeClass = 'ai-drawer__badge--closeup';
                      if (shot.cameraAngle === 'over-the-shoulder') badgeClass = 'ai-drawer__badge--ots';

                      return (
                        <div key={shot.id || idx} className="ai-drawer__shot-card">
                          <div className="ai-drawer__shot-header">
                            <span className="ai-drawer__shot-name">{shot.shotName}</span>
                            <div className="ai-drawer__badges">
                              <span className={`ai-drawer__badge ${badgeClass}`}>
                                <Camera size={10} style={{ display: 'inline', marginRight: 2 }} />
                                {shot.cameraAngle}
                              </span>
                              {shot.emotion && (
                                <span className="ai-drawer__badge ai-drawer__badge--emotion">
                                  {shot.emotion}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ai-drawer__shot-desc">
                            {shot.characterName && (
                              <b style={{ color: '#818cf8', marginRight: 4 }}>
                                <User size={10} style={{ display: 'inline', marginRight: 2 }} />
                                {shot.characterName}:
                              </b>
                            )}
                            {shot.actionDescription}
                          </div>
                          <div className="ai-drawer__shot-footer">
                            <span>
                              <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                              Frame {shot.startFrame} - {shot.startFrame + shot.durationFrames} (
                              {(shot.durationFrames / fps).toFixed(1)}s)
                            </span>
                            <button
                              className="ai-drawer__jump-btn"
                              onClick={() => setCurrentFrame(shot.startFrame)}
                              title="Nhảy đến frame bắt đầu của shot này"
                            >
                              <Play size={10} /> Nhảy đến frame
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Activity & Diagnostics Tab */
            <>
              <div className="ai-drawer__mcp-card">
                <div className="ai-drawer__mcp-row">
                  <b>Máy chủ MCP Parallax Studio</b>
                  <span style={{ color: isRemoteConnected ? '#10b981' : '#818cf8' }}>
                    {isRemoteConnected ? 'Đang chạy qua SSE' : 'Cục bộ qua Command Bus'}
                  </span>
                </div>
                <div className="ai-drawer__mcp-row">
                  <span>Phiên bản Revision dự án:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>rev {snapshot?.revision ?? 0}</span>
                </div>
                <div className="ai-drawer__mcp-row">
                  <span>Công cụ hỗ trợ:</span>
                  <span>director_stage_scene, parse_script, preview</span>
                </div>
                <button className="ai-drawer__btn ai-drawer__btn--secondary" onClick={handleCopyMcpConfig}>
                  {copiedMcp ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  <span>{copiedMcp ? 'Đã sao chép vào Clipboard!' : 'Sao chép cấu hình MCP (Codex/Antigravity)'}</span>
                </button>
              </div>

              <div className="ai-drawer__field">
                <label className="ai-drawer__label">Cấu hình MCP mẫu (.gemini/mcp_config.json hoặc Codex):</label>
                <div className="ai-drawer__mcp-code">
{`{
  "mcpServers": {
    "parallax-studio": {
      "command": "npx",
      "args": ["-y", "tsx", "mcp/server.ts"],
      "env": { "PORT": "3001" }
    }
  }
}`}
                </div>
              </div>

              <div className="ai-drawer__field">
                <label className="ai-drawer__label">Nhật ký tác vụ AI (Activity History):</label>
                <div className="ai-drawer__activity-list">
                  {logs.map((log) => (
                    <div key={log.id} className="ai-drawer__activity-item">
                      <span className="ai-drawer__activity-time">{log.time}</span>
                      <div className="ai-drawer__activity-detail">
                        <b>{log.action}:</b> {log.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
