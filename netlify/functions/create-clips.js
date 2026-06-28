exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) }; }

  const { videoUrl, clips, businessName } = body;
  const SHOTSTACK_KEY = process.env.SHOTSTACK_API_KEY;

  if (!SHOTSTACK_KEY) return { statusCode: 500, body: JSON.stringify({ error: "SHOTSTACK_API_KEY not configured" }) };
  if (!videoUrl || !clips || !clips.length) return { statusCode: 400, body: JSON.stringify({ error: "Missing video or clips" }) };

  try {
    // Submit a render job for each clip
    const renderIds = [];

    for (const clip of clips) {
      const payload = {
        timeline: {
          tracks: [
            {
              clips: [
                {
                  asset: {
                    type: "video",
                    src: videoUrl,
                    trim: clip.start,
                    volume: 1
                  },
                  start: 0,
                  length: clip.end - clip.start
                }
              ]
            }
          ]
        },
        output: {
          format: "mp4",
          size: { width: 1080, height: 1920 }, // vertical 9:16
          fps: 30,
          quality: "high"
        }
      };

      const res = await fetch("https://api.shotstack.io/stage/render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": SHOTSTACK_KEY
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.response?.id) {
        return { statusCode: 500, body: JSON.stringify({ error: `Shotstack error: ${data.message || JSON.stringify(data).substring(0, 200)}` }) };
      }

      renderIds.push({ id: data.response.id, label: clip.label || `Clip ${renderIds.length + 1}` });
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renderIds })
    };

  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
