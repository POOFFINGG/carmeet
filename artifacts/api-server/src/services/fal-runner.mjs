// Standalone runner using fal Queue API (submit → poll → download).
// Short HTTP requests instead of one long-lived connection.
// Uses Node.js https module directly.
// Writes base64-encoded image bytes to stdout.
import https from "https";

function httpsRequest(options, bodyStr) {
  return new Promise((resolve, reject) => {
    const buf = bodyStr ? Buffer.from(bodyStr, "utf8") : null;
    const req = https.request(
      {
        ...options,
        timeout: 120_000,
        agent: false,
        rejectUnauthorized: false,
        headers: {
          ...options.headers,
          ...(buf ? { "Content-Length": buf.byteLength } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", c => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString(), headers: res.headers }));
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("request timeout")); });
    if (buf) req.write(buf);
    req.end();
  });
}

function httpsGetBuffer(url) {
  return new Promise((resolve, reject) => {
    function doGet(u) {
      const parsed = new URL(u);
      https.get({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        timeout: 120_000,
        agent: false,
        rejectUnauthorized: false,
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doGet(res.headers.location); return;
        }
        const chunks = [];
        res.on("data", c => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      }).on("error", reject);
    }
    doGet(url);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const input = JSON.parse(process.argv[2]);
const { FAL_KEY, endpoint, payload } = input;

const AUTH = { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" };

try {
  // Step 1: Submit to queue
  const submitResp = await httpsRequest({
    hostname: "queue.fal.run",
    path: `/${endpoint}`,
    method: "POST",
    headers: AUTH,
  }, JSON.stringify(payload));

  if (submitResp.status !== 200 && submitResp.status !== 201) {
    process.stderr.write(`Submit failed HTTP ${submitResp.status}: ${submitResp.body.slice(0, 300)}\n`);
    process.exit(1);
  }

  const submitData = JSON.parse(submitResp.body);
  const statusUrl = submitData.status_url;
  const responseUrl = submitData.response_url;
  if (!statusUrl || !responseUrl) {
    process.stderr.write("No status_url/response_url: " + submitResp.body.slice(0, 200) + "\n");
    process.exit(1);
  }

  // Step 2: Poll until complete using status_url from response
  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    await sleep(2000);

    const statusParsed = new URL(statusUrl);
    const statusResp = await httpsRequest({
      hostname: statusParsed.hostname,
      path: statusParsed.pathname + statusParsed.search,
      method: "GET",
      headers: AUTH,
    });

    if (statusResp.status !== 200 && statusResp.status !== 202) {
      process.stderr.write(`Status check failed HTTP ${statusResp.status}: ${statusResp.body.slice(0,100)}\n`);
      process.exit(1);
    }

    const statusData = JSON.parse(statusResp.body);
    if (statusData.status === "COMPLETED") break;
    if (statusResp.status === 200 && !["IN_QUEUE", "IN_PROGRESS"].includes(statusData.status)) break;
    if (statusData.status === "FAILED") {
      process.stderr.write("Job failed: " + JSON.stringify(statusData).slice(0, 200) + "\n");
      process.exit(1);
    }
    // IN_QUEUE or IN_PROGRESS → keep polling
  }

  // Step 3: Get result using response_url from submit
  const responseParsed = new URL(responseUrl);
  const resultResp = await httpsRequest({
    hostname: responseParsed.hostname,
    path: responseParsed.pathname + responseParsed.search,
    method: "GET",
    headers: AUTH,
  });

  if (resultResp.status !== 200) {
    process.stderr.write(`Result fetch failed HTTP ${resultResp.status}: ${resultResp.body.slice(0, 300)}\n`);
    process.exit(1);
  }

  const resultData = JSON.parse(resultResp.body);
  const url = resultData.images?.[0]?.url ?? resultData.image?.url;
  if (!url) {
    process.stderr.write("No image URL in result: " + resultResp.body.slice(0, 200) + "\n");
    process.exit(1);
  }

  // Step 4: Download image
  const imgBuf = await httpsGetBuffer(url);
  process.stdout.write(imgBuf.toString("base64"));
} catch (e) {
  process.stderr.write(e.message + "\n");
  process.exit(1);
}
