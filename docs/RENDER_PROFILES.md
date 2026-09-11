# Video Profiles and Target GPU

Status: output specification for implementation; the app has not yet been
benchmarked or rendered.
Target GPU provided by the user: NVIDIA RTX 3060 with 12 GB VRAM.

## 1. Required presets

| UI label | Dimensions | Output FPS |
| --- | --- | --- |
| Full HD | 1920 × 1080 | 24, 30, 60, 120 |
| 2K DCI | 2048 × 1080 | 24, 30, 60, 120 |
| QHD / 1440p | 2560 × 1440 | 24, 30, 60, 120 |
| 4K UHD | 3840 × 2160 | 24, 30, 60, 120 |
| 4K DCI | 4096 × 2160 | 24, 30, 60, 120 |

The UI displays the actual dimensions because “2K” may be used to mean 1440p
in everyday communication. Changing presets must update camera framing and the
safe area appropriately; it must not stretch the image to fit a different
aspect ratio. Proposed default: 4K UHD / 60 FPS; the user can change it.

120 FPS output is a functional requirement: sample the scene at 120 points in
time per second. Do not merely duplicate 60 FPS frames or change metadata. Hold
poses in hand-drawn animation remain held when that is the clip's intent; this
does not force every drawing to be different.

## 2. Separate the three rates

- Timeline FPS: the frame division used when the user places keys or clips.
- Preview FPS: the viewport update target, proposed as 60 with an optional 120
  where appropriate.
- Output FPS: the timestamps and frame count of the film, independent of actual
  rendering speed.

Frame sampling time is `frameIndex / outputFps`. The pose, warp, and view
sampler is shared with preview; there is no separate interpolation algorithm
for 120 FPS. Preview may reduce resolution or shadow quality; export uses the
selected profile exactly. If preview must skip a frame to remain interactive,
export must still sample every frame.

4K/120 FPS may render offline more slowly than real time. Do not infer from
12 GB VRAM that every scene can preview at 4K/120 FPS; measure the GPU, CPU,
frame transfer, encoder, disk, and playback capability of the output device.

## 3. GPU and encoder

- Three.js uses the GPU for meshes, skinning, materials, and shadows.
- FFmpeg prefers `h264_nvenc` or `hevc_nvenc` when the driver and binary
  support them.
- H.264 is preferred for compatibility; HEVC is an option for high-resolution
  content.
- Probe the encoder and then encode a short clip with the target profile; do
  not rely only on the GPU name or whether `ffmpeg -encoders` lists the codec.
- Provide an explicit software-encoder fallback when NVENC is unavailable;
  preserve the selected resolution and FPS rather than silently lowering
  quality to report success.
- AV1 hardware encoding is not required on this target GPU.
- `4K` and `120 FPS` do not by themselves guarantee image quality: provide
  compression-quality presets, preview banding/detail/alpha edges, and record
  the actual encoder and settings.

NVIDIA describes NVENC and FFmpeg integration for H.264/HEVC encoding. Each
codec/profile/FPS combination must be tested on the actual GPU and driver.
[NVIDIA FFmpeg][nvidia-ffmpeg], [NVENC application note][nvenc].

## 4. Memory and pipeline

- One 3840×2160 RGBA8 frame is approximately 31.64 MiB. Keeping every raw frame
  for one minute at 120 FPS would require approximately 222.47 GiB, far beyond
  the target VRAM.
- Stream through a small ring buffer, initially 2–4 frames, with backpressure
  from the encoder.
- Do not keep the whole film, every image from every angle, or every render
  target on the GPU at the same time.
- Share textures and geometry by asset, lazy-load required angles, and evict
  according to a budget.
- Atlases and mipmaps count toward the budget; 2D meshes also use alpha, normal,
  and shadow resources.
- Dispose of textures, geometry, render targets, streams, and encoders
  when a job is canceled or closed.
- GPU readback may be the bottleneck; measure it before adding Rust/WASM or a
  duplicate runtime.
- Manage VRAM according to active resources and workload; the app does not have
  exclusive access to all 12 GB when the OS and other applications also use
  the GPU.

## 5. Jobs and recovery

- A job stores the snapshot revision, frame range, dimensions, FPS, codec, and
  quality preset.
- Provide per-frame progress, encoding status, and complete errors; remaining
  time is an estimate.
- Canceling a job closes the encoder and releases buffers. A failed job must
  not appear as complete.
- Resume requires intermediate frames/chunks or saved segments; do not promise
  arbitrary continuation of a partially encoded MP4 stream. Decide the
  checkpoint strategy after the export spike.
- The first release requires a renderer in the open app. The no-renderer state
  must be `waiting_renderer`; headless mode is a later extension.

## 6. Tests and acceptance criteria

1. Unit/contract: every valid preset, the 120 FPS limit, width/height pairs,
   correct timestamps, and migration of old projects without truncating FPS.
2. Two-second integration clip: 60 FPS has 120 frames and 120 FPS has 240
   frames; dimensions, duration, and pose sampling are correct; wall-clock time
   is not used as the timestamp.
3. Short-clip matrix: 2K DCI, QHD, 4K UHD, and 4K DCI presets × 60/120 FPS.
4. Inspect the file by probing and decoding it; view the first, middle, and last
   frames, color, camera, alpha edges, and shadows rather than checking only FPS
   metadata.
5. Compare preview and export at the same time with the same quality settings.
6. Test cancellation, encoder failure, renderer disconnection, low VRAM, and
   queue behavior.
7. Measure on the RTX 3060: preview p50/p95 frame time, render/encode time, and
   CPU/RAM/VRAM; the reference workload is 10 rigged characters, 20
   layers/props, and one shadow-casting light.
8. Test Windows and Linux separately; do not infer that one OS passes because
   the other does.

The 60 FPS/1080p limits in the current draft do not satisfy the new
requirements. Implementation must update the contract, UI, exporter, and tests
from one profile-definition source; this planning pass has not changed runtime
source or created a proof video.

[nvidia-ffmpeg]: https://docs.nvidia.com/video-technologies/video-codec-sdk/13.1/ffmpeg-with-nvidia-gpu/index.html
[nvenc]: https://docs.nvidia.com/video-technologies/video-codec-sdk/13.0/nvenc-application-note/index.html
