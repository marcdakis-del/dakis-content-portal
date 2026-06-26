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
    // Try fetching the result directly â€” returns the image if done, or status if not
    const resultRes = await fetch(`https://queue.fal.run/fal-ai/flux/dev/image-to-image/requests/${requestId}`, {
      headers: { "Authorization": `Key ${FAL_KEY}` }
    });

    const resultText = await resultRes.text();

    if (!resultText || resultText.trim() === '') {
      // Empty response means still processing
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "pending" }) };
    }

    let resultData;
    try { resultData = JSON.parse(resultText); }
    catch(e) {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "pending" }) };
    }

    // Has image â€” done
    if (resultData.images?.[0]?.url) {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "done", imageUrl: resultData.images[0].url }) };
    }

    // Check status field
    const status = resultData.status;
    if (status === "COMPLETED") {
      // Result should be in response_url
      const responseUrl = resultData.response_url;
      if (responseUrl) {
        const imgRes = await fetch(responseUrl, { headers: { "Authorization": `Key ${FAL_KEY}` } });
        const imgData = await imgRes.json();
        const imageUrl = imgData.images?.[0]?.url;
        if (imageUrl) {
          return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "done", imageUrl }) };
        }
      }
    }

    if (status === "FAILED") {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "failed", error: "Generation failed" }) };
    }

    if (status === "IN_QUEUE" || status === "IN_PROGRESS") {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "pending" }) };
    }

    // Return full response for debugging
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "pending", debug: resultText.substring(0, 300) }) };

  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
