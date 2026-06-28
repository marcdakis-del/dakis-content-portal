exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: "Invalid body" }) }; }

  const { renderIds } = body;
  const SHOTSTACK_KEY = process.env.SHOTSTACK_API_KEY;

  if (!SHOTSTACK_KEY) return { statusCode: 500, body: JSON.stringify({ error: "SHOTSTACK_API_KEY not configured" }) };
  if (!renderIds || !renderIds.length) return { statusCode: 400, body: JSON.stringify({ error: "Missing renderIds" }) };

  try {
    const results = [];

    for (const item of renderIds) {
      const res = await fetch(`https://api.shotstack.io/stage/render/${item.id}`, {
        headers: { "x-api-key": SHOTSTACK_KEY }
      });
      const data = await res.json();
      const status = data.response?.status;
      const url = data.response?.url;

      results.push({
        id: item.id,
        label: item.label,
        status: status === "done" ? "done" : status === "failed" ? "failed" : "pending",
        url: url || null
      });
    }

    const allDone = results.every(r => r.status === "done");
    const anyFailed = results.some(r => r.status === "failed");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results, allDone, anyFailed })
    };

  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
