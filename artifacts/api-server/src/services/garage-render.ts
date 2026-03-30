import { fal } from "@fal-ai/client";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// ── Config ───────────────────────────────────────────────────────────────────

const GARAGE_CONFIG = {
  floor_y: 0.72,        // floor line — % from top
  car_center_x: 0.48,   // horizontal center
  car_max_width: 0.78,  // max car width / garage width
  car_max_height: 0.42, // max car height / garage height
};

const GARAGE_BG_PATH = path.resolve(
  process.cwd(),
  "../../artifacts/meet-app/public/garage-bg.png",
);

const OUTPUT_DIR = path.resolve(process.cwd(), "uploads/garage");
const CACHE_DIR  = path.resolve(process.cwd(), "uploads/cache");

// ── Init fal.ai ──────────────────────────────────────────────────────────────

function ensureFalConfig() {
  const key = process.env["FAL_KEY"];
  if (!key) throw new Error("FAL_KEY environment variable is not set");
  fal.config({ credentials: key });
}

// ── Step 1: Relight car to match dark garage via Flux img2img ────────────────

const RELIGHT_PROMPT =
  "same car, dark garage interior lighting, dramatic overhead fluorescent light from above, " +
  "realistic photographic quality, dark ambient shadows, car lit from top, " +
  "slightly warm light, professional automotive photography, preserve car color and shape";

async function relightForGarage(imageUrl: string): Promise<string> {
  ensureFalConfig();
  const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
    input: {
      image_url: imageUrl,
      prompt: RELIGHT_PROMPT,
      strength: 0.45,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: "jpeg",
    },
  });
  const data = result.data as any;
  return data.images[0].url;
}

// ── Step 2: Remove background via fal.ai rembg ───────────────────────────────

async function removeBackground(imageUrl: string): Promise<string> {
  ensureFalConfig();
  const result = await fal.subscribe("fal-ai/imageutils/rembg", {
    input: { image_url: imageUrl },
  });
  const data = result.data as any;
  return data.image.url;
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Step 2: Compose car naturally in the garage ───────────────────────────────
//   • Trim transparent edges
//   • Resize to fit (car sits large in the scene)
//   • Dark / warm colour grade to match garage lighting
//   • Elliptical soft shadow on the floor
//   • Output is the full JPEG scene (no separate garage-bg layer needed)

async function composeInGarage(carPngBuffer: Buffer): Promise<Buffer> {
  const garageMeta = await sharp(GARAGE_BG_PATH).metadata();
  const gw = garageMeta.width!;
  const gh = garageMeta.height!;

  const maxW = Math.floor(gw * GARAGE_CONFIG.car_max_width);
  const maxH = Math.floor(gh * GARAGE_CONFIG.car_max_height);

  // Trim transparent border, resize to fit → PNG buffer (avoids raw mode issues)
  const { data: carPng, info: carInfo } = await sharp(carPngBuffer)
    .trim()
    .resize(maxW, maxH, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .png()
    .toBuffer({ resolveWithObject: true });

  const cw = carInfo.width;
  const ch = carInfo.height;

  // Position: bottom of car sits exactly on floor line
  const floorY = Math.floor(gh * GARAGE_CONFIG.floor_y);
  const x = Math.max(0, Math.floor(gw * GARAGE_CONFIG.car_center_x - cw / 2));
  const y = Math.max(0, floorY - ch);

  // ── Elliptical floor shadow via Buffer.alloc (guaranteed exact size) ─────
  const shadowW   = Math.floor(cw * 1.15);
  const shadowH   = Math.max(30, Math.floor(ch * 0.10));
  const shadowX   = Math.max(0, Math.floor(x - (shadowW - cw) / 2));
  const shadowY   = Math.max(0, floorY - Math.floor(shadowH * 0.55));
  const blurSigma = Math.max(3, Math.floor(shadowH * 0.4));

  const cx = shadowW / 2, cy = shadowH / 2;
  const rx = cx - 1,      ry = cy - 1;
  const shadowBuf = Buffer.alloc(shadowW * shadowH * 4, 0); // exact size, all zeros
  for (let py = 0; py < shadowH; py++) {
    for (let px = 0; px < shadowW; px++) {
      const d = Math.sqrt(((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2);
      if (d > 1) continue;
      shadowBuf[(py * shadowW + px) * 4 + 3] = Math.round(220 * (1 - d * 0.5));
    }
  }
  const shadowBuffer = await sharp(shadowBuf, {
    raw: { width: shadowW, height: shadowH, channels: 4 },
  })
    .blur(blurSigma)
    .png()
    .toBuffer();

  // ── Colour-grade: darken + desaturate to match dark garage lighting ───────
  // Input is PNG buffer — no raw mode needed
  const carFinal = await sharp(carPng)
    .modulate({ brightness: 0.72, saturation: 0.85 })
    .png()
    .toBuffer();

  // ── Composite: garage bg → shadow → car ──────────────────────────────────
  return await sharp(GARAGE_BG_PATH)
    .composite([
      { input: shadowBuffer, left: shadowX, top: shadowY },
      { input: carFinal,     left: x,       top: y },
    ])
    .jpeg({ quality: 93 })
    .toBuffer();
}

// ── Full pipeline ────────────────────────────────────────────────────────────

export async function processCarPhoto(photoBase64: string): Promise<string> {
  // Check cache
  const hash      = crypto.createHash("md5").update(photoBase64).digest("hex");
  const cacheFile = path.join(CACHE_DIR, `${hash}.jpg`);
  if (fs.existsSync(cacheFile)) {
    const filename   = `${hash}.jpg`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.copyFileSync(cacheFile, outputPath);
    }
    return `/api/uploads/garage/${filename}`;
  }

  // Convert base64 data URL → buffer
  const base64Data  = photoBase64.replace(/^data:image\/\w+;base64,/, "");
  const photoBuffer = Buffer.from(base64Data, "base64");

  // Step 1: Upload original photo → Flux relight for garage interior
  ensureFalConfig();
  const blob        = new Blob([photoBuffer], { type: "image/jpeg" });
  const uploadedUrl = await fal.storage.upload(blob);
  let relitUrl: string;
  try {
    relitUrl = await relightForGarage(uploadedUrl);
  } catch (err) {
    console.warn("Relight step failed, using original:", err);
    relitUrl = uploadedUrl;
  }

  // Step 2: Remove background from relit image
  const noBgUrl    = await removeBackground(relitUrl);

  // Step 3: Download transparent PNG
  const noBgBuffer = await downloadImage(noBgUrl);

  // Step 3: Compose in garage → full JPEG scene
  const composedJpeg = await composeInGarage(noBgBuffer);

  // Save
  const filename   = `${crypto.randomUUID()}.jpg`;
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR,  { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, composedJpeg);
  fs.writeFileSync(cacheFile, composedJpeg);

  return `/api/uploads/garage/${filename}`;
}
