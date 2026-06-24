exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  const { imageBase64, businessName, businessType, promotion, headline } = body;
  const FAL_KEY = process.env.FAL_API_KEY;

  if (!FAL_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "FAL_API_KEY not configured in Netlify environment variables" }) };
  }

  if (!imageBase64 || !businessName) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing image or business name" }) };
  }

  const prompt = `Premium editorial magazine advertisement for a ${businessType} called "${businessName}". Professional studio photography, aspirational lifestyle aesthetic, sophisticated colour palette, beautiful lighting, cinematic quality, luxury brand feel. Clean composition. Do not add any text or words to the image.`;

  // fal.ai accepts base64 data URIs directly as image_url
  const dataUri = `data:image/jpeg;base64,${imageBase64}`;

  try {
    // Submit to queue
    const submitRes = await fetch("https://queue.fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image_url: dataUri,
        prompt: prompt,
        strength: 0.75,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        image_size: "square_hd"
      })
    });

    const submitText = await submitRes.text();
    let submitData;
    try { submitData = JSON.parse(submitText); } catch(e) {
      return { statusCode: 500, body: JSON.stringify({ error: `Submit parse error: ${submitText.substring(0, 300)}` }) };
    }

    if (!submitRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: `Submit failed (${submitRes.status}): ${submitData.detail || submitData.message || submitText.substring(0, 300)}` }) };
    }

    // Check if result came back immediately
    if (submitData.images?.[0]?.url) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: submitData.images[0].url })
      };
    }

    const requestId = submitData.request_id;
    if (!requestId) {
      return { statusCode: 500, body: JSON.stringify({ error: `No request_id in response: ${submitText.substring(0, 300)}` }) };
    }

    // Poll for result â€” up to 80 seconds
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 2000));

      const pollRes = await fetch(`https://queue.fal.run/fal-ai/flux/dev/image-to-image/requests/${requestId}`, {
        headers: { "Authorization": `Key ${FAL_KEY}` }
      });

      const pollText = await pollRes.text();
      let pollData;
      try { pollData = JSON.parse(pollText); } catch(e) { continue; }

      if (pollData.images?.[0]?.url) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: pollData.images[0].url })
        };
      }

      if (pollData.status === "FAILED" || pollData.error) {
        return { statusCode: 500, body: JSON.stringify({ error: `Generation failed: ${pollData.error || pollData.detail || "unknown error"}` }) };
      }
    }

    return { statusCode: 500, body: JSON.stringify({ error: "Timed out waiting for image â€” please try again" }) };

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: `Unexpected error: ${e.message}` }) };
  }
};
