exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: "Invalid body" }) }; }

  const { statusUrl, responseUrl } = body;
  const FAL_KEY = process.env.FAL_API_KEY;

  if (!FAL_KEY) return { statusCode: 500, body: JSON.stringify({ error: "FAL_API_KEY not configured" }) };
  if (!statusUrl) return { statusCode: 400, body: JSON.stringify({ error: "Missing statusUrl" }) };

  try {
    // Check status using the URL fal gave us
    const statusRes = await fetch(statusUrl, {
      headers: { "Authorization": `Key ${FAL_KEY}` }
    });
    const statusData = await statusRes.json();
    const status = statusData.status;

    if (status === "IN_QUEUE" || status === "IN_PROGRESS") {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "pending" }) };
    }

    if (status === "FAILED") {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "failed", error: "Generation failed on fal.ai" }) };
    }

    if (status === "COMPLETED") {
      // Fetch result from responseUrl
      const resultRes = await fetch(responseUrl, {
        headers: { "Authorization": `Key ${FAL_KEY}` }
      });
      const resultData = await resultRes.json();
      const imageUrl = resultData.images?.[0]?.url;

      if (imageUrl) {
        return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "done", imageUrl }) };
      }
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "failed", error: `No image found: ${JSON.stringify(resultData).substring(0, 200)}` }) };
    }

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "pending", debug: status }) };

  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
