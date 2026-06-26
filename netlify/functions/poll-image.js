exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: "Invalid body" }) }; }

  const { requestId } = body;
  const FAL_KEY = process.env.FAL_API_KEY;

  if (!FAL_KEY) return { statusCode: 500, body: JSON.stringify({ error: "FAL_API_KEY not configured" }) };
  if (!requestId) return { statusCode: 400, body: JSON.stringify({ error: "Missing requestId" }) };

  try {
    // Try all three possible endpoint formats and return debug info
    const urls = [
      `https://queue.fal.run/fal-ai/flux/dev/image-to-image/requests/${requestId}/response`,
      `https://queue.fal.run/fal-ai/flux/dev/image-to-image/requests/${requestId}/status`,
      `https://fal.run/fal-ai/flux/dev/image-to-image/requests/${requestId}`,
    ];

    const results = [];
    for (const url of urls) {
      const res = await fetch(url, { headers: { "Authorization": `Key ${FAL_KEY}` } });
      const text = await res.text();
      results.push({ url: url.split('/requests/')[1], status: res.status, body: text.substring(0, 200) });
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debug: results })
    };

  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
