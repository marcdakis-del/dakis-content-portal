exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const { businessName, businessType, promotion, contentType, tone } = JSON.parse(event.body || "{}");

  if (!businessName || !businessType || !promotion || !contentType || !tone) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  const prompt = `You are a social media copywriter for local small businesses in Scotland. 

Write a ${contentType} for a business called "${businessName}", which is a ${businessType}.
Tone: ${tone}.
What to promote: ${promotion}

Rules:
- Write ONLY the finished post content — no preamble, no labels, no explanation
- Make it feel authentic and local, not corporate
- Include relevant hashtags at the end if appropriate for the platform
- Keep it punchy and natural`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text;

  if (!text) {
    return { statusCode: 500, body: JSON.stringify({ error: "No content returned" }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text }),
  };
};
