import { useState, useEffect } from "react";
import { Loader2, CheckCircle, X, Check, Clipboard, FileText, Type, Video, ChevronDown, Zap, Lock, Unlock } from "lucide-react";

const TEAL = "#05828E";
const articleLink = "https://cbtnews.co/4sgWIJe";
const SPONSORS = [
  { name: "Dave Cantin Group", url: "https://www.davecantingroup.com/" },
  { name: "Kerrigan Advisors", url: "https://www.kerriganadvisors.com/" },
  { name: "Lotlinx", url: "https://lotlinx.com/" },
  { name: "Force Marketing", url: "https://www.forcemktg.com/" },
  { name: "Joe Verde Group", url: "https://www.joeverde.com/" },
  { name: "Bel Air Partners", url: "https://www.belairpartners.com/" },
  { name: "eLEND Solutions", url: "https://elendsolutions.com/" },
  { name: "Dealer Merchant Services", url: "https://dealermerchantservices.com/" },
  { name: "EasyCare", url: "https://easycare.com/" },
];
const ACCENTS = [TEAL, "#7c3aed", "#16a34a", "#f59e0b"];

export default function App() {
  const [tab, setTab] = useState("picker");
  const [rssArticles, setRssArticles] = useState([]);
  const [rssLoading, setRssLoading] = useState(true);
  const [rssError, setRssError] = useState("");
  const [selected, setSelected] = useState([]);
  const [sponsor, setSponsor] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState("");
  const [generated, setGenerated] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [frozenAt, setFrozenAt] = useState("");
  const [summaries, setSummaries] = useState(["","","",""]);
  const [verifieds, setVerifieds] = useState([false,false,false,false]);
  const [hlResults, setHlResults] = useState([[],[],[],[]]);
  const [hlVisuals, setHlVisuals] = useState([null,null,null,null]);
  const [jsScript, setJsScript] = useState("");
  const [copiedSummary, setCopiedSummary] = useState(null);
  const [copiedHl, setCopiedHl] = useState(null);
  const [jsCopied, setJsCopied] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [context, setContext] = useState("");
  const [captions, setCaptions] = useState([]);
  const [capLoading, setCapLoading] = useState(false);
  const [capCopied, setCapCopied] = useState(null);

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  useEffect(() => {
    fetchRSS();
    checkFrozen();
  }, []);

  const checkFrozen = async () => {
    try {
      const r = await fetch("/api/load-content");
      const d = await r.json();
      if (d.frozen && d.data) {
        const data = d.data;
        setFrozen(true);
        setFrozenAt(data.generatedAt ? new Date(data.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");
        setSummaries(data.summaries || ["","","",""]);
        setVerifieds(data.verifieds || [false,false,false,false]);
        setHlResults(data.hlResults || [[],[],[],[]]);
        setHlVisuals(data.hlVisuals || [null,null,null,null]);
        setJsScript(data.jsScript || "");
        setSponsor(data.sponsor || "");
        setSelected(data.selected || []);
        setGenerated(true);
        setTab("linkedin");
      }
    } catch(e) {}
  };

  const fetchRSS = async () => {
    setRssLoading(true); setRssError("");
    try {
      const r = await fetch("/api/rss");
      const d = await r.json();
      if (d.status !== "ok") throw new Error(d.message);
      setRssArticles(d.articles);
    } catch(e) { setRssError("Could not load feed: " + e.message); }
    finally { setRssLoading(false); }
  };

  const toggleSelect = (i) => {
    if (selected.includes(i)) setSelected(selected.filter(s => s !== i));
    else if (selected.length < 4) setSelected([...selected, i]);
  };

  const callAPI = async (messages, maxTokens) => {
    const r = await fetch("/api/claude", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens || 1000, messages }),
    });
    const d = await r.json();
    return d.content.filter(b => b.type === "text").map(b => b.text).join("");
  };

  const generateAll = async () => {
    if (selected.length !== 4) return;
    setGenerating(true); setGenProgress(""); setGenerated(false);
    const arts = selected.map(i => rssArticles[i]);
    const newSummaries = ["","","",""];
    const newVerifieds = [false,false,false,false];
    const newHlResults = [[],[],[],[]];
    const newHlVisuals = [null,null,null,null];
    try {
      setGenProgress("Generating LinkedIn posts...");
      await Promise.all(arts.map(async (a, i) => {
        const txt = await callAPI([{ role: "user", content: "Summarize this article into a LinkedIn post.\n\nFormat:\n[Short punchy headline]\n\n[1 supporting sentence. Only add a second if truly necessary.]\n\nKey details:\n- [Point 1]\n- [Point 2]\n- [Point 3]\n\nRules: no bold/markdown/hashtags/emojis/em-dashes. Use - for bullets. Under 100 words. Blank lines between sections. Write ONLY VERIFIED on its own line after if accurate.\n\nArticle:\n" + (a.content || a.description) }]);
        if (txt.includes("VERIFIED")) { newVerifieds[i] = true; newSummaries[i] = txt.replace(/VERIFIED.*$/m, "").trim(); }
        else newSummaries[i] = txt;
      }));
      setSummaries([...newSummaries]);
      setVerifieds([...newVerifieds]);

      setGenProgress("Generating headline variations...");
      await Promise.all(arts.map(async (a, i) => {
        const txt = await callAPI([{ role: "user", content: "Shorten this headline into 3 punchy variations under 8 words. Return ONLY JSON: {headlines:[s,s,s],visuals:{images:[s,s],icons:[s,s],symbols:[s,s]}}. Headline: " + a.title }]);
        try { const p = JSON.parse(txt.replace(/```json|```/g, "").trim()); newHlResults[i] = p.headlines || []; newHlVisuals[i] = p.visuals || null; } catch(e) {}
      }));
      setHlResults([...newHlResults]);
      setHlVisuals([...newHlVisuals]);

      setGenProgress("Generating Jumpstart script...");
      const scriptTxt = await callAPI([{ role: "user", content: "Write a 2-2.5 min CBT News Jumpstart broadcast script. Today: " + dayName + ", " + dateStr + ". Format: greeting, STORY 1-4 (ALL CAPS headlines, 3-5 sentences each on own line), outro ending with Have an amazing " + dayName + ".\n\nARTICLE 1:\n" + (arts[0].content||arts[0].description) + "\n\nARTICLE 2:\n" + (arts[1].content||arts[1].description) + "\n\nARTICLE 3:\n" + (arts[2].content||arts[2].description) + "\n\nARTICLE 4:\n" + (arts[3].content||arts[3].description) }], 2000);
      setJsScript(scriptTxt.trim());

      // Save to Edge Config
      setGenProgress("Saving for team...");
      await fetch("/api/save-content", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaries: newSummaries, verifieds: newVerifieds, hlResults: newHlResults, hlVisuals: newHlVisuals, jsScript: scriptTxt.trim(), sponsor, selected })
      });

      setFrozen(true);
      setFrozenAt(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
      setGenerated(true);
      setGenProgress("");
      setTab("linkedin");
    } catch(e) { setGenProgress("Error: " + e.message); }
    finally { setGenerating(false); }
  };

  const unfreeze = () => {
    setFrozen(false);
    setGenerated(false);
    setSummaries(["","","",""]);
    setVerifieds([false,false,false,false]);
    setHlResults([[],[],[],[]]);
    setHlVisuals([null,null,null,null]);
    setJsScript("");
    setSelected([]);
    setTab("picker");
  };

  const generateCaptions = async () => {
    if (!transcript.trim()) return;
    setCapLoading(true); setCaptions([]);
    try {
      const txt = await callAPI([{ role: "user", content: "Write 3 punchy 1-3 sentence social captions. No emojis/hashtags/em-dashes. End each with blank line then: [Watch the full episode at the link in our bio]. Separate sentences with blank lines. Return ONLY a JSON array of 3 strings.\n\nTranscript:\n" + transcript + (context.trim() ? "\n\nContext:\n" + context : "") }]);
      setCaptions(JSON.parse(txt.replace(/```json|```/g, "").trim()));
    } catch { setCaptions(["Error."]); }
    finally { setCapLoading(false); }
  };

  const doCopy = (text, cb) => {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(cb).catch(() => fb(text, cb));
    else fb(text, cb);
  };
  const fb = (text, cb) => {
    const t = document.createElement("textarea"); t.value = text; t.style.cssText = "position:fixed;left:-9999px";
    document.body.appendChild(t); t.select(); document.execCommand("copy"); document.body.removeChild(t); cb();
  };

  const getPost = (i) => {
    let s = (summaries[i] || "").replace(/\*\*/g, "").trim();
    s += "\n\n\u2014\u2014\u2014\n\nFind more here: " + articleLink;
    if (sponsor) { const sp = SPONSORS.find(x => x.name === sponsor); s += "\nToday's news presented by: " + sp.name + " (" + sp.url + ")"; }
    return s;
  };

  const inp = { width:"100%",boxSizing:"border-box",padding:"9px 12px",fontSize:13,fontFamily:"inherit",border:"1.5px solid #e2e8f0",borderRadius:8,background:"#fff",color:"#0f172a",outline:"none",lineHeight:1.6 };
  const sL = { fontSize:10,fontWeight:700,letterSpacing:"0.09em",color:"#94a3b8",textTransform:"uppercase",display:"block",marginBottom:7 };
  const dv = { borderTop:"1px solid #f1f5f9",margin:"16px 0" };
  const pn = { background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"22px",boxSizing:"border-box" };

  const selectedArts = selected.map(i => rssArticles[i]).filter(Boolean);

  const tabs = [
    { id:"picker", label:"Select Articles", icon:Zap },
    { id:"linkedin", label:"LinkedIn Posts", icon:FileText },
    { id:"headlines", label:"Headline Shortener", icon:Type },
    { id:"jumpstart", label:"Jumpstart Script", icon:Clipboard },
    { id:"caption", label:"Clip Caption Maker", icon:Video },
  ];

  return (
    <div style={{ background:"#f8fafc",minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif",paddingBottom:48 }}>
      <style>{"@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}"}</style>
      <div style={{ background:"#fff",borderBottom:"1.5px solid #e2e8f0",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",height:54 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:28,height:28,background:TEAL,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center" }}><FileText size={14} color="#fff" /></div>
          <span style={{ fontSize:14,fontWeight:700,color:"#0f172a" }}>CBT Social Command Center</span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          {frozen && (
            <div style={{ display:"flex",alignItems:"center",gap:6,background:"#fef9c3",border:"1.5px solid #fde68a",borderRadius:8,padding:"5px 12px" }}>
              <Lock size={12} color="#92400e" />
              <span style={{ fontSize:11,fontWeight:700,color:"#92400e" }}>Frozen — generated today{frozenAt ? " at " + frozenAt : ""}</span>
              <button onClick={unfreeze} style={{ display:"flex",alignItems:"center",gap:4,marginLeft:8,padding:"3px 10px",fontSize:11,fontWeight:700,background:"#fff",color:"#92400e",border:"1.5px solid #fde68a",borderRadius:5,cursor:"pointer" }}>
                <Unlock size={10} /> Unfreeze
              </button>
            </div>
          )}
          <div style={{ display:"flex",alignItems:"center",gap:5 }}>
            <div style={{ width:6,height:6,borderRadius:"50%",background:"#22c55e" }} />
            <span style={{ fontSize:11,color:"#22c55e",fontWeight:700 }}>Live</span>
          </div>
        </div>
      </div>
      <div style={{ background:"#fff",borderBottom:"1.5px solid #e2e8f0",padding:"0 28px",display:"flex" }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{ display:"flex",alignItems:"center",gap:7,padding:"13px 18px",fontSize:12,fontWeight:tab===id?700:500,color:tab===id?TEAL:"#94a3b8",border:"none",background:"transparent",borderBottom:tab===id?"2px solid "+TEAL:"2px solid transparent",cursor:"pointer",marginBottom:-1.5 }}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>
      <div style={{ padding:"24px 28px 0" }}>

        {tab === "picker" && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div>
                <div style={{ fontSize:18,fontWeight:700,color:"#0f172a",marginBottom:3 }}>Select 4 articles to cover today</div>
                <div style={{ fontSize:13,color:"#94a3b8" }}>{selected.length}/4 selected — {dayName}, {dateStr}</div>
              </div>
              <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                <button onClick={fetchRSS} disabled={rssLoading} style={{ display:"flex",alignItems:"center",gap:5,padding:"8px 14px",fontSize:12,fontWeight:600,background:"transparent",color:TEAL,border:"1.5px solid #b2e0e4",borderRadius:7,cursor:"pointer",opacity:rssLoading?0.5:1 }}>
                  {rssLoading ? <><Loader2 size={12} style={{animation:"spin 1s linear infinite"}} />Loading...</> : "Refresh Feed"}
                </button>
                <button onClick={generateAll} disabled={selected.length !== 4 || generating}
                  style={{ display:"flex",alignItems:"center",gap:7,padding:"10px 22px",fontSize:13,fontWeight:700,background:selected.length===4&&!generating?TEAL:"#94a3b8",color:"#fff",border:"none",borderRadius:8,cursor:selected.length===4&&!generating?"pointer":"default",transition:"background .2s" }}>
                  {generating ? <><Loader2 size={14} style={{animation:"spin 1s linear infinite"}} />{genProgress||"Generating..."}</> : <><Zap size={14} />Generate All</>}
                </button>
              </div>
            </div>
            {rssError && <div style={{ background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:8,padding:"12px 16px",color:"#ef4444",fontSize:13,marginBottom:16 }}>{rssError}</div>}
            <div style={{ ...pn, marginBottom:16, display:"flex",alignItems:"center",gap:16 }}>
              <span style={{ ...sL, margin:0,whiteSpace:"nowrap" }}>Today's sponsor</span>
              <div style={{ position:"relative",flex:1,maxWidth:320 }}>
                <select value={sponsor} onChange={e=>setSponsor(e.target.value)} style={{ ...inp,appearance:"none",paddingRight:32,cursor:"pointer",marginBottom:0 }}>
                  <option value="">No sponsor</option>
                  {SPONSORS.map((sp,i) => <option key={i} value={sp.name}>{sp.name}</option>)}
                </select>
                <ChevronDown size={13} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",color:"#94a3b8",pointerEvents:"none" }} />
              </div>
            </div>
            {rssLoading ? (
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {[...Array(8)].map((_,i) => <div key={i} style={{ background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"18px",height:100,animation:"pulse 1.5s ease-in-out infinite" }} />)}
              </div>
            ) : (
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {rssArticles.map((a,i) => {
                  const isSelected = selected.includes(i);
                  const slotNum = selected.indexOf(i);
                  const isDisabled = !isSelected && selected.length >= 4;
                  return (
                    <button key={i} onClick={() => toggleSelect(i)} disabled={isDisabled}
                      style={{ textAlign:"left",background:isSelected?"#f0fdf4":"#fff",border:"1.5px solid "+(isSelected?ACCENTS[slotNum]:"#e2e8f0"),borderRadius:12,padding:"16px 18px",cursor:isDisabled?"default":"pointer",opacity:isDisabled?0.4:1,transition:"all .15s",position:"relative" }}>
                      {isSelected && <div style={{ position:"absolute",top:10,right:10,width:22,height:22,borderRadius:"50%",background:ACCENTS[slotNum],display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ color:"#fff",fontSize:11,fontWeight:700 }}>{slotNum+1}</span></div>}
                      <div style={{ fontSize:13,fontWeight:600,color:isSelected?"#166534":"#0f172a",lineHeight:1.4,marginBottom:6,paddingRight:isSelected?28:0 }}>{a.title}</div>
                      <div style={{ fontSize:11,color:"#94a3b8" }}>{a.date ? new Date(a.date).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : ""}</div>
                    </button>
                  );
                })}
              </div>
            )}
            {generated && (
              <div style={{ marginTop:16,background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:10,padding:"14px 18px",display:"flex",alignItems:"center",gap:10 }}>
                <CheckCircle size={16} color="#16a34a" />
                <span style={{ fontSize:13,fontWeight:600,color:"#166534" }}>All content generated and saved for your team! Switch to any tab to review and copy.</span>
              </div>
            )}
          </div>
        )}

        {tab === "linkedin" && (
          <div>
            {!generated && <div style={{ background:"#fefce8",border:"1.5px solid #fde68a",borderRadius:10,padding:"14px 18px",marginBottom:16,fontSize:13,color:"#92400e" }}>Select 4 articles and click Generate All to populate this tab.</div>}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
              {[0,1,2,3].map(i => {
                const a = selectedArts[i];
                const sum = summaries[i];
                const isCopied = copiedSummary === i;
                return (
                  <div key={i} style={pn}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <div style={{ width:20,height:20,borderRadius:"50%",background:ACCENTS[i],display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ color:"#fff",fontSize:10,fontWeight:700 }}>{i+1}</span></div>
                        <span style={{ fontSize:12,fontWeight:600,color:"#0f172a" }}>{a ? a.title.substring(0,50)+(a.title.length>50?"...":"") : "Story "+(i+1)}</span>
                      </div>
                      {verifieds[i] && <div style={{ display:"flex",alignItems:"center",gap:4 }}><CheckCircle size={11} color="#16a34a" /><span style={{ fontSize:10,color:"#16a34a",fontWeight:600 }}>Verified</span></div>}
                    </div>
                    <div style={{ background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"12px 14px",fontSize:13,lineHeight:1.85,color:"#1e293b",fontFamily:"ui-monospace,monospace",minHeight:180,maxHeight:260,overflowY:"auto",whiteSpace:"pre-wrap" }}>
                      {sum ? <>{sum.trim()}{"\n\n\u2014\u2014\u2014\n\nFind more here: "+articleLink}{sponsor && "\nToday's news presented by: "+(SPONSORS.find(x=>x.name===sponsor)||{}).name+" ("+(SPONSORS.find(x=>x.name===sponsor)||{}).url+")"}</> : <span style={{ color:"#cbd5e1" }}>Will appear after generation...</span>}
                    </div>
                    {sum && <button onClick={() => doCopy(getPost(i), () => { setCopiedSummary(i); setTimeout(() => setCopiedSummary(null), 2000); })} style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:6,width:"100%",marginTop:10,padding:"9px",fontSize:12,fontWeight:700,background:isCopied?"#16a34a":TEAL,color:"#fff",border:"none",borderRadius:7,cursor:"pointer" }}>{isCopied ? <><Check size={12} />Copied!</> : <><Clipboard size={12} />Copy post</>}</button>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "headlines" && (
          <div>
            {!generated && <div style={{ background:"#fefce8",border:"1.5px solid #fde68a",borderRadius:10,padding:"14px 18px",marginBottom:16,fontSize:13,color:"#92400e" }}>Select 4 articles and click Generate All to populate this tab.</div>}
            <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
              {[0,1,2,3].map(i => {
                const a = selectedArts[i];
                const results = hlResults[i] || [];
                const visuals = hlVisuals[i];
                return (
                  <div key={i} style={pn}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
                      <div style={{ width:20,height:20,borderRadius:"50%",background:ACCENTS[i],display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ color:"#fff",fontSize:10,fontWeight:700 }}>{i+1}</span></div>
                      <span style={{ fontSize:13,fontWeight:700,color:"#0f172a" }}>{a ? a.title : "Story "+(i+1)}</span>
                    </div>
                    {results.length > 0 ? (
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:visuals?14:0 }}>
                        {results.map((h,j) => {
                          const k = i*10+j; const isCopied = copiedHl === k;
                          return (
                            <div key={j} style={{ background:"#f8fafc",border:"1.5px solid #e2e8f0",borderLeft:"3px solid "+ACCENTS[i],borderRadius:8,padding:"12px 14px",display:"flex",flexDirection:"column",gap:8 }}>
                              <span style={{ fontSize:13,color:"#1e293b",lineHeight:1.4,flex:1 }}>{h}</span>
                              <button onClick={() => doCopy(h, () => { setCopiedHl(k); setTimeout(() => setCopiedHl(null), 2000); })} style={{ padding:"5px 12px",fontSize:11,fontWeight:700,background:isCopied?"#16a34a":"transparent",color:isCopied?"#fff":TEAL,border:"1.5px solid "+(isCopied?"#16a34a":"#b2e0e4"),borderRadius:5,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}>{isCopied?<><Check size={10}/>Copied</>:"Copy"}</button>
            </div>
                          );
                        })}
                      </div>
                    ) : <div style={{ color:"#cbd5e1",fontSize:13 }}>Will appear after generation...</div>}
                    {visuals && (
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10 }}>
                        {[{l:"Images",k:"images"},{l:"Icons",k:"icons"},{l:"Symbols",k:"symbols"}].map(g => (
                          <div key={g.k} style={{ background:"#f8fafc",border:"1.5px solid #e2e8f0",borderTop:"3px solid "+ACCENTS[i],borderRadius:8,padding:"10px 12px" }}>
                            <span style={{ fontSize:10,fontWeight:700,letterSpacing:"0.09em",color:ACCENTS[i],textTransform:"uppercase",display:"block",marginBottom:7 }}>{g.l}</span>
                            {(visuals[g.k]||[]).map((item,j) => (
                              <div key={j} style={{ display:"flex",alignItems:"flex-start",gap:6,marginBottom:5 }}>
                                <div style={{ width:4,height:4,borderRadius:"50%",background:ACCENTS[i],flexShrink:0,marginTop:5 }} />
                                <span style={{ fontSize:12,color:"#334155",lineHeight:1.5 }}>{item}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "jumpstart" && (
          <div style={pn}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <span style={sL}>Script</span>
              <span style={{ fontSize:11,fontWeight:600,color:TEAL,background:"#e0f5f7",borderRadius:5,padding:"2px 8px" }}>{dayName}, {dateStr}</span>
            </div>
            {!generated && <div style={{ background:"#fefce8",border:"1.5px solid #fde68a",borderRadius:10,padding:"14px 18px",marginBottom:16,fontSize:13,color:"#92400e" }}>Select 4 articles and click Generate All to populate this tab.</div>}
            <div style={{ background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"16px",fontSize:13,lineHeight:2,color:"#1e293b",fontFamily:"inherit",minHeight:400,maxHeight:640,overflowY:"auto",whiteSpace:"pre-wrap" }}>
              {jsScript || <span style={{ color:"#cbd5e1" }}>Your script will appear after generation...</span>}
            </div>
            {jsScript && (<><div style={dv} /><button onClick={() => doCopy(jsScript, () => { setJsCopied(true); setTimeout(() => setJsCopied(false), 2000); })} style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",padding:"11px",fontSize:13,fontWeight:700,background:jsCopied?"#16a34a":TEAL,color:"#fff",border:"none",borderRadius:8,cursor:"pointer" }}>{jsCopied?<><Check size={13}/>Copied!</>:<><Clipboard size={13}/>Copy script</>}</button></>)}
          </div>
        )}

        {tab === "caption" && (
          <div style={{ display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:16 }}>
            <div style={pn}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7 }}>
                <span style={sL}>Clip transcript</span>
                {transcript && <button onClick={() => { setTranscript(""); setContext(""); setCaptions([]); }} style={{ background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:3,fontFamily:"inherit",fontWeight:700 }}><X size={11}/>Clear</button>}
              </div>
              <textarea value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder="Paste your clip transcript here..." style={{ ...inp,height:180,resize:"none" }} />
              <div style={dv}/>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7 }}><span style={sL}>Article context</span><span style={{ fontSize:10,fontWeight:600,color:"#cbd5e1" }}>Optional</span></div>
              <textarea value={context} onChange={e=>setContext(e.target.value)} placeholder="Paste the related article..." style={{ ...inp,height:100,resize:"none" }} />
              <button onClick={generateCaptions} disabled={!transcript.trim()||capLoading} style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",marginTop:14,padding:"11px",fontSize:13,fontWeight:700,background:TEAL,color:"#fff",border:"none",borderRadius:8,cursor:(!transcript.trim()||capLoading)?"default":"pointer",opacity:(!transcript.trim()||capLoading)?0.4:1 }}>
                {capLoading?<><Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>Generating...</>:"Generate captions"}
              </button>
            </div>
            <div style={pn}>
              <span style={sL}>Captions</span>
              {captions.length > 0 ? (
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {captions.map((c,i) => {
                    const isCopied = capCopied === i;
                    return <div key={i} style={{ background:"#f8fafc",border:"1.5px solid #e2e8f0",borderLeft:"3px solid "+ACCENTS[i%3],borderRadius:8,padding:"13px 14px",display:"flex",gap:12,alignItems:"flex-start" }}><span style={{ flex:1,fontSize:13,color:"#1e293b",lineHeight:1.75,whiteSpace:"pre-wrap" }}>{c}</span><button onClick={() => doCopy(c, () => { setCapCopied(i); setTimeout(() => setCapCopied(null), 2000); })} style={{ flexShrink:0,padding:"5px 12px",fontSize:11,fontWeight:700,background:isCopied?"#16a34a":"transparent",color:isCopied?"#fff":TEAL,border:"1.5px solid "+(isCopied?"#16a34a":"#b2e0e4"),borderRadius:6,cursor:"pointer" }}>{isCopied?<><Check size={11}/>Copied</>:"Copy"}</button></div>;
                  })}
                </div>
              ) : <div style={{ background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"14px 16px",minHeight:200,fontSize:13,color:"#cbd5e1",fontFamily:"monospace" }}>Your captions will appear here...</div>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}