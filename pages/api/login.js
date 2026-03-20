export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { pass } = req.body;
  if (pass === process.env.PASSCODE) {
    res.setHeader("Set-Cookie", `auth=${process.env.PASSCODE}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ error: "Wrong passcode" });
}