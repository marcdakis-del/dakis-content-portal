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
    return { statusCode: 500, body: JSON.stringify({ error: "FAL_API_KEY not configured" }) };
  }

  if (!imageBase64 || !businessName) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing image or business name" }) };
  }

  try {
    // Step 1: Upload image buffer directly to fal storage
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    const uploadRes = await fetch("https://fal.run/fal-ai/storage/upload", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "image/jpeg",
        "Accept": "application/json"
      },
      body: imageBuffer
    });

    const uploadText = await uploadRes.text();
    let uploadData;
    try { uploadData = JSON.parse(uploadText); } catch(e) {
      return { statusCode: 500, body: JSON.stringify({ error: `Upload parse error: ${uploadText.substring(0, 200)}` }) };
    }

    if (!uploadRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: `Upload failed: ${uploadData.detail || uploadData.message || uploadText}` }) };
    }

    const imageUrl = uploadData.url;
    if (!imageUrl) {
      return { statusCode: 500, body: JSON.stringify({ error: `No URL in upload response: ${uploadText.substring(0, 200)}` }) };
    }

    // Step 2: Generate ad image using the uploaded URL
    const prompt = `Premium editorial magazine advertisement. Subject: ${businessType} called "${businessName}". Transform this into a high-end ad with professional studio lighting, aspirational lifestyle aesthetic, clean composition with intentional negative space, sophisticated colour palette. Cinematic quality, luxury brand feel. Do not add any text or words.`;

    const genRes = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: prompt,
        strength: 0.65,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        image_size: "square_hd",
        enable_safety_checker: false,
        sync_mode: true
      })
    });

    const genText = await genRes.text();
    let genData;
    try { genData = JSON.parse(genText); } catch(e) {
      return { statusCode: 500, body: JSON.stringify({ error: `Gen parse error: ${genText.substring(0, 200)}` }) };
    }

    if (!genRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: `Generation failed: ${genData.detail || genData.message || genText.substring(0, 200)}` }) };
    }

    const resultUrl = genData.images?.[0]?.url;
    if (!resultUrl) {
      return { statusCode: 500, body: JSON.stringify({ error: `No image in response: ${genText.substring(0, 300)}` }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: resultUrl })
    };

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: `Unexpected error: ${e.message}` }) };
  }
};
