import path from "path";
import fs from "fs";
import crypto from "crypto";
import https from "https";
import sharp from "sharp";

const OUT_W = 576;
const OUT_H = 1024;

const CACHE_DIR   = path.resolve(process.cwd(), "uploads/cache");
const GARAGE_SEED = 42;

// ── HTTP ──────────────────────────────────────────────────────────────────────

function httpsRequest(
  hostname: string,
  urlPath: string,
  method: string,
  headers: Record<string, string>,
  body?: Buffer,
): Promise<{ status: number; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const opts: https.RequestOptions = {
      hostname, path: urlPath, method,
      timeout: 120_000, agent: false, rejectUnauthorized: false,
      ...(hostname.endsWith("fal.media") ? { minVersion: "TLSv1.3" as any } : {}),
      headers: { ...headers, ...(body ? { "Content-Length": body.byteLength } : {}) },
    };
    const req = https.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks) }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error(`timeout on ${hostname}`)); });
    if (body) req.write(body);
    req.end();
  });
}

function httpsGetBufferOnce(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    function doGet(u: string) {
      const p = new URL(u);
      const req = https.get({
        hostname: p.hostname, path: p.pathname + p.search,
        timeout: 30_000, agent: false, rejectUnauthorized: false,
        ...(p.hostname.endsWith("fal.media") ? { minVersion: "TLSv1.3" as any } : {}),
      } as https.RequestOptions, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doGet(res.headers.location); return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error(`download timeout`)); });
    }
    doGet(url);
  });
}

