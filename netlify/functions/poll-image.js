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
    const resultRes = await fetch(`https://queue.fal.run/fal-ai/flux/dev/image-to-image/requests/${requestId}`, {
      headers: { "Authorization": `Key ${FAL_KEY}` }
    });

    const resultText = await resultRes.text();

    // Return everything so we can see exactly what fal.ai sends back
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "debug",
        httpStatus: resultRes.status,
        responseText: resultText.substring(0, 500)
      })
    };

  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
