import { XMLParser } from "fast-xml-parser";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
    try {
          const response = await fetch("https://www.cbtnews.com/feed/");
      const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(xml);
    const items = result.rss.channel.item.slice(0, 15);

    const stripHtml = str => (str || "").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();

    const articles = items.map(item => ({
            title: item.title || "",
                                              content: stripHtml(item["content:encoded"] || item.description || ""),
                                              description: stripHtml(item.description || ""),
                                              link: item.link || "",
                                              date: item.pubDate || ""
                                        }));

    res.status(200).json({ status: "ok", articles });
} catch (e) {
    res.status(500).json({ status: "error", message: e.message });
}
}
