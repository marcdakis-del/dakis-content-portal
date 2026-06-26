exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) }; }

  const { imageBase64, businessName, businessType } = body;
  const FAL_KEY = process.env.FAL_API_KEY;

  if (!FAL_KEY) return { statusCode: 500, body: JSON.stringify({ error: "FAL_API_KEY not configured" }) };
  if (!imageBase64 || !businessName) return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };

  const prompt = `Premium editorial magazine advertisement for a ${businessType} called "${businessName}". Professional studio photography, aspirational lifestyle, sophisticated colour palette, beautiful lighting, luxury brand feel. Do not add any text or words.`;

  try {
    const submitRes = await fetch("https://queue.fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image_url: `data:image/jpeg;base64,${imageBase64}`,
        prompt,
        strength: 0.75,
        num_inference_steps: 20,
        guidance_scale: 3.5,
        num_images: 1,
        image_size: "square_hd"
      })
    });

    const submitText = await submitRes.text();
    let submitData;
    try { submitData = JSON.parse(submitText); }
    catch(e) { return { statusCode: 500, body: JSON.stringify({ error: `Parse error: ${submitText.substring(0, 200)}` }) }; }

    if (!submitRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: `Submit failed (${submitRes.status}): ${submitData.detail || submitData.message || submitText.substring(0, 200)}` }) };
    }

    // Return requestId AND the status/response URLs provided by fal
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: submitData.request_id,
        statusUrl: submitData.status_url,
        responseUrl: submitData.response_url
      })
    };

  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: `Error: ${e.message}` }) };
  }
};
