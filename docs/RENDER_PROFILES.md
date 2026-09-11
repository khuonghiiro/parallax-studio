# Parallax Studio — Render Profiles & GPU Target Specification

This document defines output resolution presets, high-framerate export standards (60/120 FPS),
hardware video encoder integration (NVENC), and GPU memory budgets.
Target Hardware: NVIDIA GeForce RTX 3060 (12 GB VRAM).

## 1. Mandatory Output Presets

| UI Label | Dimensions (px) | Aspect Ratio | Export Framerate Options |
| --- | --- | --- | --- |
| Full HD | 1920 × 1080 | 16:9 | 24, 30, 60, 120 |
| 2K DCI | 2048 × 1080 | 1.90:1 (256:135) | 24, 30, 60, 120 |
| QHD / 1440p | 2560 × 1440 | 16:9 | 24, 30, 60, 120 |
| 4K UHD | 3840 × 2160 | 16:9 | 24, 30, 60, 120 |
| 4K DCI | 4096 × 2160 | 1.90:1 (256:135) | 24, 30, 60, 120 |

- The UI explicitly displays exact pixel dimensions alongside labels to prevent confusion between 2K DCI and 1440p.
- Switching aspect ratio presets adjusts camera framing and safe area overlays without stretching pixel geometry.
- Default preset: **4K UHD @ 60 FPS** (user-configurable).
- 120 FPS output is a strict functional mandate: the engine samples scene transforms at 120 discrete timestamps
  per second. Duplicating 60 FPS frames or altering container metadata to fabricate 120 FPS is prohibited.

## 2. Decoupled Framerate Architecture

1. **Timeline FPS**: The temporal subdivision unit for authoring keyframes and clips (typically 24 or 30 FPS).
2. **Preview FPS**: The interactive editor viewport refresh rate (target 60 FPS; optional 120 FPS on high-refresh monitors).
3. **Output FPS**: The exact temporal sampling frequency and frame count of the exported video file (24, 30, 60, 120 FPS).

Sample timestamp formula:
$$\text{timestamp} = \frac{\text{frameIndex}}{\text{outputFps}}$$

The core pose evaluator is identical across preview and export. Preview may drop viewport frames or downsample
resolution under heavy GPU load; offline export renders every consecutive frame without frame dropping.
Offline 4K @ 120 FPS rendering executing slower than real-time is expected and acceptable.

## 3. GPU Acceleration & Hardware Encoding

- Three.js utilizes GPU acceleration for skeletal deformation, mesh shaders, normal mapping, and shadow map generation.
- Native FFmpeg pipelines prioritize `h264_nvenc` and `hevc_nvenc` when supported by NVIDIA drivers.
- H.264 is prioritized for universal playback compatibility; HEVC is prioritized for 4K bandwidth efficiency.
- Encoders are verified dynamically by encoding a short probe clip upon service initialization.
- Deterministic CPU software fallback (`libx264`, `libx265`) activates when NVENC is unavailable, preserving
  selected resolution and framerate without silent quality degradation.
- Documented references: [NVIDIA FFmpeg Guide][nvidia-ffmpeg], [NVENC Application Note][nvenc].

## 4. VRAM Budget & Memory Management

- A single uncompressed $3840 \times 2160$ RGBA8 frame requires **31.64 MiB**.
- One minute of 120 FPS video equates to 7,200 frames ($\approx \mathbf{222.47\text{ GiB}}$), far exceeding hardware VRAM limits.
- Rendered frames stream to the encoder through a bounded ring buffer (2–4 frames) with backpressure flow control.
- Never retain full sequences or all multi-angle textures simultaneously in GPU memory.
- Assets employ texture sharing and LRU cache eviction under memory pressure.
- Textures, render targets, buffers, and subprocess pipes are deterministically disposed of upon job completion or cancellation.

## 5. Export Job Lifecycle & Fault Recovery

- Each export job binds to an immutable `snapshotRevision`, frame range, resolution, framerate, and codec preset.
- Progress reporting includes completed frame count, encoding phase, throughput FPS, and estimated time remaining.
- Cancelling a job immediately terminates the FFmpeg subprocess and releases GPU memory buffers.
- Failed or aborted jobs are never marked as complete.
- Initial release requires the desktop app to remain open during export (`waiting_renderer` state emitted if closed).

## 6. Verification Protocol & Acceptance Criteria

1. **Preset Contract Test**: Verifies all resolution and framerate combinations, ensuring valid dimensions and strict sample counts.
2. **Deterministic Frame Test**: A 2.0-second export at 60 FPS must yield exactly 120 frames; at 120 FPS exactly 240 frames.
3. **Format Matrix Test**: Validates encoded video containers via FFprobe, asserting dimensions, color matrix, framerate, and duration.
4. **Visual Consistency Test**: Asserts pixel-level equivalence between preview and export frames at identical timestamps.
5. **Hardware Benchmark Matrix (RTX 3060 Target)**:
   - Reference workload: 10 rigged characters, 20 layered prop cards, 1 directional shadow-casting light.
   - Measures: Median/p95 frame times, export duration, VRAM peak consumption, encoder saturation.
6. **Cross-Platform Verification**: Separate test passes for Windows (DirectX/Vulkan backend via Tauri) and Linux (OpenGL/Vulkan).

[nvidia-ffmpeg]: https://docs.nvidia.com/video-technologies/video-codec-sdk/13.1/ffmpeg-with-nvidia-gpu/index.html
[nvenc]: https://docs.nvidia.com/video-technologies/video-codec-sdk/13.0/nvenc-application-note/index.html
