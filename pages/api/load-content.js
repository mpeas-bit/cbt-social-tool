import { get } from "@vercel/edge-config";

export default async function handler(req, res) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const data = await get("content_" + today);
    if (data && data.date === today) {
      res.status(200).json({ ok: true, frozen: true, data });
    } else {
      res.status(200).json({ ok: true, frozen: false });
    }
  } catch(e) {
    res.status(200).json({ ok: true, frozen: false });
  }
}