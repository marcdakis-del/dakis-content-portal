exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: "Invalid body" }) }; }

  const { videoBase64, fileName } = body;
  const SHOTSTACK_KEY = process.env.SHOTSTACK_API_KEY;

  if (!SHOTSTACK_KEY) return { statusCode: 500, body: JSON.stringify({ error: "SHOTSTACK_API_KEY not configured" }) };
  if (!videoBase64) return { statusCode: 400, body: JSON.stringify({ error: "Missing video" }) };

  try {
    const videoBuffer = Buffer.from(videoBase64, 'base64');
    const contentType = fileName?.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';

    // Upload to Shotstack ingest
    const res = await fetch("https://api.shotstack.io/stage/assets", {
      method: "POST",
      headers: {
        "x-api-key": SHOTSTACK_KEY,
        "Content-Type": contentType
      },
      body: videoBuffer
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch(e) { return { statusCode: 500, body: JSON.stringify({ error: `Parse error: ${text.substring(0, 200)}` }) }; }

    if (!res.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: `Upload failed: ${data.message || text.substring(0, 200)}` }) };
    }

    const videoUrl = data.data?.attributes?.url || data.url;
    if (!videoUrl) {
      return { statusCode: 500, body: JSON.stringify({ error: `No URL returned: ${text.substring(0, 200)}` }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl })
    };

  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
