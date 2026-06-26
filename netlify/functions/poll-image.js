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
    const res = await fetch(`https://queue.fal.run/fal-ai/flux/dev/image-to-image/requests/${requestId}`, {
      headers: { "Authorization": `Key ${FAL_KEY}` }
    });

    const data = await res.json();

    if (data.images?.[0]?.url) {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "done", imageUrl: data.images[0].url }) };
    }

    if (data.status === "FAILED" || data.error) {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "failed", error: data.error || "Generation failed" }) };
    }

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "pending" }) };

  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
