export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { pass } = req.body;
  const expected = process.env.PASSCODE || "";
  if (pass === expected) {
    res.setHeader("Set-Cookie", `auth=${expected}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
    return res.status(200).json({ ok: true });
  }
  // Return expected length for debugging (never the actual value)
  return res.status(401).json({ error: "Wrong passcode", expectedLength: expected.length, receivedLength: pass.length });
}