import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

const GFONTS = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap');`;

// Screenshot-matched palette: deep navy → royal blue → electric blue
const C = {
  // Primary blues (electric / royal)
  p1:"#4B6FFF", p2:"#2C4FE8", p3:"#1B2BB8", pL:"rgba(75,111,255,0.15)", pM:"#89A4FF",
  // Success green (kept readable on dark)
  g1:"#00C48C", g2:"#00A374", gL:"rgba(0,196,140,0.15)",
  // Amber/yellow — like the "Save 40%" badge in screenshot
  o1:"#F5C518", o2:"#D4A800", oL:"rgba(245,197,24,0.18)",
  // Red / danger
  r1:"#FF5B5B", r2:"#E03E3E", rL:"rgba(255,91,91,0.15)",
  // Cyan accent (secondary highlight)
  b1:"#38BDF8", b2:"#0EA5E9", bL:"rgba(56,189,248,0.15)",
  // Lighter electric blue (accent, like selected card border in screenshot)
  pk1:"#7B9FFF", pk2:"#5C7FEF", pkL:"rgba(123,159,255,0.15)",
  // Backgrounds — deep navy as in screenshot
  bg:"#070B1A",   // near-black navy (darkest, app bg)
  bg2:"#0C1228",  // slightly lighter navy (header/nav)
  bg3:"#111A38",  // card-input fields
  // Cards — semi-transparent frosted blue-navy
  card:"rgba(255,255,255,0.055)",
  card2:"rgba(255,255,255,0.085)",
  // Text
  txt:"#F0F4FF",
  txt2:"#89A4FF",  // muted blue-white
  txt3:"#4B6FFF",
  // Border — subtle blue glow like screenshot cards
  border:"rgba(75,111,255,0.28)",
  wa:"#25D366",
};

const INR = n => "₹" + Number(n).toLocaleString("en-IN");

const MOCK_CUSTOMERS = [
  {customer_id:"C001",business_name:"Gupta General Store",owner_name:"Ramesh Gupta",phone:"9876543210",city:"Lucknow",category:"Kirana",balance:7500,gstin:"09AABCU9603R1ZX"},
  {customer_id:"C002",business_name:"Sharma Electronics",owner_name:"Priya Sharma",phone:"9988776655",city:"Lucknow",category:"Electronics",balance:15200,gstin:""},
  {customer_id:"C003",business_name:"Verma Textiles",owner_name:"Suresh Verma",phone:"9112233445",city:"Kanpur",category:"Textiles",balance:3200,gstin:"09AABCU9603R2ZX"},
  {customer_id:"C004",business_name:"Singh Dairy Farm",owner_name:"Harpreet Singh",phone:"9765432109",city:"Lucknow",category:"Dairy",balance:0,gstin:""},
];
const MOCK_INVOICES = [
  {invoice_id:"INV-001",customer_id:"C001",customer_name:"Gupta General Store",date:"2026-03-15",total_amount:12500,paid:5000,status:"Partial",notes:"Seasonal stock"},
  {invoice_id:"INV-002",customer_id:"C002",customer_name:"Sharma Electronics",date:"2026-03-10",total_amount:15200,paid:0,status:"Unpaid",notes:""},
  {invoice_id:"INV-003",customer_id:"C003",customer_name:"Verma Textiles",date:"2026-03-08",total_amount:8400,paid:8400,status:"Paid",notes:"March order"},
  {invoice_id:"INV-004",customer_id:"C001",customer_name:"Gupta General Store",date:"2026-03-01",total_amount:5000,paid:5000,status:"Paid",notes:""},
];
const TOP_ITEMS = [
  {name:"Basmati Rice 5kg",sales:340,revenue:85000,trend:"+12%",category:"Grocery"},
  {name:"Toor Dal 1kg",sales:280,revenue:36400,trend:"+8%",category:"Dal"},
  {name:"Mustard Oil 1L",sales:220,revenue:26400,trend:"+5%",category:"Oil"},
  {name:"Sugar 1kg",sales:195,revenue:15600,trend:"-2%",category:"Grocery"},
  {name:"Tea Masala 100g",sales:175,revenue:17500,trend:"+15%",category:"Spice"},
];
const SIMILAR_ITEMS = [
  {name:"Sona Masoori Rice",sales:210,gap:"Similar to Basmati",potential:"+₹42K"},
  {name:"Moong Dal",sales:190,gap:"Similar to Toor Dal",potential:"+₹24K"},
  {name:"Sunflower Oil",sales:155,gap:"Alt to Mustard Oil",potential:"+₹18K"},
];

function Avatar({name,size=38}){
  const ini=(name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  const cols=[C.p1,C.g1,C.o1,C.pk1];
  const idx=(name?.charCodeAt(0)||0)%cols.length;
  return <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${cols[idx]},${cols[(idx+1)%cols.length]})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:size*0.35,flexShrink:0}}>{ini}</div>;
}

function Badge({status}){
  const m={Paid:{bg:C.gL,c:C.g2},Unpaid:{bg:C.rL,c:C.r2},Partial:{bg:C.oL,c:C.o2}};
  const s=m[status]||m.Partial;
  return <span style={{background:s.bg,color:s.c,fontSize:10,fontWeight:700,borderRadius:20,padding:"2px 10px"}}>{status}</span>;
}

function GlowCard({children,style={}}){
  return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px",position:"relative",overflow:"hidden",...style}}>
    <div style={{position:"absolute",top:-30,right:-30,width:80,height:80,borderRadius:"50%",background:`radial-gradient(circle,rgba(75,111,255,0.18) 0%,transparent 70%)`}}/>
    {children}
  </div>;
}

function MetricCard({label,labelHi,value,sub,color,icon,onClick}){
  return <div onClick={onClick} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 14px",minWidth:0,cursor:onClick?"pointer":"default",transition:"transform 0.2s, background 0.2s"}}
      onMouseEnter={e=>onClick&&(e.currentTarget.style.background=C.card2)}
      onMouseLeave={e=>onClick&&(e.currentTarget.style.background=C.card)}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
      <div style={{fontSize:10,color:C.txt2,fontWeight:500,lineHeight:1.3}}><div>{label}</div><div style={{fontSize:9,opacity:0.7}}>{labelHi}</div></div>
      <span style={{fontSize:18}}>{icon}</span>
    </div>
    <div style={{fontSize:20,fontWeight:800,color:color||C.txt,fontFamily:"Poppins"}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:"#5B7AB8",marginTop:2}}>{sub}</div>}
  </div>;
}

