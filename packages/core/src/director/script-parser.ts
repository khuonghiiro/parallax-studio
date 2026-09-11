import type {
  ScriptParseResult,
  ParsedShot,
  ShotCameraAngle,
} from '@parallax/contracts';

function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${ts}-${rnd}`;
}

/**
 * Detect camera angle from text keywords in English or Vietnamese.
 */
function detectCameraAngle(text: string): ShotCameraAngle {
  const lower = text.toLowerCase();
  if (lower.includes('close-up') || lower.includes('cận cảnh') || lower.includes('gương mặt')) {
    return 'close-up';
  }
  if (lower.includes('wide') || lower.includes('toàn cảnh') || lower.includes('xa')) {
    return 'wide';
  }
  if (lower.includes('over-the-shoulder') || lower.includes('qua vai')) {
    return 'over-the-shoulder';
  }
  return 'medium';
}

/**
 * Detect facial expression or emotion keywords.
 */
function detectEmotion(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('cười') || lower.includes('vui') || lower.includes('happy') || lower.includes('smile')) {
    return 'happy';
  }
  if (lower.includes('buồn') || lower.includes('khóc') || lower.includes('sad')) {
    return 'sad';
  }
  if (lower.includes('ngạc nhiên') || lower.includes('surprised') || lower.includes('shock')) {
    return 'surprised';
  }
  if (lower.includes('giận') || lower.includes('angry')) {
    return 'angry';
  }
  if (lower.includes('suy tư') || lower.includes('thinking')) {
    return 'thinking';
  }
  return undefined;
}

/**
 * Parse a natural language screenplay / script into structured shots.
 *
 * Supports headings, markdown lists, action cues, and dialogue.
 *
 * @param scriptText Raw text of the screenplay.
 * @param defaultFps Frames per second for duration calculation (default 24).
 * @returns Structured ScriptParseResult matching contracts schema.
 */
export function parseScreenplay(
  scriptText: string,
  defaultFps = 24,
): ScriptParseResult {
  const lines = scriptText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let title = 'Untitled Screenplay';
  const rawShots: string[] = [];
  let currentShotLines: string[] = [];

  for (const line of lines) {
    const isTitle = line.startsWith('# ') ||
      line.toLowerCase().startsWith('title:') ||
      line.toLowerCase().startsWith('kịch bản:');
    if (isTitle) {
      title = line.replace(/^#\s*|^title:\s*|^kịch bản:\s*/i, '').trim();
      continue;
    }

    // Shot separator check: starts with "Shot", "Cảnh", "Scene", or numbered bullet
    const isShotStart = /^(shot|cảnh|scene)\s*\d+/i.test(line) || /^\d+[\.:]\s+/i.test(line);

    if (isShotStart && currentShotLines.length > 0) {
      rawShots.push(currentShotLines.join(' '));
      currentShotLines = [line];
    } else {
      currentShotLines.push(line);
    }
  }

  if (currentShotLines.length > 0) {
    rawShots.push(currentShotLines.join(' '));
  }

  // If no explicit shots detected, split by double line breaks / paragraphs
  const shotDescriptions = rawShots.length > 0 ? rawShots : [scriptText.trim()];

  let currentFrame = 0;
  const shots: ParsedShot[] = [];
  const characterSet = new Set<string>();

  shotDescriptions.forEach((desc, index) => {
    const angle = detectCameraAngle(desc);
    const emotion = detectEmotion(desc);

    // Check for duration hints like "[3s]" or "(2.5s)" or "3 seconds"
    let durationFrames = defaultFps * 2.5; // default 2.5s = 60 frames
    const durMatch = desc.match(/\[(\d+(?:\.\d+)?)\s*s(?:ec)?\]/i) || desc.match(/\((\d+(?:\.\d+)?)\s*s(?:ec)?\)/i);
    if (durMatch && durMatch[1]) {
      durationFrames = Math.round(parseFloat(durMatch[1]) * defaultFps);
    }

    // Extract character name if formatted like "NAME: Dialogue"
    let characterName: string | undefined;
    const cleanDesc = desc.replace(/^\d+[\.:]\s*/, '').replace(/^(?:shot|cảnh|scene)\s*\d+[\.:\s]*/i, '');
    const charMatch = cleanDesc.match(/^([A-ZÀ-Ỹa-zà-ỹ0-9_\s]{2,20})\s*:\s*(.+)$/);
    if (charMatch && charMatch[1]) {
      characterName = charMatch[1].trim();
      characterSet.add(characterName);
    }

    const shotId = generateId('shot');
    shots.push({
      id: shotId,
      shotName: `Shot ${index + 1}: ${angle.toUpperCase()}`,
      actionDescription: desc,
      cameraAngle: angle,
      characterName,
      startFrame: currentFrame,
      durationFrames,
      emotion,
    });

    currentFrame += durationFrames;
  });

  return {
    title,
    shots,
    totalFrames: currentFrame,
    characterNames: Array.from(characterSet),
  };
}
