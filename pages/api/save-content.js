import { createClient } from "@vercel/edge-config";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const today = new Date().toISOString().split("T")[0];
    const data = { ...req.body, date: today, generatedAt: new Date().toISOString() };
    
    const response = await fetch(
      `https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ items: [{ operation: "upsert", key: "content_" + today, value: data }] })
      }
    );
    
    if (!response.ok) {
      const err = await response.text();
      throw new Error("Edge config error: " + err);
    }
    
    res.status(200).json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}