// ─── DASHBOARD ───────────────────────────────────────────
function Dashboard({customers,invoices,account,onNav}){

  const totalDue=invoices.reduce((s,i)=>s+(i.total_amount-i.paid),0);
  const totalSales=invoices.reduce((s,i)=>s+i.total_amount,0);
  const collected=invoices.reduce((s,i)=>s+i.paid,0);
  const activeC=customers.length;

  const monthly=[
    {m:"Oct",s:62000},{m:"Nov",s:82000},{m:"Dec",s:95000},{m:"Jan",s:71000},{m:"Feb",s:88000},{m:"Mar",s:64000}
  ];
  const maxS=Math.max(...monthly.map(d=>d.s));

  const whatsappMsg=`नमस्ते! मैं ${account.name} हूँ, ${account.business} से। आपका बकाया ₹${totalDue.toLocaleString("en-IN")} है। कृपया जल्दी भुगतान करें। धन्यवाद।`;
  const waUrl=`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`;

  const expenseBreak=[
    {cat:"Stock / माल",pct:55,amt:35200,color:C.p1},
    {cat:"Rent / किराया",pct:20,amt:12800,color:C.b1},
    {cat:"Labour / मजदूरी",pct:15,amt:9600,color:C.pk1},
    {cat:"Misc / अन्य",pct:10,amt:6400,color:C.o1},
  ];

  return <div style={{paddingBottom:20}}>
    {/* Hero Banner */}
    <div style={{background:`linear-gradient(145deg,#0C1228 0%,#1B2BB8 45%,#4B6FFF 100%)`,borderRadius:20,padding:"20px",marginBottom:16,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",right:-30,top:-30,width:130,height:130,borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>
      <div style={{position:"absolute",right:30,bottom:-40,width:90,height:90,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",marginBottom:2}}>
            {account.business||"Aapka Business"} • {account.city||"Lucknow"}
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:8}}>कुल बकाया / Total Outstanding</div>
          <div style={{fontSize:34,fontWeight:900,color:"#fff",fontFamily:"Poppins",letterSpacing:-1}}>{INR(totalDue)}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.65)",marginTop:4}}>March 20, 2026</div>
        </div>
        <a href="https://vyapai.in/" target="_blank" rel="noreferrer" style={{background:"rgba(255,255,255,0.18)",borderRadius:10,padding:"6px 10px",display:"flex",flexDirection:"column",alignItems:"center",textDecoration:"none"}}>
          <span style={{fontSize:16}}>🌐</span>
          <span style={{fontSize:8,color:"#fff",marginTop:2,fontWeight:600}}>vyapai.in</span>
        </a>
      </div>
      <div style={{display:"flex",gap:10,marginTop:14}}>
        <a href={waUrl} target="_blank" rel="noreferrer" style={{flex:1,background:C.wa,borderRadius:10,padding:"9px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,textDecoration:"none"}}>
          <span style={{fontSize:16}}>💬</span>
          <div>
            <div style={{color:"#fff",fontWeight:700,fontSize:12,fontFamily:"Poppins"}}>WhatsApp</div>
            <div style={{color:"rgba(255,255,255,0.8)",fontSize:9}}>भेजें / Send Reminder</div>
          </div>
        </a>
        <div onClick={() => onNav("reports")} style={{flex:1,background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"9px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer"}}>
          <span style={{fontSize:16}}>📊</span>
          <div>
            <div style={{color:"#fff",fontWeight:700,fontSize:12}}>Collection</div>
            <div style={{color:"rgba(255,255,255,0.8)",fontSize:9}}>{INR(collected)} collected</div>
          </div>
        </div>
      </div>
    </div>

    {/* Metric Grid */}
    <GlowCard style={{marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:14,color:C.txt,marginBottom:12,fontFamily:"Poppins"}}>🚩 Aaj ka Day-Book / Today's Ledger</div>
      {invoices.filter(i => i.date === new Date().toISOString().split('T')[0]).length === 0 ? 
        <div style={{fontSize:11,color:C.txt2,textAlign:"center",padding:10}}>Aaj koi transactions nahi hain.</div> :
        invoices.filter(i => i.date === new Date().toISOString().split('T')[0]).map(i => (
          <div key={i.invoice_id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:12,color:C.txt}}>{i.customer_name}</div>
            <div style={{fontSize:12,fontWeight:700,color:C.g1}}>{INR(i.paid)}</div>
          </div>
        ))
      }
    </GlowCard>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
      <MetricCard label="Customers" labelHi="ग्राहक" value={activeC} sub="Active" color={C.pM} icon="👥" onClick={() => onNav("customers")}/>
      <MetricCard label="Unpaid" labelHi="बकाया" value={invoices.filter(i=>i.status==="Unpaid").length} sub="Invoices" color={C.r1} icon="🧾" onClick={() => onNav("invoices")}/>
      <MetricCard label="Total Sales" labelHi="कुल बिक्री" value={INR(totalSales)} sub="This month" color={C.g1} icon="📈" onClick={() => onNav("reports")}/>
      <MetricCard label="Partial" labelHi="आंशिक" value={invoices.filter(i=>i.status==="Partial").length} sub="Invoices" color={C.o1} icon="⏳" onClick={() => onNav("invoices")}/>
    </div>


    {/* Infographic: Sales vs Collection */}
    <GlowCard style={{marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:13,color:C.txt,marginBottom:12,fontFamily:"Poppins"}}>
        Sales vs Collection <span style={{fontSize:10,color:C.txt2,fontWeight:400}}>/ बिक्री बनाम संग्रह</span>
      </div>
      <div style={{display:"flex",gap:4,height:90,alignItems:"flex-end",marginBottom:8}}>
        {monthly.map((d,i)=>(
          <div key={d.m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <div style={{width:"100%",background:i===5?`linear-gradient(180deg,#4B6FFF,#89A4FF)`:`rgba(75,111,255,0.25)`,borderRadius:"4px 4px 0 0",height:`${(d.s/maxS)*78}px`,transition:"height 0.4s",position:"relative"}}>
              {i===5&&<div style={{position:"absolute",top:-18,left:"50%",transform:"translateX(-50%)",background:"#4B6FFF",color:"#fff",fontSize:8,borderRadius:4,padding:"1px 4px",whiteSpace:"nowrap"}}>Latest</div>}
            </div>
            <div style={{fontSize:9,color:C.txt2}}>{d.m}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:`linear-gradient(135deg,${C.p1},${C.pk1})`}}/><span style={{fontSize:10,color:C.txt2}}>Sales / बिक्री</span></div>
      </div>
    </GlowCard>

    {/* Expense Breakdown Donut Infographic */}
    <GlowCard style={{marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:13,color:C.txt,marginBottom:12,fontFamily:"Poppins"}}>
        Expense Breakdown <span style={{fontSize:10,color:C.txt2,fontWeight:400}}>/ खर्च विवरण</span>
      </div>
      {expenseBreak.map(e=>(
        <div key={e.cat} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:11,color:C.txt,fontWeight:500}}>{e.cat}</span>
            <span style={{fontSize:11,fontWeight:700,color:e.color}}>{INR(e.amt)} ({e.pct}%)</span>
          </div>
          <div style={{height:6,background:"rgba(255,255,255,0.08)",borderRadius:4}}>
            <div style={{height:6,background:`linear-gradient(90deg,${e.color},${e.color}99)`,borderRadius:4,width:`${e.pct}%`,transition:"width 0.5s"}}/>
          </div>
        </div>
      ))}
    </GlowCard>

    {/* WhatsApp Broadcast */}
    <GlowCard style={{marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:13,color:C.txt,marginBottom:10,fontFamily:"Poppins"}}>
        WhatsApp Broadcast <span style={{fontSize:10,color:C.txt2,fontWeight:400}}>/ संदेश भेजें</span>
      </div>
      {customers.filter(c=>c.balance>0).map(c=>(
        <div key={c.customer_id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
          <Avatar name={c.business_name} size={32}/>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:C.txt}}>{c.business_name}</div>
            <div style={{fontSize:10,color:C.txt2}}>{INR(c.balance)} बाकी है</div>
          </div>
          <a href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(`नमस्ते ${c.owner_name} जी! आपका बकाया ${INR(c.balance)} है। कृपया जल्दी भुगतान करें। - ${account.business||"Vyapai"} 🙏`)}`}
             target="_blank" rel="noreferrer"
             style={{background:C.wa,borderRadius:8,padding:"5px 10px",display:"flex",alignItems:"center",gap:4,textDecoration:"none"}}>
            <span style={{fontSize:12}}>💬</span>
            <span style={{fontSize:10,color:"#fff",fontWeight:700}}>Send</span>
          </a>
        </div>
      ))}
    </GlowCard>

    {/* Recent Invoices */}
    <GlowCard>
      <div style={{fontWeight:700,fontSize:13,color:C.txt,marginBottom:10,fontFamily:"Poppins"}}>
        Recent Activity <span style={{fontSize:10,color:C.txt2,fontWeight:400}}>/ हाल की गतिविधि</span>
      </div>
      {invoices.slice(0,3).map(inv=>(
        <div key={inv.invoice_id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
          <Avatar name={inv.customer_name} size={32}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:13,color:C.txt,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{inv.customer_name}</div>
            <div style={{fontSize:10,color:C.txt2}}>{inv.invoice_id} • {inv.date}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.txt}}>{INR(inv.total_amount)}</div>
            <Badge status={inv.status}/>
          </div>
        </div>
      ))}
    </GlowCard>
  </div>;
}

// ─── CUSTOMERS ───────────────────────────────────────────
function Customers({customers,onAdd}){
  const [search,setSearch]=useState("");
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({business_name:"",owner_name:"",phone:"",city:"Lucknow",category:"Kirana"});
  const filtered=customers.filter(c=>c.business_name.toLowerCase().includes(search.toLowerCase())||c.owner_name.toLowerCase().includes(search.toLowerCase()));
  return <div>
    <div style={{display:"flex",gap:8,marginBottom:14}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search / खोजें..." style={{flex:1,padding:"9px 14px",borderRadius:10,border:`1px solid ${C.border}`,fontSize:13,outline:"none",background:C.card2,color:C.txt}}/>
      <button onClick={()=>setShowForm(!showForm)} style={{padding:"9px 16px",borderRadius:10,background:`linear-gradient(135deg,#2C4FE8,#4B6FFF)`,color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Poppins",whiteSpace:"nowrap"}}>+ नया</button>
    </div>
    {showForm&&<div style={{background:C.card,border:`1px solid ${C.p1}44`,borderRadius:14,padding:16,marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:C.pM,fontFamily:"Poppins"}}>नया ग्राहक जोड़ें / Add Customer</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["business_name","Business Name"],["owner_name","Owner / मालिक"],["phone","Phone"],["city","City / शहर"],["category","Category"]].map(([k,l])=>(
          <input key={k} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={l}
            style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,outline:"none",background:C.bg3,color:C.txt}}/>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginTop:10}}>
        <button onClick={()=>{onAdd(form);setShowForm(false);setForm({business_name:"",owner_name:"",phone:"",city:"Lucknow",category:"Kirana"});}}
          style={{padding:"8px 20px",borderRadius:8,background:`linear-gradient(135deg,#2C4FE8,#4B6FFF)`,color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:700}}>Save करें</button>
        <button onClick={()=>setShowForm(false)} style={{padding:"8px 16px",borderRadius:8,background:C.bg3,color:C.txt2,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:13}}>Cancel</button>
      </div>
    </div>}
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {filtered.map(c=>(
        <div key={c.customer_id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
          <Avatar name={c.business_name} size={42}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:13,color:C.txt,fontFamily:"Poppins"}}>{c.business_name}</div>
            <div style={{fontSize:11,color:C.txt2}}>{c.owner_name} • {c.city}</div>
            <span style={{background:"rgba(75,111,255,0.18)",color:"#89A4FF",borderRadius:10,padding:"1px 8px",fontSize:9,fontWeight:700}}>{c.category}</span>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:14,fontWeight:800,color:c.balance>0?C.r1:C.g1,fontFamily:"Poppins"}}>{INR(c.balance)}</div>
            <div style={{fontSize:9,color:"#3D5A9A"}}>{c.balance>0?"बाकी है":"Clear ✓"}</div>
            {c.balance>0&&<a href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(`नमस्ते ${c.owner_name} जी! आपका बकाया ${INR(c.balance)} है।`)}`}
              target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:3,background:C.wa,borderRadius:6,padding:"3px 7px",textDecoration:"none",marginTop:3}}>
              <span style={{fontSize:10}}>💬</span><span style={{fontSize:9,color:"#fff",fontWeight:700}}>WA</span>
            </a>}
          </div>
        </div>
      ))}
    </div>
  </div>;
}

// ─── INVOICES ────────────────────────────────────────────
function Invoices({invoices,customers,onAdd}){
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({customer_id:"",total_amount:"",notes:""});
  const [filter,setFilter]=useState("All");
  const filtered=filter==="All"?invoices:invoices.filter(i=>i.status===filter);
  return <div>
    <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
      <div style={{display:"flex",gap:4,flex:1,flexWrap:"wrap"}}>
        {["All","Unpaid","Partial","Paid"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:filter===f?`linear-gradient(135deg,#2C4FE8,#4B6FFF)`:"rgba(255,255,255,0.07)",color:filter===f?"#fff":C.txt2}}>
            {f}
          </button>
        ))}
      </div>
      <button onClick={()=>setShowForm(!showForm)} style={{padding:"7px 14px",borderRadius:10,background:`linear-gradient(135deg,#00C48C,#00A374)`,color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:700}}>+ Invoice</button>
    </div>
    {showForm&&<div style={{background:C.card,border:`1px solid ${C.g1}44`,borderRadius:14,padding:16,marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#6ee7b7"}}>नया Invoice बनाएं</div>
      <select value={form.customer_id} onChange={e=>setForm(f=>({...f,customer_id:e.target.value}))}
        style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,marginBottom:8,background:C.bg3,color:C.txt,outline:"none"}}>
        <option value="">Customer चुनें...</option>
        {customers.map(c=><option key={c.customer_id} value={c.customer_id}>{c.business_name}</option>)}
      </select>
      <input value={form.total_amount} onChange={e=>setForm(f=>({...f,total_amount:e.target.value}))} placeholder="Total Amount (₹)"
        style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,marginBottom:8,background:C.bg3,color:C.txt,outline:"none",boxSizing:"border-box"}}/>
      <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Notes (optional)"
        style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,background:C.bg3,color:C.txt,outline:"none",boxSizing:"border-box"}}/>
      <div style={{display:"flex",gap:8,marginTop:10}}>
        <button onClick={()=>{onAdd(form);setShowForm(false);}} style={{padding:"8px 20px",borderRadius:8,background:`linear-gradient(135deg,#00C48C,#00A374)`,color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:700}}>बनाएं</button>
        <button onClick={()=>setShowForm(false)} style={{padding:"8px 16px",borderRadius:8,background:C.bg3,color:C.txt2,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:13}}>Cancel</button>
      </div>
    </div>}
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {filtered.map(inv=>(
        <div key={inv.invoice_id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.txt,fontFamily:"Poppins"}}>{inv.customer_name}</div>
              <div style={{fontSize:10,color:C.txt2,marginTop:1}}>{inv.invoice_id} • {inv.date}</div>
            </div>
            <Badge status={inv.status}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:11,color:C.txt2}}>Paid: <span style={{color:C.g1,fontWeight:700}}>{INR(inv.paid)}</span> / <span style={{fontWeight:700,color:C.txt}}>{INR(inv.total_amount)}</span></div>
            {inv.total_amount-inv.paid>0&&<div style={{fontSize:11,color:C.r1,fontWeight:700}}>Due: {INR(inv.total_amount-inv.paid)}</div>}
          </div>
          <div style={{height:4,background:"rgba(255,255,255,0.08)",borderRadius:4}}>
            <div style={{height:4,background:`linear-gradient(90deg,${C.g1},${C.g1}99)`,borderRadius:4,width:`${(inv.paid/inv.total_amount)*100}%`}}/>
          </div>
        </div>
      ))}
    </div>
  </div>;
}

