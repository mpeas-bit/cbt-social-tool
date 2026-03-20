import { useState } from "react";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const pass = e.target.pass.value;
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pass }),
      });
      if (r.ok) { window.location.replace("/"); }
      else {
        const d = await r.json().catch(() => ({}));
        setError("Incorrect passcode." + (d.expectedLength !== undefined ? " Expected length: " + d.expectedLength : ""));
      }
    } catch(err) { setError("Error: " + err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"40px 36px",width:320,boxSizing:"border-box" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:28 }}>
          <div style={{ width:28,height:28,background:"#05828E",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <span style={{ fontSize:14,fontWeight:700,color:"#0f172a" }}>CBT Social Tool</span>
        </div>
        <form onSubmit={submit}>
          <label style={{ fontSize:10,fontWeight:700,letterSpacing:"0.09em",color:"#94a3b8",textTransform:"uppercase",display:"block",marginBottom:7 }}>Passcode</label>
          <input name="pass" type="password" placeholder="Enter passcode..." autoFocus
            style={{ width:"100%",boxSizing:"border-box",padding:"9px 12px",fontSize:13,border:"1.5px solid #e2e8f0",borderRadius:8,background:"#fff",color:"#0f172a",outline:"none",marginBottom:8 }} />
          {error && <p style={{ color:"#ef4444",fontSize:12,margin:"0 0 10px" }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ width:"100%",padding:"11px",fontSize:13,fontWeight:700,background:"#05828E",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",opacity:loading?0.6:1 }}>
            {loading ? "Checking..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}