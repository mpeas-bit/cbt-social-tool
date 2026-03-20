import { useState } from "react";
import { Loader2, CheckCircle, X, Check, Clipboard, FileText, Type, Video, ChevronDown } from "lucide-react";

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
const ACCENTS = [TEAL, "#7c3aed", "#16a34a"];

export default function App() {
  const [tab, setTab] = useState("summarizer");
  const [article, setArticle] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [sponsor, setSponsor] = useState("");
  const [copied, setCopied] = useState(false);
  const [headline, setHeadline] = useState("");
  const [hlResults, setHlResults] = useState([]);
  const [hlVisuals, setHlVisuals] = useState(null);
  const [hlLoading, setHlLoading] = useState(false);
  const [hlCopied, setHlCopied] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [context, setContext] = useState("");
  const [captions, setCaptions] = useState([]);
  const [capLoading, setCapLoading] = useState(false);
  const [capCopied, setCapCopied] = useState(null);
  const [jsArticles, setJsArticles] = useState(["", "", "", ""]);
  const [jsScript, setJsScript] = useState("");
  const [jsLoading, setJsLoading] = useState(false);
  const [jsCopied, setJsCopied] = useState(false);
  const [rssArticles, setRssArticles] = useState([]);
  const [rssLoading, setRssLoading] = useState(false);
  const [rssError, setRssError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(0);

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const doCopy = (text, cb) => {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(cb).catch(() => fbCopy(text, cb));
    else fbCopy(text, cb);
  };
  const fbCopy = (text, cb) => {
    const t = document.createElement("textarea");
    t.value = text; t.style.cssText = "position:fixed;left:-9999px";
    document.body.appendChild(t); t.select(); document.execCommand("copy");
    document.body.removeChild(t); cb();
  };

  const callAPI = async (messages) => {
    const r = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages }) });
    const d = await r.json();
    return d.content.filter(b => b.type === "text").map(b => b.text).join("");
  };

  const fetchRSS = async () => {
    setRssLoading(true); setRssError(""); setRssArticles([]);
    try { const r = await fetch("/api/rss"); const d = await r.json(); if (d.status !== "ok") throw new Error(d.message); setRssArticles(d.articles); }
    catch (e) { setRssError("Could not load articles: " + e.message); }
    finally { setRssLoading(false); }
  };

  const addToSlot = (a) => {
    const arr = [...jsArticles];
    arr[selectedSlot] = a.title + "\n\n" + (a.content || a.description);
    setJsArticles(arr);
    setSelectedSlot(prev => Math.min(prev + 1, 3));
  };

  const summarize = async () => {
    if (!article.trim()) return;
    setLoading(true); setSummary(""); setVerified(false);
    try {
      const txt = await callAPI([{ role: "user", content: "Summarize this article into a LinkedIn post.\n\nFormat:\n[Headline]\n\n[1 supporting sentence]\n\nKey details:\n- [point]\n- [point]\n- [point]\n\nRules: no bold/markdown/hashtags/emojis/em-dashes, use - for bullets, under 100 words, blank lines between sections. Write ONLY VERIFIED on its own line after if accurate.\n\nArticle:\n" + article }]);
      if (txt.includes("VERIFIED")) { setVerified(true); setSummary(txt.replace(/VERIFIED.*$/m, "").trim()); } else setSummary(txt);
    } catch { setSummary("Error generating summary."); }
    finally { setLoading(false); }
  };

  const getPost = () => {
    let s = summary.replace(/\*\*/g, "").trim();
    s += "\n\n\u2014\u2014\u2014\n\nFind more here: " + articleLink;
    if (sponsor) { const sp = SPONSORS.find(x => x.name === sponsor); s += "\nToday's news presented by: " + sp.name + " (" + sp.url + ")"; }
    return s;
  };

  const shortenHeadline = async () => {
    if (!headline.trim()) return;
    setHlLoading(true); setHlResults([]); setHlVisuals(null);
    try {
      const txt = await callAPI([{ role: "user", content: "Shorten this headline into 3 short variations. Return ONLY JSON: {headlines:[s,s,s],visuals:{images:[s,s],icons:[s,s],symbols:[s,s]}}. Headline: " + headline }]);
      const p = JSON.parse(txt.replace(/```json|```/g, "").trim());
      setHlResults(p.headlines || []); setHlVisuals(p.visuals || null);
    } catch { setHlResults(["Error."]); }
    finally { setHlLoading(false); }
  };

  const generateCaptions = async () => {
    if (!transcript.trim()) return;
    setCapLoading(true); setCaptions([]);
    try {
      const txt = await callAPI([{ role: "user", content: "Write 3 punchy 1-3 sentence social captions. No emojis/hashtags/em-dashes. End each with blank line then: [Watch the full episode at the link in our bio]. Separate sentences with blank lines. Return ONLY JSON array of 3 strings.\n\nTranscript:\n" + transcript + (context.trim() ? "\n\nContext:\n" + context : "") }]);
      setCaptions(JSON.parse(txt.replace(/```json|```/g, "").trim()));
    } catch { setCaptions(["Error."]); }
    finally { setCapLoading(false); }
  };

  const generateScript = async () => {
    if (jsArticles.some(a => !a.trim())) return;
    setJsLoading(true); setJsScript("");
    try {
      const txt = await callAPI([{ role: "user", content: "Write a 2-2.5 min CBT News Jumpstart broadcast script. Today: " + dayName + ", " + dateStr + ". Format: greeting intro, STORY 1-4 (ALL CAPS headlines, 3-5 sentences each), outro. Natural tone.\n\nARTICLE 1:\n" + jsArticles[0] + "\n\nARTICLE 2:\n" + jsArticles[1] + "\n\nARTICLE 3:\n" + jsArticles[2] + "\n\nARTICLE 4:\n" + jsArticles[3] }]);
      setJsScript(txt.trim());
    } catch { setJsScript("Error."); }
    finally { setJsLoading(false); }
  };

  const tabs = [{ id:"summarizer",label:"Article Summarizer",icon:FileText },{ id:"shortener",label:"Headline Shortener",icon:Type },{ id:"caption",label:"Clip Caption Maker",icon:Video },{ id:"jumpstart",label:"Jumpstart Script",icon:Clipboard }];
  const inp = { width:"100%",boxSizing:"border-box",padding:"9px 12px",fontSize:13,fontFamily:"inherit",border:"1.5px solid #e2e8f0",borderRadius:8,background:"#fff",color:"#0f172a",outline:"none",lineHeight:1.6 };
  const sL = { fontSize:10,fontWeight:700,letterSpacing:"0.09em",color:"#94a3b8",textTransform:"uppercase",display:"block",marginBottom:7 };
  const dv = { borderTop:"1px solid #f1f5f9",margin:"16px 0" };
  const pn = { background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"22px",boxSizing:"border-box" };

  return (
    <div style={{ background:"#f8fafc",minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif",paddingBottom:48 }}>
      <style>{"@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}"}</style>
      <div style={{ background:"#fff",borderBottom:"1.5px solid #e2e8f0",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",height:54 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:28,height:28,background:TEAL,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center" }}><FileText size={14} color="#fff" /></div>
          <span style={{ fontSize:14,fontWeight:700,color:"#0f172a" }}>LinkedIn Article Summarizer</span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:5 }}>
          <div style={{ width:6,height:6,borderRadius:"50%",background:"#22c55e" }} />
          <span style={{ fontSize:11,color:"#22c55e",fontWeight:700 }}>Live</span>
        </div>
      </div>
      <div style={{ background:"#fff",borderBottom:"1.5px solid #e2e8f0",padding:"0 28px",display:"flex" }}>
        {tabs.map(({ id, label, icon: Icon }) => (<button key={id} onClick={() => setTab(id)} style={{ display:"flex",alignItems:"center",gap:7,padding:"13px 18px",fontSize:12,fontWeight:tab===id?700:500,color:tab===id?TEAL:"#94a3b8",border:"none",background:"transparent",borderBottom:tab===id?"2px solid "+TEAL:"2px solid transparent",cursor:"pointer",marginBottom:-1.5 }}><Icon size={13} />{label}</button>))}
      </div>
      <div style={{ padding:"24px 28px 0" }}>
        {tab === "summarizer" && (
          <div style={{ display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:16 }}>
            <div style={pn}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7 }}>
                <span style={sL}>Article text</span>
                {article && <button onClick={() => { setArticle(""); setSummary(""); setVerified(false); setSponsor(""); }} style={{ background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:3,fontFamily:"inherit",fontWeight:700 }}><X size={11} />Clear</button>}
              </div>
              <textarea value={article} onChange={e => setArticle(e.target.value)} placeholder="Paste article copy here..." style={{ ...inp,height:200,resize:"none" }} />
              <div style={dv} />
              <span style={sL}>Sponsor</span>
              <div style={{ position:"relative" }}>
                <select value={sponsor} onChange={e => setSponsor(e.target.value)} style={{ ...inp,appearance:"none",paddingRight:32,cursor:"pointer" }}>
                  <option value="">No sponsor</option>
                  {SPONSORS.map((sp, i) => <option key={i} value={sp.name}>{sp.name}</option>)}
                </select>
                <ChevronDown size={13} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",color:"#94a3b8",pointerEvents:"none" }} />
              </div>
              <button onClick={summarize} disabled={!article.trim()||loading} style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",marginTop:14,padding:"11px",fontSize:13,fontWeight:700,background:TEAL,color:"#fff",border:"none",borderRadius:8,cursor:(!article.trim()||loading)?"default":"pointer",opacity:(!article.trim()||loading)?0.4:1 }}>
                {loading ? <><Loader2 size={13} style={{animation:"spin 1s linear infinite"}} />Generating...</> : "Generate post"}
              </button>
            </div>
            <div style={pn}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7 }}>
                <span style={sL}>Preview</span>
                <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <CheckCircle size={12} color={verified?"#16a34a":"#cbd5e1"} />
                  <span style={{ fontSize:11,fontWeight:700,color:verified?"#16a34a":"#cbd5e1" }}>{verified?"Verified":"Unverified"}</span>
                </div>
              </div>
              <div style={{ background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"14px 16px",fontSize:13,lineHeight:1.85,color:"#1e293b",fontFamily:"ui-monospace,monospace",minHeight:200,maxHeight:320,overflowY:"auto",whiteSpace:"pre-wrap" }}>
                {summary ? <>{summary.trim()}{"\n\n\u2014\u2014\u2014\n\n"}{"Find more here: "+articleLink}{sponsor&&"\nToday's news presented by: "+(SPONSORS.find(x=>x.name===sponsor)||{}).name+" ("+(SPONSORS.find(x=>x.name===sponsor)||{}).url+")"}</> : <span style={{color:"#cbd5e1"}}>Your post will appear here...</span>}
              </div>
              {summary && (<><div style={dv} /><div style={{ display:"flex",gap:8 }}><button onClick={()=>{setSummary("");setVerified(false);}} style={{ flexShrink:0,display:"flex",alignItems:"center",gap:5,padding:"9px 14px",fontSize:12,fontWeight:700,background:"transparent",color:"#94a3b8",border:"1.5px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontFamily:"inherit" }}><X size={12} />Discard</button><button onClick={()=>doCopy(getPost(),()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);})} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"9px",fontSize:12,fontWeight:700,background:copied?"#16a34a":TEAL,color:"#fff",border:"none",borderRadius:8,cursor:"pointer" }}>{copied?<><Check size={13} />Copied!</>:<><Clipboard size={13} />Copy post</>}</button></div></>)}
            </div>
          </div>
        )}
        {tab === "shortener" && (
          <div style={pn}>
            <span style={sL}>Headline</span>
            <div style={{ display:"flex",gap:10 }}>
              <input value={headline} onChange={e=>setHeadline(e.target.value)} onKeyDown={e=>e.key==="Enter"&&shortenHeadline()} placeholder="Paste a headline..." style={{ ...inp,flex:1 }} />
              <button onClick={shortenHeadline} disabled={!headline.trim()||hlLoading} style={{ flexShrink:0,display:"flex",alignItems:"center",gap:6,padding:"9px 18px",fontSize:12,fontWeight:700,background:TEAL,color:"#fff",border:"none",borderRadius:8,cursor:"pointer",opacity:(!headline.trim()||hlLoading)?0.4:1 }}>
                {hlLoading?<><Loader2 size={13} style={{animation:"spin 1s linear infinite"}} />Working...</>:"Shorten"}
              </button>
            </div>
            {hlResults.length>0&&(<><div style={dv}/><span style={sL}>Variations</span><div style={{display:"flex",flexDirection:"column",gap:8}}>{hlResults.map((h,i)=>(<div key={i} style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderLeft:"3px solid "+ACCENTS[i%3],borderRadius:8,padding:"13px 14px",display:"flex",gap:12,alignItems:"center"}}><span style={{flex:1,fontSize:13,color:"#1e293b"}}>{h}</span><button onClick={()=>doCopy(h,()=>{setHlCopied(i);setTimeout(()=>setHlCopied(null),2000);})} style={{padding:"5px 12px",fontSize:11,fontWeight:700,background:hlCopied===i?"#16a34a":"transparent",color:hlCopied===i?"#fff":TEAL,border:"1.5px solid "+(hlCopied===i?"#16a34a":"#b2e0e4"),borderRadius:6,cursor:"pointer"}}>{hlCopied===i?"Copied":"Copy"}</button></div>))}</div></>)}
            {hlVisuals&&(<><div style={dv}/><span style={sL}>Graphic direction</span><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>{[{l:"Images",k:"images",c:TEAL},{l:"Icons",k:"icons",c:"#7c3aed"},{l:"Symbols",k:"symbols",c:"#16a34a"}].map(g=>(<div key={g.k} style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderTop:"3px solid "+g.c,borderRadius:8,padding:"12px 14px"}}><span style={{fontSize:10,fontWeight:700,color:g.c,textTransform:"uppercase",display:"block",marginBottom:8}}>{g.l}</span>{(hlVisuals[g.k]||[]).map((item,i)=>(<div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,marginBottom:6}}><div style={{width:5,height:5,borderRadius:"50%",background:g.c,flexShrink:0,marginTop:5}}/><span style={{fontSize:12,color:"#334155"}}>{item}</span></div>))}</div>))}</div></>)}
          </div>
        )}
        {tab === "caption" && (
          <div style={{ display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:16 }}>
            <div style={pn}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7 }}><span style={sL}>Clip transcript</span>{transcript&&<button onClick={()=>{setTranscript("");setContext("");setCaptions([]);}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:3,fontFamily:"inherit",fontWeight:700}}><X size={11}/>Clear</button>}</div>
              <textarea value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder="Paste transcript..." style={{...inp,height:180,resize:"none"}}/>
              <div style={dv}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}><span style={sL}>Article context</span><span style={{fontSize:10,fontWeight:600,color:"#cbd5e1"}}>Optional</span></div>
              <textarea value={context} onChange={e=>setContext(e.target.value)} placeholder="Paste related article..." style={{...inp,height:100,resize:"none"}}/>
              <button onClick={generateCaptions} disabled={!transcript.trim()||capLoading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",marginTop:14,padding:"11px",fontSize:13,fontWeight:700,background:TEAL,color:"#fff",border:"none",borderRadius:8,cursor:(!transcript.trim()||capLoading)?"default":"pointer",opacity:(!transcript.trim()||capLoading)?0.4:1}}>
                {capLoading?<><Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>Generating...</>:"Generate captions"}
              </button>
            </div>
            <div style={pn}>
              <span style={sL}>Captions</span>
              {captions.length>0?<div style={{display:"flex",flexDirection:"column",gap:10}}>{captions.map((c,i)=>(<div key={i} style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderLeft:"3px solid "+ACCENTS[i%3],borderRadius:8,padding:"13px 14px",display:"flex",gap:12,alignItems:"flex-start"}}><span style={{flex:1,fontSize:13,color:"#1e293b",lineHeight:1.75,whiteSpace:"pre-wrap"}}>{c}</span><button onClick={()=>doCopy(c,()=>{setCapCopied(i);setTimeout(()=>setCapCopied(null),2000);})} style={{flexShrink:0,padding:"5px 12px",fontSize:11,fontWeight:700,background:capCopied===i?"#16a34a":"transparent",color:capCopied===i?"#fff":TEAL,border:"1.5px solid "+(capCopied===i?"#16a34a":"#b2e0e4"),borderRadius:6,cursor:"pointer"}}>{capCopied===i?"Copied":"Copy"}</button></div>))}</div>:<div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"14px 16px",minHeight:200,fontSize:13,color:"#cbd5e1",fontFamily:"monospace"}}>Your captions will appear here...</div>}
            </div>
          </div>
        )}
        {tab === "jumpstart" && (
          <div style={{ display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1.3fr)",gap:16 }}>
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              <div style={pn}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={sL}>CBT News feed</span>
                  <button onClick={fetchRSS} disabled={rssLoading} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",fontSize:11,fontWeight:700,background:TEAL,color:"#fff",border:"none",borderRadius:6,cursor:"pointer",opacity:rssLoading?0.5:1}}>
                    {rssLoading?<><Loader2 size={11} style={{animation:"spin 1s linear infinite"}}/>Loading...</>:rssArticles.length?"Refresh":"Load Articles"}
                  </button>
                </div>
                {rssError&&<p style={{fontSize:12,color:"#ef4444",margin:"0 0 8px"}}>{rssError}</p>}
                {rssArticles.length>0&&(<>
                  <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                    {[0,1,2,3].map(i=>(<button key={i} onClick={()=>setSelectedSlot(i)} style={{padding:"4px 10px",fontSize:11,fontWeight:700,borderRadius:5,border:"1.5px solid "+(selectedSlot===i?ACCENTS[i===3?2:i%3]:"#e2e8f0"),background:selectedSlot===i?ACCENTS[i===3?2:i%3]:"#fff",color:selectedSlot===i?"#fff":"#94a3b8",cursor:"pointer"}}>{jsArticles[i].trim()?"\u2713 Story "+(i+1):"Story "+(i+1)}</button>))}
                  </div>
                  <p style={{fontSize:11,color:"#94a3b8",margin:"0 0 8px"}}>Click an article to add it to the selected story slot</p>
                  <div style={{maxHeight:260,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
                    {rssArticles.map((a,i)=>(<button key={i} onClick={()=>addToSlot(a)} style={{textAlign:"left",background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:7,padding:"10px 12px",cursor:"pointer",width:"100%"}}><div style={{fontSize:12,fontWeight:700,color:"#0f172a",marginBottom:3,lineHeight:1.4}}>{a.title}</div><div style={{fontSize:11,color:"#94a3b8"}}>{a.date?new Date(a.date).toLocaleDateString("en-US",{month:"short",day:"numeric"}):""}</div></button>))}
                  </div>
                </>)}
                {!rssArticles.length&&!rssError&&!rssLoading&&<p style={{fontSize:12,color:"#cbd5e1",margin:0}}>Load the CBT News feed to pick articles, or paste manually below.</p>}
              </div>
              <div style={pn}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <span style={sL}>Story slots</span>
                  <span style={{fontSize:11,fontWeight:600,color:TEAL,background:"#e0f5f7",borderRadius:5,padding:"2px 8px"}}>{dayName+", "+dateStr}</span>
                </div>
                {[0,1,2,3].map(i=>(<div key={i} style={{marginBottom:i<3?12:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.09em",color:ACCENTS[i===3?2:i%3],textTransform:"uppercase"}}>{"Story "+(i+1)}</div>
                    {jsArticles[i]&&<button onClick={()=>{const a=[...jsArticles];a[i]="";setJsArticles(a);}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:2,fontFamily:"inherit",fontWeight:700}}><X size={10}/>Clear</button>}
                  </div>
                  <textarea value={jsArticles[i]} onChange={e=>{const a=[...jsArticles];a[i]=e.target.value;setJsArticles(a);}} placeholder={"Paste article "+(i+1)+" or select from feed above..."} style={{...inp,height:80,resize:"none"}}/>
                </div>))}
                <button onClick={generateScript} disabled={jsArticles.some(a=>!a.trim())||jsLoading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",marginTop:14,padding:"11px",fontSize:13,fontWeight:700,background:TEAL,color:"#fff",border:"none",borderRadius:8,cursor:(jsArticles.some(a=>!a.trim())||jsLoading)?"default":"pointer",opacity:(jsArticles.some(a=>!a.trim())||jsLoading)?0.4:1}}>
                  {jsLoading?<><Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>Generating script...</>:"Generate Jumpstart Script"}
                </button>
              </div>
            </div>
            <div style={pn}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                <span style={sL}>Script</span>
                {jsScript&&<button onClick={()=>setJsScript("")} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:3,fontFamily:"inherit",fontWeight:700}}><X size={11}/>Clear</button>}
              </div>
              <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"16px",fontSize:13,lineHeight:2,color:"#1e293b",fontFamily:"inherit",minHeight:400,maxHeight:620,overflowY:"auto",whiteSpace:"pre-wrap"}}>
                {jsScript||<span style={{color:"#cbd5e1"}}>Your script will appear here...</span>}
              </div>
              {jsScript&&(<><div style={dv}/><button onClick={()=>doCopy(jsScript,()=>{setJsCopied(true);setTimeout(()=>setJsCopied(false),2000);})} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",padding:"11px",fontSize:13,fontWeight:700,background:jsCopied?"#16a34a":TEAL,color:"#fff",border:"none",borderRadius:8,cursor:"pointer"}}>{jsCopied?<><Check size={13}/>Copied!</>:<><Clipboard size={13}/>Copy script</>}</button></>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}