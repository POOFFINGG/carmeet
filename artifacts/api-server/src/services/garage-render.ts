import path from "path";
import fs from "fs";
import crypto from "crypto";
import https from "https";

// ── Output dimensions (portrait 9:16, full mobile screen) ────────────────────
const OUT_W = 576;
const OUT_H = 1024;

const OUTPUT_DIR = path.resolve(process.cwd(), "uploads/garage");
const CACHE_DIR  = path.resolve(process.cwd(), "uploads/cache");

// Fixed seed → garage layout + car position are always identical
const GARAGE_SEED = 42;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFalKey(): string {
  const key = process.env["FAL_KEY"];
  if (!key) throw new Error("FAL_KEY environment variable is not set");
  return key;
}

// Short HTTPS request — works in tsx server because Queue API uses quick round-trips
function httpsRequest(hostname: string, urlPath: string, method: string, headers: Record<string, string>, bodyStr?: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const buf = bodyStr ? Buffer.from(bodyStr, "utf8") : null;
    const req = https.request(
      {
        hostname, path: urlPath, method,
        timeout: 120_000,
        agent: false,
        rejectUnauthorized: false,
        headers: { ...headers, ...(buf ? { "Content-Length": buf.byteLength } : {}) },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() }));
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("request timeout")); });
    if (buf) req.write(buf);
    req.end();
  });
}

function httpsGetBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    function doGet(u: string) {
      const parsed = new URL(u);
      https.get(
        { hostname: parsed.hostname, path: parsed.pathname + parsed.search, timeout: 120_000, agent: false, rejectUnauthorized: false },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            doGet(res.headers.location); return;
          }
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
          res.on("error", reject);
        },
      ).on("error", reject);
    }
    doGet(url);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const GARAGE_SCENE =
  "dark underground car garage interior, " +
  "industrial fluorescent tube lights on the ceiling casting cool white light, " +
  "worn concrete floor with oil stains and wet reflections, " +
  "graffiti art on brick walls in the background, " +
  "blue mechanic tool cabinet against the back wall, " +
  "atmospheric haze with dust particles in the air, " +
  "cinematic moody lighting";

function buildPrompt(make: string, model: string, color: string): string {
  const col = color ? `${color} ` : "";
  return (
    `${col}${make} ${model} parked diagonally in ${GARAGE_SCENE}. ` +
    `The LEFT FRONT WHEEL and LEFT HEADLIGHT are in the foreground, closest to the viewer. ` +
    `The right side of the car recedes into the background. ` +
    `The car's hood slopes away to the right. Left door panel clearly visible. ` +
    `Classic automotive three-quarter front-left promotional shot. ` +
    `WIDE SHOT — entire car fully visible, all four wheels on the ground, no cropping. ` +
    `Large empty space above the car showing garage ceiling with fluorescent lights. ` +
    `Large empty space below the car showing wet concrete floor. ` +
    `Portrait 9:16 vertical frame. Photorealistic, cinematic, sharp focus.`
  );
}

function buildNegativePrompt(): string {
  return "symmetrical, centered, front view, straight on, head-on, both headlights same size, car facing camera directly";
}

// ── fal.ai Queue API (short requests, no long-lived connections) ──────────────

async function falQueueRun(endpoint: string, payload: object): Promise<Buffer> {
  const key = getFalKey();
  const auth = { "Authorization": `Key ${key}`, "Content-Type": "application/json" };

  // Step 1: Submit
  const submitResp = await httpsRequest("queue.fal.run", `/${endpoint}`, "POST", auth, JSON.stringify(payload));
  if (submitResp.status !== 200 && submitResp.status !== 201) {
    throw new Error(`fal submit failed HTTP ${submitResp.status}: ${submitResp.body.slice(0, 200)}`);
  }
  const submitData = JSON.parse(submitResp.body);
  const statusUrl  = new URL(submitData.status_url);
  const resultUrl  = new URL(submitData.response_url);

  // Step 2: Poll
  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    await sleep(3000);
    const pollResp = await httpsRequest(statusUrl.hostname, statusUrl.pathname, "GET", auth);
    if (pollResp.status !== 200 && pollResp.status !== 202) {
      throw new Error(`fal poll failed HTTP ${pollResp.status}`);
    }
    const pollData = JSON.parse(pollResp.body);
    if (pollData.status === "COMPLETED") break;
    if (pollData.status === "FAILED") throw new Error("fal job failed: " + JSON.stringify(pollData).slice(0, 100));
  }

  // Step 3: Get result
  const resultResp = await httpsRequest(resultUrl.hostname, resultUrl.pathname, "GET", auth);
  if (resultResp.status !== 200) throw new Error(`fal result failed HTTP ${resultResp.status}`);
  const resultData = JSON.parse(resultResp.body);
  const imgUrl = resultData.images?.[0]?.url ?? resultData.image?.url;
  if (!imgUrl) throw new Error("No image URL in result: " + resultResp.body.slice(0, 100));

  // Step 4: Download image
  return httpsGetBuffer(imgUrl);
}

// ── Full pipeline ─────────────────────────────────────────────────────────────

export async function processCarPhoto(
  _photoBase64: string,
  make = "Car",
  model = "",
  color = "",
): Promise<string> {
  const hash = crypto.createHash("md5")
    .update(`v15:${make}:${model}:${color}`)
    .digest("hex");
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

  getFalKey();

  const resultJpeg = await falQueueRun("fal-ai/flux/dev", {
    prompt: buildPrompt(make, model, color),
    negative_prompt: buildNegativePrompt(),
    image_size: { width: OUT_W, height: OUT_H },
    num_inference_steps: 35,
    guidance_scale: 7.5,
    seed: GARAGE_SEED,
    num_images: 1,
    output_format: "jpeg",
  });

  console.log("Generation succeeded, bytes:", resultJpeg.length);

  const filename = `${crypto.randomUUID()}.jpg`;
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), resultJpeg);
  fs.writeFileSync(cacheFile, resultJpeg);

  return `/api/uploads/garage/${filename}`;
}