// ─── DIARY AI ─────────────────────────────────────────────
function DiaryAI(){
  const [image,setImage]=useState(null);
  const [imageB64,setImageB64]=useState(null);
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [ocrText,setOcrText]=useState("");
  const fileRef=useRef();

  const handleFile=e=>{
    const file=e.target.files[0];
    if(!file)return;
    setImage(URL.createObjectURL(file));
    const reader=new FileReader();
    reader.onload=ev=>{
      const b64=ev.target.result.split(",")[1];
      setImageB64(b64);
    };
    reader.readAsDataURL(file);
  };

  const analyze=async(isDemo)=>{
    setLoading(true);
    setResult(null);
    try{
      let bodyPayload;
      if(isDemo||!imageB64){
        bodyPayload={
          model:"claude-sonnet-4-20250514",
          max_tokens:1500,
          messages: [
            {
              role: "system",
              content: "You are a Hinglish CRM diary analyzer. Analyze the diary data and return valid JSON."
            },
            {
              role: "user",
              content: "Demo diary: Sabzi bikri ₹2800, Mandi kharid ₹1700, Thela kiraya ₹200, Chai-paani ₹150, Helper ₹350."
            }
          ]
        };
      }else{
        bodyPayload={
          model:"claude-sonnet-4-20250514",
          max_tokens:1500,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Look at the handwritten diary image carefully. Extract all transactions (sales, purchases, expenses). Return ONLY valid JSON: {\"transactions\":[{\"type\":\"SALE\"|\"PURCHASE\"|\"EXPENSE\",\"label\":\"string\",\"amount\":number}],\"total_sale\":number,\"total_purchase\":number,\"total_expense\":number,\"profit_loss\":number,\"summary_hindi\":\"2-4 line Hindi summary\",\"action_steps\":[\"5 actions\"]}" },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } }
              ]
            }
          ]
        };
      }
      const { data: edgeData, error } = await supabase.functions.invoke('vyapai-ai', {
        body: bodyPayload
      });
      const data = edgeData;
      const text = data?.choices?.[0]?.message?.content || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.error) throw new Error("AI Error");
      setResult(parsed);
      if(isDemo)setOcrText("Sabzi bikri ₹2800\nMandi kharid ₹1700\nThela kiraya ₹200\nChai-paani ₹150\nHelper ₹350");
    }catch(err){
      setResult({error:true,summary_hindi:"Kuch error aaya. Demo data dekh rahe hain...",transactions:[
        {type:"SALE",label:"Sabzi bikri",amount:2800},{type:"PURCHASE",label:"Mandi kharid",amount:1700},
        {type:"EXPENSE",label:"Thela kiraya",amount:200},{type:"EXPENSE",label:"Chai-paani",amount:150}
      ],total_sale:2800,total_purchase:1700,total_expense:350,profit_loss:750,action_steps:[
        "1. Subah mandi se kharid plan karke karein.",
        "2. Zyada margin wali sabzi aage rakhein.",
        "3. Chhote kharche roz likhein.",
        "4. Regular customers ko extra service dein.",
        "5. Raat ko 5 min hisaab dekhein."
      ]});
    }
    setLoading(false);
  };

  const tC={SALE:{bg:"rgba(5,150,105,0.15)",c:"#6ee7b7"},PURCHASE:{bg:"rgba(245,158,11,0.15)",c:"#fcd34d"},EXPENSE:{bg:"rgba(239,68,68,0.15)",c:"#fca5a5"}};
  return <div>
    <div style={{background:`linear-gradient(135deg,${C.b2},${C.p1})`,borderRadius:16,padding:"16px",marginBottom:16}}>
      <div style={{fontWeight:800,fontSize:16,color:"#fff",fontFamily:"Poppins"}}>📒 Rozana Hisaab / Daily Diary</div>
      <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",marginTop:3}}>Diary ki photo upload karein — AI OCR se sab padhega!</div>
    </div>

    <div style={{background:C.card,border:`2px dashed ${C.p1}55`,borderRadius:14,padding:16,textAlign:"center",marginBottom:14,cursor:"pointer"}}
      onClick={()=>fileRef.current?.click()}>
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
      {image?<img src={image} alt="diary" style={{maxWidth:"100%",maxHeight:180,borderRadius:8,objectFit:"contain"}}/>
      :<>
        <div style={{fontSize:36,marginBottom:8}}>📷</div>
        <div style={{fontSize:13,color:C.txt2,fontWeight:600}}>Diary / Notepad Photo Upload Karein</div>
        <div style={{fontSize:10,color:"#3D5A9A",marginTop:4}}>Hindi • Hinglish • English — sab chalega</div>
        <div style={{background:C.p1,color:"#fff",borderRadius:8,padding:"7px 16px",marginTop:10,display:"inline-block",fontSize:12,fontWeight:700,cursor:"pointer"}}>📤 Upload Photo</div>
      </>}
    </div>

    {image&&!loading&&<button onClick={()=>fileRef.current?.click()} style={{width:"100%",padding:"8px",borderRadius:10,background:"rgba(75,111,255,0.12)",color:C.pM,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:12,marginBottom:8}}>
      📷 Doosri Photo Upload Karein
    </button>}

    <div style={{display:"flex",gap:8,marginBottom:14}}>
      {image&&<button onClick={()=>analyze(false)} disabled={loading} style={{flex:1,padding:"11px",borderRadius:10,background:loading?"#1a2040":`linear-gradient(135deg,#2C4FE8,#4B6FFF)`,color:"#fff",border:"none",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"Poppins"}}>
        {loading?"OCR + AI चल रहा है... 🔍":"📷 Analyze Karein"}
      </button>}
      <button onClick={()=>analyze(true)} disabled={loading} style={{flex:image?0:1,padding:"11px 14px",borderRadius:10,background:loading?"#1a2040":"rgba(75,111,255,0.18)",color:loading?"#3D5A9A":C.pM,border:`1px solid ${C.border}`,cursor:"pointer",fontWeight:600,fontSize:12}}>
        Demo
      </button>
    </div>

    {loading && (
      <div style={{textAlign:"center",padding:20,color:C.txt2}}>
        <div style={{fontSize:24,marginBottom:8}}>🔍</div>
        <div style={{fontSize:13,fontWeight:600}}>OCR + AI Analysis chal rahi hai...</div>
        <div style={{fontSize:10,marginTop:4,opacity:0.7}}>Handwriting padhi ja rahi hai</div>
      </div>
    )}

    {result&&!loading&&<>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <MetricCard label="Kul Bikri" labelHi="कुल बिक्री" value={INR(result.total_sale)} color="#6ee7b7" icon="💰"/>
        <MetricCard label="Kul Kharid" labelHi="कुल खरीद" value={INR(result.total_purchase)} color="#fcd34d" icon="🛒"/>
        <MetricCard label="Kharcha" labelHi="खर्चा" value={INR(result.total_expense)} color="#fca5a5" icon="💸"/>
        <MetricCard label="Net Munafa" labelHi="शुद्ध मुनाफा" value={INR(result.profit_loss||0)} color={(result.profit_loss||0)>=0?C.g1:C.r1} icon="📊"/>
      </div>

      <GlowCard style={{marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:12,color:C.txt,marginBottom:10}}>📋 Transaction Details / लेन-देन</div>
        {(result.transactions||[]).map((t,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{...tC[t.type]||tC.EXPENSE,borderRadius:6,padding:"2px 7px",fontSize:9,fontWeight:700}}>{t.type}</span>
              <span style={{fontSize:12,color:C.txt}}>{t.label}</span>
            </div>
            <span style={{fontWeight:700,fontSize:12,color:t.type==="SALE"?C.g1:C.r1}}>{INR(t.amount)}</span>
          </div>
        ))}
      </GlowCard>

      <GlowCard style={{marginBottom:12,background:`linear-gradient(135deg,rgba(44,79,232,0.2),rgba(75,111,255,0.12))`}}>
        <div style={{fontWeight:700,fontSize:12,color:C.pM,marginBottom:8}}>🤖 AI Summary / सारांश</div>
        <div style={{fontSize:12,color:C.txt,lineHeight:1.8}}>{result.summary_hindi}</div>
      </GlowCard>

      <GlowCard style={{background:"rgba(5,150,105,0.1)"}}>
        <div style={{fontWeight:700,fontSize:12,color:"#6ee7b7",marginBottom:10}}>✅ Kal ke 5 Action Steps / कल के लिए 5 काम</div>
        {(result.action_steps||[]).map((s,i)=>(
          <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:8}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:`linear-gradient(135deg,#00C48C,#00A374)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700,flexShrink:0}}>{i+1}</div>
            <div style={{fontSize:11,color:C.txt,lineHeight:1.6}}>{typeof s==="string"?s.replace(/^\d+\.\s*/,""):s}</div>
          </div>
        ))}
      </GlowCard>
    </>}
  </div>;
}

// ─── REPORTS ─────────────────────────────────────────────
function Reports({invoices, customers}){
  const today = new Date();
  
  // Calculate Aging (Real Data)
  const overdueInvs = invoices.filter(inv => inv.status !== "Paid");
  const aging = [
    { label: "0-15 दिन", amt: 0, color: C.g1, pct: 0 },
    { label: "16-30 दिन", amt: 0, color: C.o1, pct: 0 },
    { label: "30+ दिन", amt: 0, color: C.r1, pct: 0 }
  ];

  let totalOverdue = 0;
  let gstCollected = 0;
  let totalSalesAmt = 0;

  invoices.forEach(inv => {
    totalSalesAmt += inv.total_amount;
    gstCollected += (inv.total_amount * 0.18) / 1.18; // Reverse GST 18%
  });

  overdueInvs.forEach(inv => {
    const diff = (today - new Date(inv.date)) / (1000 * 60 * 60 * 24);
    const due = inv.total_amount - inv.paid;
    totalOverdue += due;
    if (diff <= 15) aging[0].amt += due;
    else if (diff <= 30) aging[1].amt += due;
    else aging[2].amt += due;
  });

  if (totalOverdue > 0) {
    aging.forEach(a => a.pct = Math.round((a.amt / totalOverdue) * 100));
  }

  // Top Invoices by Amount
  const topInvoices = [...invoices].sort((a,b) => b.total_amount - a.total_amount).slice(0, 5);

  // Mock data for nextDayActions, as it's not provided in the original context
  const nextDayActions = [
    "Pending payments collect karein.",
    "Naye customers ko follow up karein.",
    "Stock check karein aur order place karein.",
    "Marketing ke liye naye ideas sochein.",
    "Business expenses review karein."
  ];

  return <div>
    {/* GST & Profit Report */}
    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16}}>
      <MetricCard label="GST Collected" labelHi="जीएसटी (अनुमानित)" value={INR(Math.round(gstCollected))} color={C.b1} icon="🧾"/>
      <MetricCard label="Net Profit" labelHi="शुद्ध मुनाफा (Est)" value={INR(Math.round(totalSalesAmt * 0.15))} color={C.g1} icon="💹"/>
    </div>

    {/* Dynamic Aging Report */}
    <GlowCard style={{marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:13,color:C.txt,marginBottom:12,fontFamily:"Poppins"}}>
        📊 True Receivables Aging <span style={{fontSize:10,color:C.txt2,fontWeight:400}}>/ असली बकाया उम्र</span>
      </div>
      <div style={{fontSize:18,fontWeight:900,color:C.r1,marginBottom:16}}>{INR(totalOverdue)} <span style={{fontSize:10,color:C.txt2,fontWeight:400}}>Total Outstanding</span></div>
      {aging.map(a=>(
        <div key={a.label} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:11,color:C.txt}}>{a.label}</span>
            <span style={{fontSize:11,fontWeight:700,color:a.color}}>{INR(a.amt)} ({a.pct}%)</span>
          </div>
          <div style={{height:10,background:"rgba(255,255,255,0.08)",borderRadius:5,overflow:"hidden"}}>
            <div style={{height:"100%",background:a.color,width:`${a.pct}%`,transition:"width 1s",boxShadow:`0 0 10px ${a.color}44`}}/>
          </div>
        </div>
      ))}
    </GlowCard>

    {/* Top Invoices (Real Data) */}
    <GlowCard style={{marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:13,color:C.txt,marginBottom:12,fontFamily:"Poppins"}}>
        📈 Largest Invoices <span style={{fontSize:10,color:C.txt2,fontWeight:400}}>/ सबसे बड़े बिल</span>
      </div>
      {topInvoices.map((inv,i)=>(
        <div key={inv.invoice_id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:`linear-gradient(135deg,#2C4FE8,#4B6FFF)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700,flexShrink:0}}>{i+1}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:C.txt}}>{inv.customer_name}</div>
            <div style={{fontSize:10,color:C.txt2}}>{inv.date} • {inv.invoice_id}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.txt}}>{INR(inv.total_amount)}</div>
            <Badge status={inv.status}/>
          </div>
        </div>
      ))}
    </GlowCard>

    {/* 5 Action Points */}
    <GlowCard style={{marginBottom:14,background:"rgba(5,150,105,0.08)"}}>
      <div style={{fontWeight:700,fontSize:13,color:"#6ee7b7",marginBottom:12,fontFamily:"Poppins"}}>
        ✅ Active Worklist <span style={{fontSize:10,color:C.txt2,fontWeight:400}}>/ कल के 5 काम</span>
      </div>
      {nextDayActions.map((a,i)=>(
        <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:`linear-gradient(135deg,#00C48C,#4B6FFF)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700,flexShrink:0}}>{i+1}</div>
          <div style={{fontSize:11,color:C.txt,lineHeight:1.7}}>{a}</div>
        </div>
      ))}
    </GlowCard>

    {/* GST Export */}
    <GlowCard>
      <div style={{fontWeight:700,fontSize:13,color:C.txt,marginBottom:10,fontFamily:"Poppins"}}>
        📄 GST Export <span style={{fontSize:10,color:C.txt2,fontWeight:400}}>/ जीएसटी निर्यात</span>
      </div>
      {["CGST Summary (CSV)","SGST Summary (CSV)","IGST Summary (CSV)"].map(label=>(
        <button key={label} style={{display:"flex",width:"100%",padding:"10px 14px",marginBottom:8,borderRadius:10,background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,cursor:"pointer",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>⬇️</span>
          <span style={{fontSize:12,color:C.txt,fontWeight:500}}>{label}</span>
        </button>
      ))}
    </GlowCard>
  </div>;
}

// ─── AI CHAT ─────────────────────────────────────────────
function AIChat({customers,invoices,account}){
  const [messages,setMessages]=useState([
    {role:"assistant",text:`नमस्ते ${account.name||""}! 🙏 Main ${account.business||"aapke business"} ka AI assistant hoon.\n\nMujhse poochh sakte ho:\n• Customer balance queries\n• Invoice status\n• Business insights & analysis\n• Kal ke liye suggestions\n• Koi bhi CRM sawaal!`}
  ]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef();
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const totalDue=invoices.reduce((s,i)=>s+(i.total_amount-i.paid),0);
  const totalSales=invoices.reduce((s,i)=>s+i.total_amount,0);

  const systemPrompt=`You are a personalized Hinglish CRM + Business Intelligence assistant for ${account.business||"Vyapai Business"}.

BUSINESS CONTEXT:
- Business Name: ${account.business||"N/A"}
- Owner: ${account.name||"N/A"}
- City: ${account.city||"Lucknow"}, ${account.state||"UP"}
- Category: ${account.category||"Retail/MSME"}
- GST: ${account.gstin||"Not registered"}
- Phone: ${account.phone||"N/A"}
- About: ${account.about||"Small Indian MSME business"}

LIVE DATA:
- Total customers: ${customers.length}
- Customer list: ${customers.map(c=>`${c.business_name}(balance:${c.balance})`).join(", ")}
- Invoices: ${invoices.length} total
- Total outstanding: ₹${totalDue.toLocaleString("en-IN")}
- Total sales this month: ₹${totalSales.toLocaleString("en-IN")}
- Unpaid invoices: ${invoices.filter(i=>i.status==="Unpaid").length}
- Partial invoices: ${invoices.filter(i=>i.status==="Partial").length}

TOP SELLING ITEMS: Basmati Rice 5kg (340 units, ₹85K), Toor Dal 1kg (280 units, ₹36K), Mustard Oil 1L (220 units, ₹26K)

YOUR ROLE:
1. Answer CRM queries in Hinglish (mix Hindi + English naturally)
2. Give business INSIGHTS and analysis when asked
3. Suggest actionable improvements for ${account.business||"this business"}
4. Always be personalized — use owner's name, business name
5. For balance queries: give exact figures from data above
6. For general business advice: relate it to ${account.category||"retail"} business in India
7. Keep responses conversational, helpful, and encouraging

JSON actions when needed:
{"action":"GET_BALANCE|ADD_CUSTOMER|CREATE_INVOICE|ADD_PAYMENT|ANALYZE_BUSINESS","parameters":{...},"reply":"..."}`;

  const [isListening,setIsListening]=useState(false);
  
  const startVoice=()=>{
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SpeechRecognition)return alert("Browser voice support nahi hai.");
    const rec=new SpeechRecognition();
    rec.lang="hi-IN"; // Support for Hindi/Hinglish
    rec.onstart=()=>setIsListening(true);
    rec.onend=()=>setIsListening(false);
    rec.onresult=e=>{
      const t=e.results[0][0].transcript;
      setInput(t);
    };
    rec.start();
  };

  const speak=t=>{
    const s=window.speechSynthesis;
    const ut=new SpeechSynthesisUtterance(t);
    ut.lang="hi-IN";
    s.speak(ut);
  };

  const send=async()=>{
    if(!input.trim()||loading)return;
    const userMsg=input.trim();
    setInput("");
    setMessages(m=>[...m,{role:"user",text:userMsg}]);
    setLoading(true);
    try{
      const { data: edgeData, error } = await supabase.functions.invoke('vyapai-ai', {
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-8).map(m => ({ role: m.role, content: m.text })),
            { role: "user", content: userMsg }
          ]
        }
      });
      const data = edgeData;
      const text = data?.choices?.[0]?.message?.content || data?.error || "AI Service currently unavailable.";
      setMessages(m=>[...m,{role:"assistant",text}]);
      speak(text); 
    }catch(err){
      const errTxt="Service is momentarily down. Please try again later.";
      setMessages(m=>[...m,{role:"assistant",text:errTxt}]);
      speak(errTxt);
    }
    setLoading(false);
  };

  const quick=["Business insights batao","Gupta Store ka balance?","Total outstanding kitna?","Kal ke liye suggestions","Top items kaun se hain?","Sharma Electronics reminder"];

  return <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
    <div style={{background:`linear-gradient(135deg,#0C1228 0%,#1B2BB8 60%,#4B6FFF 100%)`,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤖</div>
      <div>
        <div style={{color:"#fff",fontWeight:700,fontSize:14,fontFamily:"Poppins"}}>Vyapai AI / व्यापाई AI</div>
        <div style={{color:"rgba(255,255,255,0.75)",fontSize:10}}>{account.business||"Business"} ke liye trained</div>
      </div>
      <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:"#4ade80"}}/>
        <span style={{fontSize:9,color:"rgba(255,255,255,0.7)"}}>Online</span>
      </div>
    </div>

    <div style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:10}}>
      {messages.map((m,i)=>(
        <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
          <div style={{maxWidth:"82%",padding:"10px 14px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
            background:m.role==="user"?`linear-gradient(135deg,#2C4FE8,#4B6FFF)`:`linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.09))`,
            color:"#fff",fontSize:12,lineHeight:1.7,border:m.role==="assistant"?`1px solid ${C.border}`:"none",whiteSpace:"pre-wrap"}}>
            {m.text}
          </div>
        </div>
      ))}
      {loading&&<div style={{display:"flex",gap:4,padding:"12px 14px",background:C.card,borderRadius:"18px 18px 18px 4px",width:60,border:`1px solid ${C.border}`}}>
        {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#4B6FFF",animation:`bounce 1s ${i*0.15}s infinite`}}/>)}
      </div>}
      <div ref={endRef}/>
    </div>

    <div style={{padding:"8px 10px",display:"flex",gap:5,flexWrap:"wrap",borderTop:`1px solid ${C.border}`,background:C.card}}>
      {quick.map(q=>(
        <button key={q} onClick={()=>setInput(q)} style={{fontSize:10,padding:"3px 8px",borderRadius:14,border:`1px solid ${C.border}`,color:C.pM,background:"rgba(75,111,255,0.12)",cursor:"pointer"}}>
          {q}
        </button>
      ))}
    </div>

    <div style={{padding:"8px 12px",background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"center"}}>
      <button onClick={startVoice} 
        style={{width:42,height:42,borderRadius:"50%",background:isListening?C.r1:C.p1,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:isListening?`0 0 15px ${C.r1}`:"none",transition:"all 0.3s"}}>
        <span style={{fontSize:20,color:"#fff"}}>{isListening?"🛑":"🎤"}</span>
      </button>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
        placeholder={isListening?"Boliye... / Listening...":"Poochhein... (Hinglish)"}
        style={{flex:1,padding:"10px 16px",borderRadius:24,border:`1px solid ${C.border}`,fontSize:13,outline:"none",background:C.bg3,color:C.txt,fontFamily:"Poppins"}}/>
      <button onClick={send} disabled={loading} 
        style={{width:42,height:42,borderRadius:"50%",background:loading?"#1a2040":`linear-gradient(135deg,#2C4FE8,#4B6FFF)`,border:"none",cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff"}}>
        🚀
      </button>
    </div>
  </div>;
}

// ─── PRODUCTS (Accounting & Inventory) ─────────────────────
function Products({products, onAdd}){
  const [q,setQ]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:"",price:0,stock:0,category:""});

  const filtered=products.filter(p=>(p.name||"").toLowerCase().includes(q.toLowerCase()));

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:14,color:C.txt,fontFamily:"Poppins"}}>माल की सूची / Inventory</div>
      <button onClick={()=>setShowAdd(true)} style={{padding:"6px 14px",borderRadius:8,background:`linear-gradient(135deg,#2C4FE8,#4B6FFF)`,color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:700}}>
        + Item जोड़ें
      </button>
    </div>

    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Item search karein..."
      style={{width:"100%",background:C.bg3,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",color:C.txt,fontSize:13,outline:"none",marginBottom:14}}/>

    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {filtered.map(p=>(
        <GlowCard key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px"}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.txt}}>{p.name}</div>
            <div style={{fontSize:10,color:C.txt2,marginTop:2}}>{p.category || "General"} • {INR(p.price)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:C.txt2}}>Stock</div>
            <div style={{fontSize:14,fontWeight:900,color:p.stock < 10 ? C.r1 : C.g1}}>{p.stock}</div>
          </div>
        </GlowCard>
      ))}
    </div>

    {showAdd && <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.9)",zIndex:1000,display:"flex",alignItems:"flex-end"}}>
      <div style={{background:C.bg2,width:"100%",padding:20,borderRadius:"24px 24px 0 0",borderTop:`2px solid ${C.p1}`}}>
        <div style={{fontWeight:800,fontSize:18,color:C.txt,marginBottom:20,fontFamily:"Poppins"}}>Naya Item Jodein / Add Product</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input placeholder="Item Name" style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12,color:"#fff"}} 
            onChange={e=>setForm({...form,name:e.target.value})}/>
          <div style={{display:"flex",gap:10}}>
            <input placeholder="Price" type="number" style={{flex:1,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12,color:"#fff"}}
              onChange={e=>setForm({...form,price:Number(e.target.value)})}/>
            <input placeholder="Stock" type="number" style={{flex:1,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12,color:"#fff"}}
              onChange={e=>setForm({...form,stock:Number(e.target.value)})}/>
          </div>
          <button onClick={()=>{onAdd(form);setShowAdd(false);}} style={{background:`linear-gradient(135deg,#00C48C,#00A374)`,padding:14,borderRadius:12,color:"#fff",fontWeight:800,border:"none",marginTop:10}}>
            Item Save Karein
          </button>
          <button onClick={()=>setShowAdd(false)} style={{background:"transparent",color:C.txt2,padding:10,border:`1px solid ${C.border}`,borderRadius:12}}>Cancel</button>
        </div>
      </div>
    </div>}
  </div>;
}
function Account({account,setAccount}){
  const [edit,setEdit]=useState(false);
  const [form,setForm]=useState(account);
  const fields=[
    ["name","Owner Name / मालिक का नाम","👤"],
    ["business","Business Name / व्यापार का नाम","🏪"],
    ["phone","Phone / फोन","📱"],
    ["city","City / शहर","📍"],
    ["state","State / राज्य","🗺️"],
    ["category","Business Type / व्यापार प्रकार","🏷️"],
    ["gstin","GSTIN","📋"],
    ["email","Email","📧"],
    ["about","About Business / व्यापार के बारे में","ℹ️"],
  ];
  return <div>
    <GlowCard style={{marginBottom:16,background:`linear-gradient(135deg,rgba(12,18,40,0.95),rgba(44,79,232,0.35))`}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
        <div style={{width:60,height:60,borderRadius:"50%",background:`linear-gradient(135deg,#2C4FE8,#4B6FFF)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>
          {account.name?account.name[0].toUpperCase():"👤"}
        </div>
        <div>
          <div style={{fontWeight:800,fontSize:16,color:C.txt,fontFamily:"Poppins"}}>{account.name||"Aapka Naam"}</div>
          <div style={{fontSize:12,color:C.txt2}}>{account.business||"Business Name"}</div>
          <div style={{fontSize:10,color:"#3D5A9A"}}>{account.city||"City"} • {account.category||"Category"}</div>
        </div>
      </div>
      <a href="https://vyapai.in/" target="_blank" rel="noreferrer"
        style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"7px 12px",textDecoration:"none",color:"#fff",fontSize:11,fontWeight:600}}>
        <span>🌐</span><span>vyapai.in — Hamari Website</span>
      </a>
    </GlowCard>

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:14,color:C.txt,fontFamily:"Poppins"}}>Profile Details / प्रोफाइल</div>
      <button onClick={()=>{if(edit){setAccount(form);}setEdit(!edit);}} style={{padding:"6px 14px",borderRadius:8,background:edit?`linear-gradient(135deg,#00C48C,#00A374)`:`linear-gradient(135deg,#2C4FE8,#4B6FFF)`,color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:700}}>
        {edit?"✓ Save करें":"✏️ Edit"}
      </button>
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {fields.map(([key,label,icon])=>(
        <div key={key} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16,flexShrink:0}}>{icon}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:9,color:"#3D5A9A",marginBottom:2}}>{label}</div>
            {edit?<input value={form[key]||""} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
              style={{width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${C.p1}`,color:C.txt,fontSize:12,outline:"none",padding:"2px 0"}}/>
            :<div style={{fontSize:13,color:form[key]?C.txt:C.txt2,fontWeight:form[key]?500:400}}>{form[key]||"Not set"}</div>}
          </div>
        </div>
      ))}
    </div>

    <div style={{marginTop:16,background:`linear-gradient(135deg,rgba(12,18,40,0.95),rgba(44,79,232,0.25))`,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px"}}>
      <div style={{fontWeight:700,fontSize:13,color:C.pM,marginBottom:8,fontFamily:"Poppins"}}>Sudarshan AI Labs</div>
      <div style={{fontSize:11,color:C.txt2,lineHeight:1.7}}>DPIIT Startup India Registered • Lucknow, UP</div>
      <div style={{fontSize:11,color:C.txt2}}>Indian MSME Digital Growth Platform</div>
      <a href="https://vyapai.in/" target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:8,background:`linear-gradient(135deg,#2C4FE8,#4B6FFF)`,borderRadius:8,padding:"6px 12px",textDecoration:"none",color:"#fff",fontSize:11,fontWeight:700}}>
        🌐 Visit vyapai.in
      </a>
    </div>
  </div>;
}

// ─── NAV CONFIG ──────────────────────────────────────────
const NAV=[
  {id:"dashboard",label:"Home",labelHi:"होम",icon:"🏠",grad:["#4B6FFF","#89A4FF"]},
    {id:"customers",label:"Customers",labelHi:"ग्राहक",icon:"👥",grad:[C.p1,C.p2]},
    {id:"products",label:"Products",labelHi:"सामान",icon:"📦",grad:[C.b1,C.b2]},
    {id:"invoices",label:"Invoices",labelHi:"बिल",icon:"🧾",grad:[C.o1,C.o2]},
  {id:"diary",label:"Diary AI",labelHi:"डायरी",icon:"📒",grad:["#F5C518","#D4A800"]},
  {id:"reports",label:"Reports",labelHi:"रिपोर्ट",icon:"📊",grad:["#7B9FFF","#4B6FFF"]},
  {id:"chat",label:"AI Chat",labelHi:"चैट",icon:"🤖",grad:["#4B6FFF","#38BDF8"]},
  {id:"account",label:"Account",labelHi:"अकाउंट",icon:"👤",grad:["#2C4FE8","#4B6FFF"]},
];

const TAB_LABELS={dashboard:"Dashboard / होम",customers:"Customers / ग्राहक",invoices:"Invoices / बिल",diary:"Diary AI / डायरी AI",reports:"Reports / रिपोर्ट",chat:"AI Chat / व्यापाई AI",account:"Account / अकाउंट"};

// ─── APP ─────────────────────────────────────────────────
export default function App(){
  const [tab, setTab] = useState("dashboard");
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState({
    name: "Loading...", business: "Loading...", phone: "",
    city: "", state: "", category: "",
    gstin: "", email: "", about: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: custs } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      const { data: invs } = await supabase.from('invoices').select('*').order('date', { ascending: false });
      const { data: acc } = await supabase.from('account_settings').select('*').single();

      if (custs) setCustomers(custs);
      if (invs) setInvoices(invs);
      if (acc) setAccount(acc);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
    setLoading(false);
  };

  const addCustomer = async (form) => {
    const newId = `C${(customers.length + 1).toString().padStart(3, '0')}`;
    const { data, error } = await supabase
      .from('customers')
      .insert([{ ...form, customer_id: newId, balance: 0 }])
      .select();
    
    if (data) setCustomers(prev => [data[0], ...prev]);
  };

  const addInvoice = async (form) => {
    const cust = customers.find(c => c.customer_id === form.customer_id);
    if (!cust) return;
    
    const newId = `INV-${(invoices.length + 1).toString().padStart(3, '0')}`;
    const newInv = {
      invoice_id: newId,
      customer_id: form.customer_id,
      customer_name: cust.business_name,
      date: new Date().toISOString().split('T')[0],
      total_amount: Number(form.total_amount) || 0,
      paid: 0,
      status: "Unpaid",
      notes: form.notes
    };

    const { data, error } = await supabase
      .from('invoices')
      .insert([newInv])
      .select();

    if (data) setInvoices(prev => [data[0], ...prev]);
  };

  const updateAccount = async (newAcc) => {
    const { data, error } = await supabase
      .from('account_settings')
      .update(newAcc)
      .eq('id', account.id)
      .select();
    
    if (data) setAccount(data[0]);
  };

  if (loading) return <div style={{ background: C.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.pM, fontSize: 18 }}>
    🚀 Loading Vyapai CRM...
  </div>;

  const activeNav = NAV.find(n => n.id === tab);

  return <>
    <style>{GFONTS}{`
      @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Poppins',sans-serif;background:${C.bg};}
      ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:rgba(75,111,255,0.45);border-radius:4px;}
      input::placeholder{color:#3D5A9A;}
      select option{background:#111A38;color:#F0F4FF;}
    `}</style>
    <div style={{maxWidth:430,margin:"0 auto",background:C.bg,minHeight:"100vh",display:"flex",flexDirection:"column",fontFamily:"Poppins,sans-serif",color:C.txt}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.bg2},${C.bg3})`,borderBottom:`1px solid ${C.border}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:100}}>
        <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,#2C4FE8,#4B6FFF)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🏪</div>
        <div>
          <div style={{fontWeight:800,fontSize:15,color:C.txt,letterSpacing:0.3,fontFamily:"Poppins"}}>
            Vyapai <span style={{background:`linear-gradient(135deg,#89A4FF,#38BDF8)`,backgroundClip:"text",WebkitBackgroundClip:"text",color:"transparent"}}>CRM</span>
          </div>
          <div style={{fontSize:9,color:"#3D5A9A"}}>{account.business} • {account.city}</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:11,color:C.txt2,fontWeight:500}}>{TAB_LABELS[tab]?.split("/")[0]?.trim()}</div>
          <a href="https://vyapai.in/" target="_blank" rel="noreferrer" style={{background:`linear-gradient(135deg,#2C4FE8,#4B6FFF)`,borderRadius:6,padding:"3px 8px",textDecoration:"none",display:"flex",alignItems:"center",gap:3}}>
            <span style={{fontSize:9,color:"#fff",fontWeight:700}}>vyapai.in</span>
          </a>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:tab==="chat"?"hidden":"auto",padding:tab==="chat"?0:"14px 12px",display:"flex",flexDirection:"column"}}>
        {tab==="dashboard"&&<Dashboard customers={customers} invoices={invoices} account={account} onNav={setTab}/>}
        {tab==="customers"&&<Customers customers={customers} onAdd={addCustomer}/>}
        {tab==="products"&&<Products products={products} onAdd={addProduct}/>}
        {tab==="invoices"&&<Invoices invoices={invoices} customers={customers} onAdd={addInvoice}/>}
        {tab==="diary"&&<DiaryAI/>}
        {tab==="reports"&&<Reports invoices={invoices} customers={customers}/>}
        {tab==="chat"&&<div style={{flex:1,height:"calc(100vh - 118px)"}}><AIChat customers={customers} invoices={invoices} account={account}/></div>}
        {tab==="account"&&<Account account={account} setAccount={updateAccount}/>}
      </div>

      {/* Bottom Nav — fully colored */}
      <div style={{background:C.bg2,borderTop:`1px solid ${C.border}`,display:"flex",position:"sticky",bottom:0,zIndex:100,padding:"2px 0"}}>
        {NAV.map(n=>{
          const active=tab===n.id;
          return <button key={n.id} onClick={()=>setTab(n.id)}
            style={{flex:1,padding:"6px 2px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1,position:"relative"}}>
            <div style={{width:active?34:28,height:active?34:28,borderRadius:active?12:10,
              background:active?`linear-gradient(135deg,${n.grad[0]},${n.grad[1]})`:"rgba(255,255,255,0.05)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:active?16:14,
              transition:"all 0.2s",boxShadow:active?`0 4px 12px ${n.grad[0]}55`:"none"}}>
              {n.icon}
            </div>
            <div style={{fontSize:8,fontWeight:active?700:400,color:active?n.grad[0]:C.txt2,transition:"color 0.2s",letterSpacing:0.2}}>
              {n.label}
            </div>
            <div style={{fontSize:7,color:active?n.grad[1]:"transparent",transition:"color 0.2s"}}>{n.labelHi}</div>
          </button>;
        })}
      </div>
    </div>
  </>;
}
