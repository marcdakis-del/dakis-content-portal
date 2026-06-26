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
    // Check status
    const statusRes = await fetch(`https://queue.fal.run/fal-ai/flux/dev/image-to-image/requests/${requestId}/status`, {
      headers: { "Authorization": `Key ${FAL_KEY}` }
    });

    const statusText = await statusRes.text();
    let statusData;
    try { statusData = JSON.parse(statusText); }
    catch(e) { return { statusCode: 500, body: JSON.stringify({ error: `Status parse error: ${statusText.substring(0, 200)}` }) }; }

    // Still in queue or processing
    if (statusData.status === "IN_QUEUE" || statusData.status === "IN_PROGRESS") {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "pending" }) };
    }

    // Failed
    if (statusData.status === "FAILED") {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "failed", error: "Generation failed on fal.ai" }) };
    }

    // Completed — fetch the actual result
    if (statusData.status === "COMPLETED") {
      const resultRes = await fetch(`https://queue.fal.run/fal-ai/flux/dev/image-to-image/requests/${requestId}`, {
        headers: { "Authorization": `Key ${FAL_KEY}` }
      });
      const resultData = await resultRes.json();
      const imageUrl = resultData.images?.[0]?.url;

      if (imageUrl) {
        return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "done", imageUrl }) };
      }
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "failed", error: "No image in result" }) };
    }

    // Unknown status — still pending
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "pending" }) };

  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