async function httpsGetBuffer(url: string): Promise<Buffer> {
  for (let i = 1; i <= 8; i++) {
    if (i > 1) { console.log(`Download retry ${i}...`); await sleep(1000); }
    try { return await httpsGetBufferOnce(url); }
    catch (e: any) {
      console.log(`Download attempt ${i} failed:`, e.message);
      if (i === 8) throw e;
    }
  }
  throw new Error("unreachable");
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function getFalKey() {
  const k = process.env["FAL_KEY"];
  if (!k) throw new Error("FAL_KEY environment variable is not set");
  return k;
}

// ── Image prep: crop to 9:16 portrait + brighten ─────────────────────────────

async function preparePortraitImage(imgBuf: Buffer): Promise<{ buf: Buffer; mime: string }> {
  // Fit full car into portrait 576x1024 with neutral gray letterboxing.
  // Kontext will replace gray bars + original background with garage.
  const prepared = await sharp(imgBuf)
    .resize(OUT_W, OUT_H, { fit: "contain", position: "centre", background: { r: 80, g: 80, b: 80 } })
    .normalize()
    .modulate({ brightness: 1.5, saturation: 1.2 })
    .jpeg({ quality: 92 })
    .toBuffer();

  return { buf: prepared, mime: "image/jpeg" };
}

// ── Upload ────────────────────────────────────────────────────────────────────

async function upload(buf: Buffer, mime: string): Promise<string> {
  const auth = { "Authorization": `Key ${getFalKey()}`, "Content-Type": "application/json" };
  const ext  = mime === "image/png" ? "png" : "jpg";

  for (let i = 1; i <= 15; i++) {
    if (i > 1) { console.log(`Upload retry ${i}...`); await sleep(3000); }
    try {
      const init = await httpsRequest("rest.fal.ai", "/storage/upload/initiate?storage_type=fal-cdn-v3", "POST", auth,
        Buffer.from(JSON.stringify({ file_name: `car.${ext}`, content_type: mime, expires_in: "1h" })));
      if (init.status !== 200) throw new Error(`initiate HTTP ${init.status}`);
      const { upload_url, file_url } = JSON.parse(init.body.toString());
      const up = new URL(upload_url);
      const put = await httpsRequest(up.hostname, up.pathname + up.search, "PUT", { "Content-Type": mime }, buf);
      if (put.status !== 200 && put.status !== 204) throw new Error(`PUT HTTP ${put.status}`);
      console.log("Uploaded:", file_url);
      return file_url;
    } catch (e: any) {
      console.log(`Upload attempt ${i} failed:`, e.message);
      if (i === 15) throw e;
    }
  }
  throw new Error("unreachable");
}

// ── Queue ─────────────────────────────────────────────────────────────────────

async function falRun(endpoint: string, payload: object): Promise<any> {
  const auth = { "Authorization": `Key ${getFalKey()}`, "Content-Type": "application/json" };

  let sub: any;
  for (let i = 1; i <= 5; i++) {
    if (i > 1) { console.log(`Submit retry ${i}...`); await sleep(2000); }
    try {
      const r = await httpsRequest("queue.fal.run", `/${endpoint}`, "POST", auth, Buffer.from(JSON.stringify(payload)));
      if (r.status !== 200 && r.status !== 201) throw new Error(`submit HTTP ${r.status}`);
      sub = JSON.parse(r.body.toString()); break;
    } catch (e: any) {
      console.log(`Submit attempt ${i} failed:`, e.message);
      if (i === 5) throw e;
    }
  }

  const statusUrl   = new URL(sub.status_url);
  const responseUrl = new URL(sub.response_url);
  console.log(`[${endpoint}] id:`, sub.request_id);

  for (let n = 0; Date.now() < Date.now() + 300_000; n++) {
    await sleep(3000);
    let p: any;
    try {
      const r = await httpsRequest(statusUrl.hostname, statusUrl.pathname + statusUrl.search, "GET", auth);
      p = JSON.parse(r.body.toString());
    } catch (e: any) { console.log("Poll retry:", e.message); continue; }
    console.log(`[${endpoint}] poll`, n + 1, p.status);
    if (p.status === "COMPLETED") break;
    if (p.status === "FAILED") throw new Error(`fal FAILED: ${JSON.stringify(p).slice(0, 200)}`);
  }

  for (let i = 1; i <= 10; i++) {
    await sleep(3000);
    const r = await httpsRequest(responseUrl.hostname, responseUrl.pathname + responseUrl.search, "GET", auth);
    console.log(`[${endpoint}] result ${i} → HTTP ${r.status}`);
    if (r.status === 200) return JSON.parse(r.body.toString());
    if (i === 10) throw new Error(`result failed after 10 attempts`);
  }
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(make: string, model: string, color: string) {
  const col = color ? `${color} ` : "";
  return (
    `Recompose the ${col}${make} ${model} in a brightly lit underground parking garage. ` +
    `The car must be shown from a front three-quarter left view (front-left corner of the car visible), ` +
    `low camera angle slightly below the hood, full car visible from bumper to bumper. ` +
    `Same car color and model details. ` +
    `Garage background: bright cyan and blue LED neon strip lights on the ceiling, ` +
    `bright white fluorescent tubes illuminating the full scene, ` +
    `vivid blue and teal neon on concrete walls, ` +
    `shiny wet concrete floor with neon reflections under the car, ` +
    `colorful graffiti murals on walls, blue tool cabinet in the back. ` +
    `Cinematic car photography, dramatic neon lighting, full car in frame.`
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function processCarPhoto(
  photoBase64: string,
  make = "Car", model = "", color = "",
  attempt = 1,
): Promise<string> {
  const photoHash = crypto.createHash("md5").update(photoBase64).digest("hex").slice(0, 12);
  const cacheKey  = crypto.createHash("md5").update(`v42:${photoHash}:${make}:${model}:${color}:a${attempt}`).digest("hex");

  const OUTPUT_DIR = path.resolve(process.cwd(), "uploads/garage");
  const cacheFile  = path.join(CACHE_DIR, `${cacheKey}.jpg`);
  const outputFile = path.join(OUTPUT_DIR, `${cacheKey}.jpg`);

  if (fs.existsSync(cacheFile)) {
    console.log("Cache hit:", cacheKey);
    if (!fs.existsSync(outputFile)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.copyFileSync(cacheFile, outputFile);
    }
    return `/api/uploads/garage/${cacheKey}.jpg`;
  }

  console.log(`Generating: ${make} ${model} (${color})`);

  const mimeMatch = photoBase64.match(/^data:(image\/[a-z+]+);base64,/);
  if (!mimeMatch) throw new Error("Invalid photo data URL");
  const imgBuf = Buffer.from(photoBase64.slice(mimeMatch[0].length), "base64");

  // Crop to 9:16 portrait + brighten input so Kontext doesn't preserve dark exposure
  const { buf: portraitBuf, mime: portraitMime } = await preparePortraitImage(imgBuf);
  console.log(`Portrait image: ${OUT_W}x${OUT_H}, ${portraitBuf.length} bytes`);

  const fileUrl = await upload(portraitBuf, portraitMime);
  const seed = GARAGE_SEED + (attempt - 1) * 1000;
  const result  = await falRun("fal-ai/flux-pro/kontext/max", {
    image_url:           fileUrl,
    prompt:              buildPrompt(make, model, color),
    num_inference_steps: 28,
    guidance_scale:      10.0,
    seed,
    output_format:       "jpeg",
  });

  const imgUrl: string = result?.images?.[0]?.url ?? result?.image?.url;
  if (!imgUrl) throw new Error("No image URL in result: " + JSON.stringify(result).slice(0, 200));

  const rawBuf = await httpsGetBuffer(imgUrl);
  console.log("Raw result:", rawBuf.length, "bytes");

  // Force mobile portrait resolution + brighten
  const rawMeta = await sharp(rawBuf).metadata();
  console.log(`Raw dimensions: ${rawMeta.width}x${rawMeta.height}`);

  const finalBuf = await sharp(rawBuf)
    .resize(OUT_W, OUT_H, { fit: "cover", position: "centre" })  // force 576x1024 portrait
    .modulate({ brightness: 1.4, saturation: 1.3 })
    .jpeg({ quality: 90 })
    .toBuffer();
  console.log("Post-processed:", finalBuf.length, "bytes");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(outputFile, finalBuf);
  fs.writeFileSync(cacheFile, finalBuf);

  return `/api/uploads/garage/${cacheKey}.jpg`;
}
