exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const { imageBase64, businessName, businessType, promotion, headline, tone } = JSON.parse(event.body || "{}");

  if (!imageBase64 || !businessName) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  const stylePrompt = `Professional editorial advertisement for "${businessName}", a ${businessType}.
Headline text incorporated into the image: "${headline}"
Subtext: "${promotion.substring(0, 80)}"
Style: high-end magazine advertisement, editorial photography, studio lighting, elegant typography baked into the composition, clean negative space for text, premium brand feel, award-winning ad campaign aesthetic.
The image should feel like it was produced by a top creative agency. Sophisticated colour palette, intentional layout, the product or subject should look aspirational and beautifully lit.
Do NOT use generic stock photo style. This should look like a real paid advertisement.`;

  try {
    // Submit to fal.ai flux with image reference
    const submitRes = await fetch("https://queue.fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${process.env.FAL_API_KEY}`
      },
      body: JSON.stringify({
        image_url: `data:image/jpeg;base64,${imageBase64}`,
        prompt: stylePrompt,
        strength: 0.75,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        image_size: "square_hd"
      })
    });

    const submitData = await submitRes.json();

    if (!submitRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: submitData.message || "Image generation failed" }) };
    }

    // Poll for result
    const requestId = submitData.request_id;
    const statusUrl = `https://queue.fal.run/fal-ai/flux/dev/image-to-image/requests/${requestId}`;

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(statusUrl, {
        headers: { "Authorization": `Key ${process.env.FAL_API_KEY}` }
      });
      const statusData = await statusRes.json();

      if (statusData.status === "COMPLETED" || statusData.images) {
        const imageUrl = statusData.images?.[0]?.url || statusData.image?.url;
        if (imageUrl) {
          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl })
          };
        }
      }

      if (statusData.status === "FAILED") {
        return { statusCode: 500, body: JSON.stringify({ error: "Image generation failed" }) };
      }
    }

    return { statusCode: 500, body: JSON.stringify({ error: "Timed out waiting for image" }) };

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
