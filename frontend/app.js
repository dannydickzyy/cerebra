/* Vanilla JavaScript UI; all predictions and database writes run in Python/Streamlit. */
"use strict";
const paths = {
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  predict:'<path d="M6 3v5a5 5 0 0010 0V3M4 3h4m6 0h4M11 13v3a5 5 0 0010 0v-3"/><circle cx="21" cy="10" r="2"/>',
  activity:'<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0112 0v3M16 4a3 3 0 010 6m2 4a5 5 0 013 4v3"/>',
  clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6m-6 4h6"/>',
  gauge:'<path d="M3 18a10 10 0 1118 0M12 13l5-5"/><circle cx="12" cy="13" r="1"/>',
  settings:'<path d="M9 3l-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 016 1c0 2-3 2-3 5m0 3h.01"/>',
  moon:'<path d="M20 14A8.5 8.5 0 0110 4a8.5 8.5 0 1010 10z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12l1 1M5 19l1-1M18 6l1-1"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M16 16l5 5"/>',
  bell:'<path d="M5 17h14l-2-3V9a5 5 0 00-10 0v5zM10 21h4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M4 12h16m-6-6l6 6-6 6"/>',
  arrowUp:'<path d="M5 17L19 3M8 3h11v11"/>',
  warning:'<path d="M10 4a2 2 0 014 0l8 14a2 2 0 01-2 3H4a2 2 0 01-2-3zM12 9v5m0 3h.01"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  trend:'<path d="M3 17l6-6 4 4 8-10m-6 0h6v6"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 10-13h-7z"/>',
  reset:'<path d="M3 4v6h6M4 9a9 9 0 111 10"/>',
  save:'<path d="M4 3h13l4 4v14H3V3zM7 3v6h10V3M7 21v-8h10v8"/>',
  check:'<path d="M4 12l5 5L20 6"/>',
  sparkle:'<path d="M12 3l2 6 6 3-6 2-2 7-3-7-6-2 6-3zM20 2v4m-2-2h4"/>',
  bars:'<path d="M5 20V10m7 10V3m7 17V7"/>',
  book:'<path d="M12 5C8 2 5 3 2 3v16c4 0 6 0 10 2 4-2 6-2 10-2V3c-3 0-6-1-10 2zm0 0v16"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-14 4h2m3 0h2m3 0h1"/>',
  filter:'<path d="M3 6h5m4 0h9M3 12h11m4 0h3M3 18h3m4 0h11M8 3v6m6 0v6m-8 0v6"/>',
  download:'<path d="M12 3v12m-5-5l5 5 5-5M4 16v5h16v-5"/>',
  location:'<path d="M20 9c0 6-8 13-8 13S4 15 4 9a8 8 0 1116 0z"/><circle cx="12" cy="9" r="3"/>',
  collapse:'<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M9 4v16m8-12l-4 4 4 4"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  close:'<path d="M5 5l14 14M19 5L5 19"/>',
  database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.activity}</svg>`;
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n = (v) => Number(v || 0).toLocaleString("en-US");
const pct = (v, decimals = 1) => `${(Number(v) * 100).toFixed(decimals)}%`;
const shortModel = (name) => name.replace(" + SMOTE", "");
const pretty = (value) => ({Govt_job:"Govt job", "never smoked":"Never smoked", "formerly smoked":"Formerly smoked", smokes:"Smokes"}[value] || value);
const today = () => new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
function stored(key, fallback) { try { return localStorage.getItem(`cerebra.${key}`) || fallback; } catch { return fallback; } }
function store(key, value) { try { localStorage.setItem(`cerebra.${key}`, value); } catch { /* Preferences are optional. */ } }
const state = {page:"dashboard", source:"dataset", dark:stored("theme","light")==="dark", collapsed:false,
  operator:stored("operator","Research workspace"), font:stored("font","standard"), mobile:false, notifications:false,
  filter:{query:"",risk:"All",date:"all",from:"",to:"",site:"All",smoking:"All"}, dateOpen:false, extraFilters:false,
  tablePage:1, selected:null, form:{}, result:null, token:null, saved:null, busy:false, error:"", pending:null, pendingAction:null,
  seenResponse:null, modelTab:null, data:null};
let plots = [];
const pages = {
 dashboard:["Health analytics overview","Explore the dataset and your screening activity","dashboard"],
 predict:["Risk prediction","Enter a health profile to explore the trained classifier","predict"],
 breakdown:["Risk factor breakdown","Understand what contributed to an individual model score","activity"],
 population:["Population health","Aggregate screening patterns for research and outreach planning","people"],
 patients:["Screened patients","Every profile assessed and saved in this workspace","clipboard"],
 model:["Model performance","Measured results on the untouched test set","gauge"],
 settings:["Settings","Appearance and workspace preferences","settings"],
 help:["Help & methodology","Using CEREBRA and understanding its limitations","help"]
};
function post(type, details = {}) { window.parent.postMessage({isStreamlitMessage:true,type,...details}, "*"); }
function action(name, payload={}) {
  if (state.busy) return;
  const request_id = crypto.randomUUID();
  state.pending=request_id; state.pendingAction=name; state.busy=true; state.error="";
  render();
  post("streamlit:setComponentValue", {value:{action:name,request_id,...payload}, dataType:"json"});
}
window.addEventListener("message", event => {
  if (event.source !== window.parent || event.data?.type !== "streamlit:render") return;
  state.data = event.data.args;
  const response = state.data.response;
  if (response && response.request_id === state.pending && response.request_id !== state.seenResponse) {
    state.seenResponse=response.request_id; state.busy=false; state.pending=null; state.pendingAction=null;
    if (!response.ok) {state.error=response.error; toast(response.error,true);}
    else if (response.action === "predict") {state.result=response.result;state.token=response.token;state.saved=null;}
    else if (response.action === "save") {state.saved=response.id;toast(`Screening saved as ${response.id}`);}
    else if (response.action === "follow_up") toast("Follow-up status updated.");
    else if (response.action === "refresh") toast("Workspace refreshed.");
  }
  render();
});
post("streamlit:componentReady", {apiVersion:1});
post("streamlit:setFrameHeight", {height:900});
function toast(message,error=false) {const el=document.getElementById("toast");el.textContent=message;el.className=`show${error?" error":""}`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.className="",5000);}
function syncLoadingModal() {
  const modal=document.getElementById("loading-modal");
  const loading=state.busy && ["predict","save"].includes(state.pendingAction);
  if (loading) {
    const saving=state.pendingAction==="save";
    document.getElementById("loading-title").textContent=saving?"Saving patient record…":"Analyzing health profile…";
    document.getElementById("loading-description").textContent=saving
      ?"Saving this screening and its prediction results to your patient records."
      :"Running the prediction model and preparing your risk factor breakdown.";
    modal.oncancel=event=>event.preventDefault();
    if (!modal.open) modal.showModal();
  } else if (modal.open) {
    modal.close();
    // The form is re-rendered during requests, so restore focus to the new DOM.
    const target=document.querySelector(state.error?'#prediction-form button[type="submit"]':'.result-name');
    if (target) {if (!target.matches("button")) target.setAttribute("tabindex","-1");target.focus({preventScroll:true});}
  }
}
function nav(page) {state.page=page;state.mobile=false;state.notifications=false;state.dateOpen=false;render();document.querySelector(".content")?.scrollTo(0,0);}
function riskBadge(risk) {return `<span class="badge-risk ${risk==="Low"?"low":""}">${esc(risk)} risk label</span>`;}
function empty(title,description,ico="clipboard",cta=false) {return `<div class="empty"><div class="empty-icon">${icon(ico)}</div><strong>${esc(title)}</strong><p>${esc(description)}</p>${cta?`<button class="btn btn-primary" data-nav="predict">${icon("plus")} New screening</button>`:""}</div>`;}
function panel(label,title,body,hint="",cls="") {return `<section class="panel ${cls}"><div class="panel-head"><div><div class="eyebrow">${label}</div><h3>${title}</h3></div>${hint?`<div class="panel-hint">${hint}</div>`:""}</div>${body}</section>`;}
function stat(label,value,sub,ico,cls="") {return `<div class="stat ${cls}"><div class="stat-top"><div class="eyebrow">${label}</div><div class="stat-icon">${icon(ico)}</div></div><div class="stat-value">${value}</div><div class="stat-sub">${sub}</div></div>`;}
function gauge(result) {return `<div class="gauge ${result.risk==="Low"?"low":""}" style="--score:${result.score*100}%"><div class="gauge-inner"><strong>${pct(result.score)}</strong><small>MODEL SCORE</small></div></div>`;}
function plot(id,traces,layout={},cls="") {plots.push({id,traces,layout});return `<div id="${id}" class="chart ${cls}" role="img" aria-label="${esc(layout.meta || id.replaceAll("-"," "))}"></div>`;}
function drawPlots() {
  if (!window.Plotly) return;
  const color = state.dark?"#b6abc5":"#787184", line = state.dark?"#322b3f":"#eeecf1";
  plots.forEach(({id,traces,layout}) => {
    if (!document.getElementById(id)) return;
    const base={paper_bgcolor:"rgba(0,0,0,0)",plot_bgcolor:"rgba(0,0,0,0)",font:{family:"Arial, sans-serif",size:10,color},
      margin:{l:42,r:15,t:18,b:35},showlegend:false,hoverlabel:{font:{family:"Arial",size:11}},
      xaxis:{gridcolor:line,zeroline:false,showgrid:false,fixedrange:true,automargin:true,tickfont:{size:10}},
      yaxis:{gridcolor:line,zeroline:false,fixedrange:true,automargin:true,tickfont:{size:10}}};
    const combined={...base,...layout,xaxis:{...base.xaxis,...layout.xaxis},yaxis:{...base.yaxis,...layout.yaxis}};
    Plotly.newPlot(id,traces,combined,{responsive:true,displayModeBar:false,displaylogo:false});
  });
}
function barPlot(id,rows,key="rate",horizontal=false,color="#ed5b20") {
  const values=rows.map(x=>x[key]), labels=rows.map(x=>pretty(x.label));
  return plot(id,[{type:"bar",x:horizontal?values:labels,y:horizontal?labels:values,orientation:horizontal?"h":"v",
    marker:{color:Array.isArray(color)?color:rows.map((_,i)=>i<2?"#f5ba32":color),cornerradius:5},width:horizontal?.46:.42,
    hovertemplate:horizontal?`%{y}: %{x}${key==="rate"?"%":""}<extra></extra>`:`%{x}: %{y}${key==="rate"?"%":""}<extra></extra>`}],
    {xaxis:horizontal?{ticksuffix:key==="rate"?"%":"",showgrid:true}:{},
     yaxis:horizontal?{autorange:"reversed",showgrid:false}:{ticksuffix:key==="rate"?"%":"",rangemode:"tozero"},margin:{l:horizontal?112:40,r:15,t:20,b:35}});
}
function researchNote() {const m=state.data.report.results[state.data.report.selected];return `<div class="research-note">${icon("warning")}<span><strong>Research prototype.</strong> Synthetic-data model · test ROC-AUC ${m.roc_auc.toFixed(3)}. Scores are uncalibrated model outputs, not clinical risk estimates.</span><button data-nav="model">View model evidence ${"↗"}</button></div>`;}
function render() {
  if (!state.data) return;
  plots=[];
  document.body.classList.toggle("dark",state.dark);
  const [title,subtitle]=pages[state.page];
  const model=shortModel(state.data.report.selected);
  const mainNav=Object.entries(pages).slice(0,6).map(([key,[label,,ico]])=>`<button class="nav-item ${state.page===key?"active":""}" data-nav="${key}" title="${label}" ${state.page===key?'aria-current="page"':''}>${icon(ico)}<span>${({dashboard:"Dashboard",predict:"Risk prediction",breakdown:"Risk breakdown",population:"Population health",patients:"Screened patients",model:"Model performance"})[key]}</span></button>`).join("");
  const pageHtml=({dashboard:dashboard,predict:prediction,breakdown:breakdown,population:population,patients:patients,model:modelPage,settings:settings,help:help})[state.page]();
  document.getElementById("app").innerHTML=`<div class="app-shell ${state.font==="large"?"large-text":""}">
    <aside class="sidebar ${state.collapsed?"collapsed":""} ${state.mobile?"mobile-open":""}" aria-label="Main navigation">
      <div class="brand"><div class="brand-mark"><img src="assets/logo.png" alt="CEREBRA brain logo"></div><div class="brand-copy"><div class="brand-name">CEREBRA</div><div class="brand-sub">STROKE ANALYTICS</div></div><button id="collapse-nav" class="collapse-nav" title="Collapse sidebar" aria-label="Collapse sidebar">${icon("collapse")}</button></div>
      <div class="nav-label">WORKSPACE</div><nav>${mainNav}</nav>
      <div class="sidebar-bottom"><div class="model-banner"><img src="assets/logo.png" alt=""><div><div class="mini-label">RESEARCH POWERED</div><strong>Neural Analytics</strong><small>${esc(model)} · SMOTE</small></div></div>
      <div class="sidebar-tools"><button class="nav-item ${state.page==="settings"?"active":""}" data-nav="settings">${icon("settings")}<span>Settings</span></button><button class="nav-item ${state.page==="help"?"active":""}" data-nav="help">${icon("help")}<span>Help & methodology</span></button></div>
      <div class="profile"><div class="avatar">${esc(state.operator.split(/\s+/).map(s=>s[0]).slice(0,2).join("").toUpperCase())}</div><div><strong>${esc(state.operator)}</strong><small>Local screening workspace</small></div></div></div>
    </aside><main class="main"><header class="topbar"><button id="mobile-nav" class="icon-button mobile-nav" aria-label="Toggle navigation">${icon("menu")}</button><div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>
      <div class="top-actions"><form id="global-search" class="search-box">${icon("search")}<input class="form-control" name="q" placeholder="Search patient ID…" aria-label="Search patient ID"></form><button class="icon-button" id="theme-toggle" aria-label="Switch to ${state.dark?"light":"dark"} mode" title="Switch to ${state.dark?"light":"dark"} mode">${icon(state.dark?"sun":"moon")}</button><button class="icon-button notifications-button" id="notifications" aria-label="Notifications">${icon("bell")}<span class="notification-dot"></span></button><button class="btn btn-primary" data-nav="predict">${icon("plus")}<span class="new-label">New screening</span></button></div>
      ${state.notifications?`<div class="notifications"><h3>Workspace updates</h3><p class="small muted">${n(state.data.patients.length)} saved screenings. ${n(state.data.patients.filter(p=>p.risk==="High"&&!p.contacted).length)} high-label records awaiting follow-up.</p><div class="notice mt-3">Model evaluation is available. This prototype has not been clinically validated.</div><button class="link-button" data-nav="model">View model performance ${icon("arrow")}</button></div>`:""}
      </header><div class="content" id="content" tabindex="-1">${pageHtml}<div class="footer-note">CEREBRA · Academic research prototype · Synthetic training data · Local SQLite storage</div></div></main></div>`;
  bind();
  syncLoadingModal();
  requestAnimationFrame(drawPlots);
}

function liveSummary() {
  const rows=state.data.patients.map(p=>({...p.profile,stroke:p.risk==="High"?1:0,score:p.score}));
  function group(key,fn=x=>x) {const groups=new Map();rows.forEach(r=>{const label=fn(r[key]);if(label==null)return;const g=groups.get(label)||{label,count:0,positive:0};g.count++;g.positive+=r.stroke;groups.set(label,g)});return [...groups.values()].map(g=>({...g,rate:g.positive/g.count*100}));}
  return {rows:rows.length,positives:rows.filter(p=>p.stroke).length,prevalence:rows.length?rows.filter(p=>p.stroke).length/rows.length:0,missing_bmi:rows.filter(p=>p.bmi==null).length,
    age:group("age",x=>x<30?"18–29":x<40?"30–39":x<50?"40–49":x<60?"50–59":x<70?"60–69":"70+").sort((a,b)=>a.label.localeCompare(b.label)),
    glucose:group("avg_glucose_level",x=>x<90?"<90":x<126?"90–125":x<161?"126–160":x<201?"161–200":">200"),
    bmi:group("bmi",x=>x==null?null:x<18.5?"Under":x<25?"Normal":x<30?"Overweight":x<35?"Obese I":"Obese II+"),
    smoking:group("smoking_status"),residence:group("Residence_type"),work:group("work_type")};
}
function dashboard() {
  const dataset=state.source==="dataset", data=dataset?state.data.dataset:liveSummary(),report=state.data.report,metrics=report.results[report.selected];
  const context=`<div class="context-row"><span class="source-pill"><span class="dot"></span>${dataset?"SOURCE DATASET · SYNTHETIC RECORDS":"WORKSPACE · SAVED SCREENINGS"}</span><div class="segmented" aria-label="Analytics source"><button data-source="dataset" class="${dataset?"active":""}">Dataset overview</button><button data-source="screenings" class="${!dataset?"active":""}">My screenings</button></div></div>`;
  const stats=`<div class="grid grid-4 mb-section">${stat(dataset?"Dataset records":"Patients screened",n(data.rows),dataset?"Synthetic source records":"Saved in this workspace","people","lavender")}${stat(dataset?"Recorded stroke labels":"Flagged high label",pct(data.prevalence),`${n(data.positives)} ${dataset?"positive labels":"screenings"}`,"warning","peach")}${stat("Model recall",pct(metrics.recall),"Held-out synthetic test set","target","sage")}${stat("ROC–AUC",metrics.roc_auc.toFixed(3),"0.50 ≈ chance discrimination","trend","cream")}</div>`;
  if (!dataset&&!data.rows) return context+researchNote()+stats+panel("Your workspace","Start your screening history",empty("No screenings yet","Run a prediction and save it to populate your live dashboard.","predict",true));
  let throughput;
  if(dataset) {
    throughput=plot("throughput",[{x:data.age.map(r=>r.label),y:data.age.map(r=>r.count),name:"All source records",type:"scatter",mode:"lines",line:{color:"#f57930",width:2.5},fill:"tozeroy",fillcolor:"rgba(245,121,48,.09)"},{x:data.age.map(r=>r.label),y:data.age.map(r=>r.positive),name:"Recorded stroke labels",type:"scatter",mode:"lines",line:{color:"#d94d15",width:2}}],{meta:"Dataset records and positive stroke labels by age band"},"chart-tall");
  } else {
    const days={};state.data.patients.forEach(p=>{let day=p.created_at.slice(0,10);days[day]??={count:0,high:0};days[day].count++;days[day].high+=p.risk==="High"?1:0;});const dates=Object.keys(days).sort();
    throughput=plot("throughput",[{x:dates,y:dates.map(d=>days[d].count),name:"Screenings",type:"scatter",mode:"lines+markers",line:{color:"#f57930",width:2.5},fill:"tozeroy",fillcolor:"rgba(245,121,48,.1)"},{x:dates,y:dates.map(d=>days[d].high),name:"High labels",type:"scatter",mode:"lines+markers",line:{color:"#d94d15",width:2}}],{yaxis:{dtick:1,rangemode:"tozero"}},"chart-tall");
  }
  const imp=report.importance.slice(0,7);
  const importance=plot("global-importance",[{type:"bar",x:imp.map(x=>x.value),y:imp.map(x=>x.label),orientation:"h",marker:{color:imp.map(x=>x.value>=0?"#ed6e29":"#9f91b2"),cornerradius:4},width:.46,hovertemplate:"%{y}: %{x:.4f} ROC-AUC change<extra></extra>"}],{margin:{l:103,r:20,t:15,b:35},xaxis:{showgrid:true,zeroline:true,tickformat:".3f"},yaxis:{autorange:"reversed",showgrid:false}},"chart-tall");
  const basis=dataset?"Recorded stroke rate":"High-label share";
  const smokeColors=["#2e9e44","#f57930","#dc4835","#8060bb"];
  const smokers=plot("smoking",[{type:"pie",labels:data.smoking.map(x=>pretty(x.label)),values:data.smoking.map(x=>x.count),hole:.7,marker:{colors:smokeColors,line:{color:state.dark?"#1d1929":"#fff",width:2}},textinfo:"none",sort:false,hovertemplate:"%{label}<br>%{value:,} records · %{percent}<extra></extra>"}],{margin:{l:0,r:0,t:15,b:10},annotations:[{x:.5,y:.5,xref:"paper",yref:"paper",text:`<b>${data.smoking.length}</b><br><span style="font-size:8px">GROUPS</span>`,showarrow:false,font:{size:22,color:state.dark?"#ede8f4":"#211a2e"}}]},"chart-short");
  const high=state.data.patients.filter(p=>p.risk==="High").slice(0,4);
  const recent=high.length?high.map(patientMini).join("")+`<button class="link-button" data-nav="patients">View all screened patients ${icon("arrowUp")}</button>`:empty("No high-label screenings","Saved high-label results will appear here.","clipboard");
  return context+researchNote()+stats+`<div class="grid grid-major">${panel(dataset?"Dataset composition":"Throughput",dataset?"Records & stroke labels by age":"Screenings & high labels",throughput+`<div class="legend"><span><i style="background:#f57930"></i>${dataset?"All records":"Screenings"}</span><span><i style="background:#d94d15"></i>${dataset?"Positive stroke labels":"High labels"}</span></div>`,dataset?"Actual source counts; no screening dates in CSV":"Screening dates · Manila time")}${panel("Global drivers","Feature importance",importance+`<p class="chart-caption">Permutation importance: change in test ROC-AUC. Near-zero values indicate little measured predictive signal.</p>`,"Held-out sample · 3 repeats")}</div>
    <div class="section-label">Risk factor analysis</div><div class="grid grid-3">${panel("Metabolic","Glucose level vs. label rate",plot("glucose",[{x:data.glucose.map(r=>r.label),y:data.glucose.map(r=>r.rate),type:"scatter",mode:"lines+markers",line:{color:"#5964df",width:2},marker:{color:"#f57930",size:8,line:{color:"white",width:2}},hovertemplate:"%{x}: %{y:.2f}%<extra></extra>"}],{yaxis:{ticksuffix:"%",rangemode:"tozero"}}),`${basis} by glucose bucket (mg/dL)`)}${panel("Anthropometric","BMI vs. label rate",barPlot("bmi",data.bmi),`${basis} · ${n(data.missing_bmi)} missing BMI excluded`)}${panel("Lifestyle","Smoking status",smokers+`<div class="legend">${data.smoking.map((r,i)=>`<span><i style="background:${smokeColors[i]}"></i>${esc(pretty(r.label))} ${pct(r.count/data.rows,0)}</span>`).join("")}</div>`,"Population composition")}</div>
    <div class="grid grid-major mt-4">${panel("Demographic","Label rate by age band",barPlot("age-risk",data.age),basis)}${panel("Workspace attention","Recent high-label screenings",recent,"Saved records only")}</div>
    <div class="grid grid-2 mt-4">${panel("Geographic",dataset?"Recorded stroke labels · Urban vs. Rural":"High labels · Urban vs. Rural",barPlot("residence",data.residence,"positive"),"Actual record counts")}${panel("Occupational",dataset?"Recorded stroke labels by work type":"High labels by work type",barPlot("work",data.work,"positive",true),"Actual record counts")}</div>`;
}
function patientMini(p) {return `<button class="patient-mini ${state.selected===p.id?"active":""}" data-patient="${esc(p.id)}"><span class="avatar">${esc(p.profile.name.split(/\s+/).map(s=>s[0]).slice(0,2).join(""))}</span><span><strong>${esc(p.profile.name)}</strong><small>${esc(p.id)}</small></span><span class="score" style="color:${p.risk==="Low"?"var(--green)":"var(--orange)"}">${pct(p.score,0)}</span></button>`;}

function inputField(key,label,type="text",attrs="",placeholder="") {return `<div class="form-group"><label class="form-label" for="${key}">${label}</label><input class="form-control" id="${key}" name="${key}" type="${type}" value="${esc(state.form[key]??"")}" ${attrs} placeholder="${placeholder}"></div>`;}
function selectField(key,label,values) {return `<div class="form-group"><label class="form-label" for="${key}">${label}</label><select id="${key}" name="${key}" class="form-select" required><option value="" disabled ${!state.form[key]?"selected":""}>Select ${label.toLowerCase()}…</option>${values.map(v=>`<option value="${esc(v)}" ${state.form[key]===v?"selected":""}>${esc(pretty(v))}</option>`).join("")}</select></div>`;}
function binaryField(key,label) {return `<div class="form-group"><div class="form-label" id="label-${key}">${label}</div><div class="binary" role="radiogroup" aria-labelledby="label-${key}">${["0","1"].map((v,i)=>`<label><input name="${key}" type="radio" value="${v}" required ${String(state.form[key])===v?"checked":""}><span>${i?"Yes":"No"}</span></label>`).join("")}</div></div>`;}
function prediction() {
  return researchNote()+`<div class="grid prediction-grid"><section class="panel"><div class="form-intro"><div class="eyebrow">${icon("predict")} &nbsp; Risk prediction module</div><h2>Patient health profile</h2><p>Enter a profile to run the trained classifier. Review the model score and its contributing factors, then save the screening to your workspace.</p></div><form id="prediction-form">
      ${inputField("name","Participant name / research alias","text",'maxlength="100"',"e.g. Participant A")}
      <div class="row"><div class="col-6">${inputField("age","Age (years)","number",'required min="18" max="90" step="0.1"',"18–90")}</div><div class="col-6">${selectField("gender","Gender",["Female","Male"])}</div></div>
      <div class="row"><div class="col-6">${inputField("avg_glucose_level","Avg. glucose (mg/dL)","number",'required min="70.01" max="250" step="0.01"',"70.01–250")}</div><div class="col-6">${inputField("bmi","Body mass index (BMI)","number",`${state.form.bmi_missing?"disabled":"required"} min="15" max="40" step="0.1"`,"15–40")}<label class="form-check-label mb-3"><input class="form-check-input me-2" type="checkbox" id="bmi_missing" name="bmi_missing" ${state.form.bmi_missing?"checked":""}>BMI unavailable</label></div></div>
      <div class="row"><div class="col-6">${binaryField("hypertension","Hypertension")}</div><div class="col-6">${binaryField("heart_disease","Heart disease")}</div></div>
      <div class="row"><div class="col-6">${binaryField("married","Ever married")}</div><div class="col-6">${selectField("smoking_status","Smoking status",["never smoked","formerly smoked","smokes","Unknown"])}</div></div>
      <div class="row"><div class="col-6">${selectField("work_type","Work type",["Private","Self-employed","Govt_job","Children"])}</div><div class="col-6">${selectField("Residence_type","Residence type",["Urban","Rural"])}</div></div>
      ${inputField("site","Screening site (optional)","text",'maxlength="100"',"e.g. Campus research clinic")}
      <div id="form-error">${state.error?`<div class="form-error" role="alert">${esc(state.error)}</div>`:""}</div><div class="d-flex gap-2 flex-wrap mt-4"><button class="btn btn-primary" type="submit" ${state.busy?"disabled":""}>${state.busy?'<span class="spinner"></span>':icon("bolt")}${state.busy?"Processing…":"Predict stroke risk"}</button><button class="btn btn-outline-secondary" type="button" id="reset-form" ${state.busy?"disabled":""}>${icon("reset")} Reset</button></div>
      <p class="chart-caption mt-4">Supported input ranges follow the supplied dataset. Missing BMI uses the training median (${state.data.report.bmi_training_median.toFixed(1)}). Gender categories reflect the source data. Name and site are not model features.</p>
    </form></section><div class="stack" id="prediction-results">${predictionResults()}</div></div>`;
}
function explanationChart(result,id="contributions") {const bars=result.explanation.contributions;return plot(id,[{x:bars.map(b=>b.value*100),y:bars.map(b=>b.label),type:"bar",orientation:"h",width:.5,marker:{color:bars.map(b=>b.value>=0?"#ed6528":"#8974b0"),cornerradius:4},hovertemplate:"%{y}: %{x:+.2f} percentage points<extra></extra>"}],{margin:{l:105,r:25,t:15,b:30},xaxis:{ticksuffix:" pp",zeroline:true,zerolinecolor:state.dark?"#6c6279":"#c7bfce",showgrid:true},yaxis:{autorange:"reversed",showgrid:false}},"chart-tall");}
function explanationNote(result) {return `<div class="notice">Reference score <strong>${pct(result.explanation.baseline)}</strong> + feature contributions = <strong>${pct(result.score)}</strong>.<br>Orange increases and purple decreases the model score relative to ${result.explanation.reference_count} training reference profiles. Effects are model explanations, not causal health claims.</div>`;}
function predictionResults() {
  const r=state.result;
  const resultBody=r?`<div class="result-body">${gauge(r)}${riskBadge(r.risk)}<h2 class="result-name">${esc(r.profile.name)}</h2><p>${r.risk==="High"?"This model score is at or above the experimental 50% cutoff.":"This model score is below the experimental 50% cutoff."} The label does not establish or rule out medical risk.</p><div class="prediction-details">${esc(shortModel(r.model))} · SMOTE · threshold 50%</div><button id="save-screening" class="btn ${state.saved?"btn-outline-secondary":"btn-primary"}" ${state.saved||state.busy?"disabled":""}>${icon(state.saved?"check":"save")}${state.saved?`Saved as ${esc(state.saved)}`:state.busy?"Saving…":"Save to screened patients"}</button>${state.saved?`<button class="link-button" data-nav="patients">Open screened patients ${icon("arrow")}</button>`:""}</div>`:empty("Your result will appear here","Complete the profile and select Predict stroke risk to run the trained model.","sparkle");
  return panel("Prediction result",r?"Experimental model output":"Ready when you are",resultBody)+panel("Risk factor breakdown","What drove this result",r?explanationChart(r)+explanationNote(r):empty("An explanation for every score","A signed contribution chart appears after a prediction is run.","bars"))+
    panel("Model context","Know what the score means",`<div class="mini-row"><span>Training source</span><b>50,000 synthetic records</b></div><div class="mini-row"><span>Class balancing</span><b>Training-only SMOTE</b></div><div class="mini-row"><span>Label threshold</span><b>50% model score</b></div><div class="mini-row"><span>Clinical validation</span><b>Not established</b></div><div class="notice orange mt-3">This system is for academic research. Model scores are not calibrated estimates of a person's likelihood of stroke. Do not use them to make clinical decisions.</div>`);
}

function breakdown() {
  const rows=state.data.patients;
  if (!rows.length) return researchNote()+panel("Individual explanation","Risk factor breakdown",empty("No saved screenings yet","Save a prediction to compare individual profiles and view their model explanations.","activity",true));
  const selected=rows.find(p=>p.id===state.selected)||rows[0];state.selected=selected.id;const p=selected.profile;
  return researchNote()+`<div class="grid breakdown-layout"><section class="panel"><div class="eyebrow">Select patient</div><p class="small muted mb-3">${n(rows.length)} saved screenings</p><div class="patient-list">${rows.map(patientMini).join("")}</div></section><div class="stack">${panel("Individual explanation","",`<div class="patient-overview">${gauge(selected)}<div class="patient-overview-info"><div class="d-flex align-items-center flex-wrap gap-2"><h2>${esc(p.name)}</h2>${riskBadge(selected.risk)}</div><p class="small muted mt-2">${esc(selected.id)} · age ${p.age}</p><div class="detail-grid">${[["Glucose",`${p.avg_glucose_level} mg/dL`],["BMI",p.bmi??"Missing · imputed"],["Smoking",pretty(p.smoking_status)],["Hypertension",p.hypertension?"Yes":"No"],["Heart disease",p.heart_disease?"Yes":"No"],["Ever married",p.ever_married],["Work type",pretty(p.work_type)],["Residence",p.Residence_type],["Screened",formatDate(selected.created_at)],["Gender",p.gender],["Site",p.site],["Model version",selected.model_version]].map(([k,v])=>`<div><label>${k}</label><p>${esc(v)}</p></div>`).join("")}</div></div></div>`)}${panel("Risk factor contribution","Which factors drove this model score",explanationChart(selected,"saved-contributions")+explanationNote(selected),esc(shortModel(selected.model)))}<div class="panel d-flex justify-content-between align-items-center gap-3 flex-wrap"><div><h3>Follow-up status</h3><p class="small muted mt-2">${selected.contacted?"Marked as contacted":"Not yet marked as contacted"}</p></div><button class="btn btn-outline-secondary" id="follow-up" data-id="${esc(selected.id)}" data-contacted="${!selected.contacted}" ${state.busy?"disabled":""}>${icon(selected.contacted?"reset":"check")}${selected.contacted?"Mark pending":"Mark as contacted"}</button></div></div></div>`;
}
function formatDate(date) {return new Date(date).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric",timeZone:"Asia/Manila"});}
function filteredPatients() {
  const f=state.filter,q=f.query.toLowerCase().trim();
  let from=f.from,to=f.to;
  if(f.date==="today")from=to=today();
  if(f.date==="week"){const day=new Date(`${today()}T12:00:00+08:00`);day.setUTCDate(day.getUTCDate()-6);from=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).format(day);to=today();}
  return state.data.patients.filter(p=>{
    const date=p.created_at.slice(0,10);
    return (!q||`${p.profile.name} ${p.id}`.toLowerCase().includes(q))&&(f.risk==="All"||p.risk===f.risk)&&
      (f.date==="all"||((!from||date>=from)&&(!to||date<=to)))&&(f.site==="All"||p.profile.site===f.site)&&
      (f.smoking==="All"||p.profile.smoking_status===f.smoking);
  });
}
function patients() {
  const rows=filteredPatients(),f=state.filter,sites=[...new Set(state.data.patients.map(p=>p.profile.site))];
  const dateLabel={all:"Date range",today:"Today",week:"Last 7 days",custom:"Custom range"}[f.date];
  return `<section class="panel table-panel"><div class="table-toolbar"><div><div class="eyebrow mb-2">Screened patients</div><h2 id="record-count">${n(rows.length)} records</h2></div><div class="table-tools"><div class="search-box">${icon("search")}<input class="form-control" id="patient-search" value="${esc(f.query)}" placeholder="Name or patient ID…" aria-label="Filter by name or patient ID"></div><div class="segmented" aria-label="Risk filter">${["All","High","Low"].map(r=>`<button class="${f.risk===r?"active":""}" data-risk="${r}">${r==="All"?"All":`${r} risk`}</button>`).join("")}</div><div class="date-filter"><button class="btn btn-outline-secondary" id="date-toggle" aria-expanded="${state.dateOpen}">${icon("calendar")}${dateLabel}</button>${state.dateOpen?`<div class="date-popover"><div class="eyebrow">Quick select</div><div class="quick-dates">${[["all","All time"],["today","Today"],["week","Last 7 days"]].map(([k,v])=>`<button class="${f.date===k?"active":""}" data-date="${k}">${v}</button>`).join("")}</div><div class="eyebrow">Custom range</div><form id="date-form"><div class="row g-2 mb-3"><div class="col-6"><label class="form-label" for="date-from">From</label><input type="date" class="form-control" id="date-from" name="from" value="${esc(f.from)}" required></div><div class="col-6"><label class="form-label" for="date-to">To</label><input type="date" class="form-control" id="date-to" name="to" value="${esc(f.to)}" required></div></div><button class="btn btn-primary w-100" type="submit">Apply</button></form></div>`:""}</div><button class="icon-button" id="extra-filters" aria-label="More filters" aria-expanded="${state.extraFilters}">${icon("filter")}</button><button class="icon-button" id="export-csv" aria-label="Export filtered records as CSV" title="Export filtered records as CSV">${icon("download")}</button></div></div>
    ${state.extraFilters?`<div class="filter-options"><label>Site<select id="site-filter" class="form-select">${["All",...sites].map(s=>`<option ${f.site===s?"selected":""}>${esc(s)}</option>`).join("")}</select></label><label>Smoking<select id="smoking-filter" class="form-select">${["All","never smoked","formerly smoked","smokes","Unknown"].map(s=>`<option value="${s}" ${f.smoking===s?"selected":""}>${pretty(s)}</option>`).join("")}</select></label><button class="btn btn-outline-secondary" id="clear-filters">Clear filters</button></div>`:""}
    <div id="patients-table">${patientTable(rows)}</div></section><p class="chart-caption mt-3">Select a record to view its saved model explanation. Labels describe the model cutoff; they are not diagnoses. Screening dates use Asia/Manila.</p>`;
}
function patientTable(rows) {
  const pages=Math.max(1,Math.ceil(rows.length/25));state.tablePage=Math.min(state.tablePage,pages);
  const shown=rows.slice((state.tablePage-1)*25,state.tablePage*25);
  return rows.length?`<div class="table-responsive"><table class="records-table"><thead><tr>${["Patient","Age","Glucose","BMI","Conditions","Smoking","Married","Work type","Residence","Score","Risk label"].map(x=>`<th scope="col">${x}</th>`).join("")}</tr></thead><tbody>${shown.map(p=>`<tr tabindex="0" data-patient="${esc(p.id)}" aria-label="View ${esc(p.profile.name)}"><td><div class="patient-name">${esc(p.profile.name)}</div><div class="patient-id">${esc(p.id)}</div><div class="record-date">${formatDate(p.created_at)}</div></td><td>${p.profile.age}</td><td>${p.profile.avg_glucose_level}<span class="micro muted"> mg/dL</span></td><td>${p.profile.bmi??"—"}</td><td>${p.profile.hypertension?'<span class="condition">● Hypertension</span>':""}${p.profile.heart_disease?'<span class="condition heart">● Heart disease</span>':""}${!p.profile.hypertension&&!p.profile.heart_disease?'<span class="condition none">● None reported</span>':""}</td><td>${esc(pretty(p.profile.smoking_status))}</td><td>${p.profile.ever_married}</td><td>${esc(pretty(p.profile.work_type))}</td><td>${p.profile.Residence_type}</td><td class="score-cell ${p.risk==="Low"?"low":""}">${pct(p.score,0)}</td><td>${riskBadge(p.risk)}</td></tr>`).join("")}</tbody></table></div><div class="table-footer"><span>Showing ${(state.tablePage-1)*25+1}–${Math.min(state.tablePage*25,rows.length)} of ${n(rows.length)} matched records · ${n(state.data.patients.length)} total</span><div class="d-flex gap-2 align-items-center">${pages>1?`<button class="btn btn-outline-secondary" data-page-step="-1" ${state.tablePage===1?"disabled":""}>Previous</button><span>${state.tablePage} / ${pages}</span><button class="btn btn-outline-secondary" data-page-step="1" ${state.tablePage===pages?"disabled":""}>Next</button>`:""}<span class="micro">EXPERIMENTAL · THRESHOLD 50%</span></div></div>`:empty(state.data.patients.length?"No matching screenings":"Your screening history starts here",state.data.patients.length?"Try another name, risk label, or date range.":"Save a prediction to create your first record. Records remain available after restarting the app.","clipboard",!state.data.patients.length);
}

function population() {
  const rows=state.data.patients,high=rows.filter(p=>p.risk==="High"),pending=high.filter(p=>!p.contacted),sites=[...new Set(rows.map(p=>p.profile.site))];
  const avg=high.length?high.reduce((a,p)=>a+p.profile.avg_glucose_level,0)/high.length:null;
  const cards=`<div class="grid grid-4 mb-section">${stat("High-label share",rows.length?pct(high.length/rows.length):"—",`${high.length} of ${rows.length} saved screenings`,"target","peach")}${stat("Screening sites",n(sites.length),"Sites entered with saved records","location","lavender")}${stat("Flagged today",n(high.filter(p=>p.created_at.startsWith(today())).length),"High labels · Asia/Manila","warning","cream")}${stat("Avg. glucose · high labels",avg?`${avg.toFixed(1)}<span style="font-size:13px"> mg/dL</span>`:"—","Saved high-label cohort","activity","sage")}</div>`;
  if(!rows.length)return researchNote()+cards+panel("Outreach planning","Build a view of your population",empty("No population records yet","Save screenings with a site name to see actual site-level summaries here. No site data is inferred from the synthetic dataset.","people",true));
  const grouped=sites.map(site=>{let data=rows.filter(p=>p.profile.site===site);return{site,count:data.length,high:data.filter(p=>p.risk==="High").length}}).sort((a,b)=>b.high/b.count-a.high/a.count);
  const siteBody=grouped.map((s,i)=>`<div class="site-row"><div class="site-labels"><div><span class="site-index">${i+1}</span>${esc(s.site)}</div><small>${n(s.count)} screened · <strong style="color:var(--orange)">${pct(s.high/s.count)} high label</strong></small></div><div class="site-track"><span style="width:${s.high/s.count*100}%"></span></div></div>`).join("")+`<p class="chart-caption mt-3">Descriptive counts of saved screenings. Site comparisons are not population prevalence estimates and may reflect small or unequal samples.</p>`;
  const live=liveSummary();
  return researchNote()+cards+panel("Outreach planning · by site","Screening activity across your sites",siteBody,`${sites.length} sites`)+`<div class="grid grid-3 mt-4">${panel("Follow-up","Follow-up backlog",`<div class="stat-value" style="color:var(--orange)">${n(pending.length)}</div><p class="small muted">High-label records not yet marked as contacted.</p><button class="link-button" id="view-pending">Review records ${icon("arrow")}</button>`)}${panel("Cohort context","Hypertension among high labels",`<div class="stat-value">${high.length?pct(high.filter(p=>p.profile.hypertension).length/high.length):"—"}</div><p class="small muted">${high.filter(p=>p.profile.hypertension).length} of ${high.length} saved high-label profiles.</p>`)}${panel("Source transparency","Workspace population",`<div class="notice">This view uses <strong>${rows.length} saved screenings</strong>. The 50,000 synthetic source records are available separately on the dashboard.</div>`)}</div><div class="grid grid-2 mt-4">${panel("Demographic","High-label share by age",barPlot("pop-age",live.age))}${panel("Geographic","High labels by residence",barPlot("pop-residence",live.residence,"positive"))}</div>`;
}

function modelPage() {
  const r=state.data.report,key=state.modelTab&&r.results[state.modelTab]?state.modelTab:r.selected,m=r.results[key],cm=m.cm;
  const stats=`<div class="grid grid-4 mb-section">${stat("Accuracy",pct(m.accuracy),"Overall test correctness","target")}${stat("Precision",pct(m.precision),"Positive labels among flagged records","predict")}${stat("Recall",pct(m.recall),"Positive test labels detected","people")}${stat("F1-score",m.f1.toFixed(3),"Balance of precision and recall","activity")}</div>`;
  const dimensions=["Accuracy","Precision","Recall","F1-score","ROC-AUC"],keys=["accuracy","precision","recall","f1","roc_auc"],colors=["#9b8aa9","#7051a0","#f47830"];
  const names=Object.keys(r.validation);
  const radar=plot("model-radar",names.map((name,i)=>({type:"scatterpolar",r:[...keys.map(k=>r.results[name][k]*100),r.results[name].accuracy*100],theta:[...dimensions,dimensions[0]],fill:"toself",name:shortModel(name),line:{color:colors[i],width:2},opacity:.8,hovertemplate:"%{theta}: %{r:.1f}%<extra>%{fullData.name}</extra>"})),{polar:{bgcolor:"rgba(0,0,0,0)",radialaxis:{visible:true,range:[0,100],tickvals:[25,50,75,100],tickfont:{size:8},gridcolor:state.dark?"#3b324a":"#eae6ee"},angularaxis:{gridcolor:state.dark?"#3b324a":"#eae6ee",tickfont:{size:10}}},margin:{l:55,r:55,t:35,b:30}},"chart-tall");
  const matrix=`<div class="cm-grid">${[["True positive",cm.tp,"Correctly flagged",false],["False negative",cm.fn,"Missed positive labels",true],["False positive",cm.fp,"False alarms",true],["True negative",cm.tn,"Correctly unflagged",false]].map(([label,value,note,error])=>`<div class="cm-cell ${error?"error":""}"><label>${label}</label><strong>${n(value)}</strong><small>${note}</small></div>`).join("")}</div><p class="chart-caption">${n(r.test_count)} test records · ${n(r.test_distribution["1"])} positive labels · fixed 50% threshold. Recall target ≥ 70%: <strong>${m.recall>=.7?"met on this synthetic test set":"not met"}</strong>.</p>`;
  const compare=`<div class="table-responsive"><table class="metric-table"><thead><tr><th>Candidate</th>${["Accuracy","Precision","Recall","F1","ROC-AUC","Avg. precision"].map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${Object.entries(r.results).map(([name,v])=>`<tr class="${name===r.selected?"selected":""}"><td>${esc(name)}${name===r.selected?'<div class="micro" style="color:var(--orange)">ACTIVE RESEARCH MODEL</div>':""}</td>${["accuracy","precision","recall","f1","roc_auc","average_precision"].map(k=>`<td>${k==="accuracy"||k==="precision"||k==="recall"?pct(v[k]):v[k].toFixed(3)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  return researchNote()+`<div class="context-row"><span class="source-pill"><span class="dot"></span>HELD-OUT TEST SET · ${n(r.test_count)} RECORDS</span><label class="d-flex align-items-center gap-2 small muted">Inspect model<select class="form-select" id="model-select">${Object.keys(r.results).map(name=>`<option ${key===name?"selected":""}>${esc(name)}</option>`).join("")}</select></label></div>`+stats+`<div class="grid grid-2">${panel("Benchmark","Candidate model comparison",radar+`<div class="legend justify-content-center">${names.map((name,i)=>`<span><i style="background:${colors[i]}"></i>${esc(shortModel(name))}</span>`).join("")}</div>`,"All candidates trained with SMOTE")}${panel("Confusion matrix",`${esc(shortModel(key))} · test set`,matrix,"Measured classifications")}</div><div class="mt-4">${panel("Measured evidence","Full experiment results",compare,"Includes an unbalanced baseline")}</div><div class="grid grid-2 mt-4">${panel("Discrimination","ROC curve · active model",plot("roc",[{x:r.roc_curve.x,y:r.roc_curve.y,type:"scatter",mode:"lines",line:{color:"#ec6726",width:2.5},name:"Active model"},{x:[0,1],y:[0,1],type:"scatter",mode:"lines",line:{color:"#a99db6",dash:"dot"},name:"Chance"}],{xaxis:{title:{text:"False positive rate"},range:[0,1],showgrid:true},yaxis:{title:{text:"True positive rate"},range:[0,1]}}),`ROC-AUC ${r.results[r.selected].roc_auc.toFixed(3)}`)}${panel("Minority-class performance","Precision–recall curve · active model",plot("pr",[{x:r.pr_curve.x,y:r.pr_curve.y,type:"scatter",mode:"lines",line:{color:"#8261bd",width:2},name:"Active model"},{x:[0,1],y:[r.test_distribution["1"]/r.test_count,r.test_distribution["1"]/r.test_count],type:"scatter",mode:"lines",line:{color:"#a99db6",dash:"dot"},name:"Prevalence baseline"}],{xaxis:{title:{text:"Recall"},range:[0,1],showgrid:true},yaxis:{title:{text:"Precision"},range:[0,1]}}),`Average precision ${r.results[r.selected].average_precision.toFixed(3)}`)}</div><div class="mt-4">${panel("Reproducibility","Training & evaluation protocol",`<div class="grid grid-2"><div>${[["Training / test split",`${n(r.train_count)} / ${n(r.test_count)}`],["Validation selection",`${n(r.validation_count)} rows within training`],["Training class counts",`${n(r.train_distribution["0"])} negative / ${n(r.train_distribution["1"])} positive`],["After training-only SMOTE",`${n(r.smote_distribution["0"])} / ${n(r.smote_distribution["1"])}`],["Training BMI median",r.bmi_training_median.toFixed(1)]].map(([k,v])=>`<div class="mini-row"><span>${k}</span><b>${v}</b></div>`).join("")}</div><div class="notice"><strong>${esc(r.selected)}</strong> was selected using validation recall, with F1 and ROC-AUC as tie-breakers. Test results were measured afterward.<br><br>Median imputation, scaling, and one-hot encoding are fitted on training rows. SMOTE never touches validation or test rows. Plain SMOTE can produce fractional encoded categories, as noted in your PDF; this remains an exploratory limitation.<br><br>Model version: <strong>${r.version}</strong></div></div><button class="btn btn-outline-secondary mt-3" id="export-report">${icon("download")} Download evaluation JSON</button>`)}</div>`;
}
function settings() {return `<div class="settings-wrap stack">${panel("Appearance","Make the workspace yours",`<div class="settings-row"><div><h3>Color theme</h3><p>Switch between the light and dark designs.</p></div><div class="segmented"><button data-theme="light" class="${!state.dark?"active":""}">${icon("sun")} Light</button><button data-theme="dark" class="${state.dark?"active":""}">${icon("moon")} Dark</button></div></div><div class="settings-row"><div><h3>Text size</h3><p>Increase text size for easier reading.</p></div><div class="segmented"><button data-font="standard" class="${state.font==="standard"?"active":""}">Standard</button><button data-font="large" class="${state.font==="large"?"active":""}">Large</button></div></div>`)}${panel("Workspace","Display preferences",`<form id="settings-form"><div class="form-group"><label class="form-label" for="operator">Workspace display name</label><input class="form-control" id="operator" name="operator" value="${esc(state.operator)}" maxlength="40" required></div><p class="small muted mb-3">This is a display preference, not a user account or authentication.</p><button class="btn btn-primary">Save preferences</button></form>`)}${panel("Data & storage","Local records",`<div class="mini-row"><span>Saved screenings</span><b>${n(state.data.patients.length)}</b></div><div class="mini-row"><span>Database</span><b>SQLite · local workspace</b></div><div class="mini-row"><span>Timezone</span><b>Asia/Manila</b></div><div class="notice mt-3">Clinical inputs and saved explanations are stored in the local database. Browser storage contains appearance preferences only. This local prototype has no account system; use research aliases for demonstrations.</div><div class="d-flex gap-2 mt-3"><button class="btn btn-outline-secondary" id="refresh-data" ${state.busy?"disabled":""}>${icon("reset")} Refresh records</button><button class="btn btn-outline-secondary" data-nav="patients">Open records</button></div>`)}</div>`;}
function help() {return `<div class="settings-wrap stack">${panel("Getting started","From profile to insight",`<div class="notice"><strong>1. New screening</strong><br>Complete all model fields. Use Unknown for unavailable smoking status and BMI unavailable when it is missing.<br><br><strong>2. Predict & review</strong><br>The Python classifier returns a model score, a threshold label, and signed feature contributions.<br><br><strong>3. Save the screening</strong><br>Saving writes the scored profile and its model version to SQLite. Refreshing or restarting does not remove it.<br><br><strong>4. Explore the population</strong><br>Search and filter saved records, export CSV, review individual explanations, and mark follow-up status.</div>`)}${panel("Data source","Synthetic Stroke Prediction Dataset",`<p class="small muted" style="line-height:1.9">Mohammed Borhan Uddin (2025), Mendeley Data, version 1. ${n(state.data.dataset.rows)} synthetic records; ${n(state.data.dataset.positives)} positive labels; ${n(state.data.dataset.missing_bmi)} missing BMI values. Provided under CC BY 4.0 according to the proposal.</p><a class="link-button" href="https://doi.org/10.17632/s2nh6fm925.1" target="_blank" rel="noopener noreferrer">View dataset attribution ${icon("arrowUp")}</a><div class="notice mt-3">The dataset contains no patient names, screening dates, or screening sites. The app does not fabricate these for the source population.</div>`)}${panel("Interpretation","Read model outputs carefully",`<div class="notice orange">${state.data.report.limitations.map(x=>`<p class="mb-3">${esc(x)}</p>`).join("")}</div><p class="chart-caption mt-3">The proposal's recall target is 70%; model performance reports the measured result even when that target is not achieved. A high accuracy alone can be misleading in this imbalanced dataset.</p>`)}${panel("Technology","Built around your requested stack",`<div class="notice">Streamlit hosts the app and Python model. HTML, CSS, Bootstrap, and vanilla JavaScript provide the interface. Pandas and NumPy prepare the data; scikit-learn, imbalanced-learn SMOTE, and XGBoost train the models. SQLite stores saved screenings.</div>`)}</div>`;}

function captureForm() {
  const form=document.getElementById("prediction-form");if(!form)return;
  const f=new FormData(form);state.form=Object.fromEntries(f.entries());state.form.bmi_missing=f.has("bmi_missing");
}
function bind() {
  document.querySelectorAll("[data-nav]").forEach(el=>el.onclick=()=>nav(el.dataset.nav));
  document.getElementById("theme-toggle").onclick=()=>{state.dark=!state.dark;store("theme",state.dark?"dark":"light");render()};
  document.getElementById("notifications").onclick=()=>{state.notifications=!state.notifications;render()};
  document.getElementById("collapse-nav").onclick=()=>{state.collapsed=!state.collapsed;render()};
  document.getElementById("mobile-nav").onclick=()=>{state.mobile=!state.mobile;render()};
  document.getElementById("global-search").onsubmit=e=>{e.preventDefault();state.filter.query=new FormData(e.target).get("q");state.tablePage=1;nav("patients")};
  document.querySelectorAll("[data-source]").forEach(el=>el.onclick=()=>{state.source=el.dataset.source;render()});
  bindPatients();
  const form=document.getElementById("prediction-form");
  if(form){
    const invalidate=()=>{captureForm();state.result=null;state.token=null;state.saved=null;state.error="";plots=[];document.getElementById("prediction-results").innerHTML=predictionResults();document.getElementById("form-error").innerHTML="";};
    form.addEventListener("input",invalidate);
    document.getElementById("bmi_missing").onchange=()=>{captureForm();const bmi=document.getElementById("bmi");bmi.disabled=state.form.bmi_missing;bmi.required=!state.form.bmi_missing;};
    form.onsubmit=e=>{e.preventDefault();if(state.busy)return;captureForm();const f=state.form;action("predict",{profile:{name:f.name,site:f.site,age:Number(f.age),gender:f.gender,avg_glucose_level:Number(f.avg_glucose_level),bmi:f.bmi_missing?null:Number(f.bmi),hypertension:Number(f.hypertension),heart_disease:Number(f.heart_disease),ever_married:f.married==="1"?"Yes":"No",smoking_status:f.smoking_status,work_type:f.work_type,Residence_type:f.Residence_type}});};
    document.getElementById("reset-form").onclick=()=>{state.form={};state.result=null;state.token=null;state.saved=null;state.error="";render();};
    document.getElementById("save-screening")?.addEventListener("click",()=>action("save",{token:state.token}));
    if(state.busy)form.querySelectorAll("input,select").forEach(el=>el.disabled=true);
  }
  document.getElementById("follow-up")?.addEventListener("click",e=>{const el=e.currentTarget;action("follow_up",{id:el.dataset.id,contacted:el.dataset.contacted==="true"});});
  document.getElementById("patient-search")?.addEventListener("input",e=>{state.filter.query=e.target.value;state.tablePage=1;updatePatientTable();});
  document.querySelectorAll("[data-risk]").forEach(el=>el.onclick=()=>{state.filter.risk=el.dataset.risk;state.tablePage=1;render()});
  document.getElementById("date-toggle")?.addEventListener("click",()=>{state.dateOpen=!state.dateOpen;render()});
  document.querySelectorAll("[data-date]").forEach(el=>el.onclick=()=>{state.filter.date=el.dataset.date;state.dateOpen=false;state.tablePage=1;render()});
  document.getElementById("date-form")?.addEventListener("submit",e=>{e.preventDefault();const d=new FormData(e.target);if(d.get("from")>d.get("to")){toast("The start date must be before the end date.",true);return;}state.filter.from=d.get("from");state.filter.to=d.get("to");state.filter.date="custom";state.dateOpen=false;state.tablePage=1;render();});
  document.getElementById("extra-filters")?.addEventListener("click",()=>{state.extraFilters=!state.extraFilters;render()});
  ["site","smoking"].forEach(k=>document.getElementById(`${k}-filter`)?.addEventListener("change",e=>{state.filter[k]=e.target.value;state.tablePage=1;updatePatientTable()}));
  document.getElementById("clear-filters")?.addEventListener("click",()=>{state.filter={query:"",risk:"All",date:"all",from:"",to:"",site:"All",smoking:"All"};state.tablePage=1;render()});
  document.getElementById("export-csv")?.addEventListener("click",exportCSV);
  document.getElementById("model-select")?.addEventListener("change",e=>{state.modelTab=e.target.value;render()});
  document.getElementById("export-report")?.addEventListener("click",()=>download("cerebra-evaluation.json",JSON.stringify(state.data.report,null,2),"application/json"));
  document.getElementById("view-pending")?.addEventListener("click",()=>{state.filter.risk="High";state.filter.query="";state.filter.date="all";state.filter.site="All";state.filter.smoking="All";nav("patients")});
  document.querySelectorAll("[data-theme]").forEach(el=>el.onclick=()=>{state.dark=el.dataset.theme==="dark";store("theme",el.dataset.theme);render()});
  document.querySelectorAll("[data-font]").forEach(el=>el.onclick=()=>{state.font=el.dataset.font;store("font",state.font);render()});
  document.getElementById("settings-form")?.addEventListener("submit",e=>{e.preventDefault();state.operator=String(new FormData(e.target).get("operator")).trim()||"Research workspace";store("operator",state.operator);render();toast("Preferences saved.")});
  document.getElementById("refresh-data")?.addEventListener("click",()=>action("refresh"));
}
function bindPatients() {
  document.querySelectorAll("[data-patient]").forEach(el=>{el.onclick=()=>{state.selected=el.dataset.patient;nav("breakdown")};if(el.tagName==="TR")el.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();el.click()}};});
  document.querySelectorAll("[data-page-step]").forEach(el=>el.onclick=()=>{state.tablePage+=Number(el.dataset.pageStep);updatePatientTable()});
}
function updatePatientTable(){const rows=filteredPatients();document.getElementById("patients-table").innerHTML=patientTable(rows);document.getElementById("record-count").textContent=`${n(rows.length)} records`;bindPatients();document.querySelectorAll("#patients-table [data-nav]").forEach(el=>el.onclick=()=>nav(el.dataset.nav));}
function download(name,data,type){const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([data],{type}));link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
function exportCSV(){const rows=filteredPatients();if(!rows.length){toast("No matched records to export.");return;}
  const headers=["id","screened_at","name","site","age","gender","avg_glucose_level","bmi","hypertension","heart_disease","ever_married","work_type","Residence_type","smoking_status","model_score","risk_label","threshold","model","model_version","contacted"];
  const safe=v=>{let s=String(v??"");if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const csv=[headers,...rows.map(p=>[p.id,p.created_at,p.profile.name,p.profile.site,p.profile.age,p.profile.gender,p.profile.avg_glucose_level,p.profile.bmi,p.profile.hypertension,p.profile.heart_disease,p.profile.ever_married,p.profile.work_type,p.profile.Residence_type,p.profile.smoking_status,p.score,p.risk,p.threshold,p.model,p.model_version,p.contacted])].map(row=>row.map(safe).join(",")).join("\r\n");
  download(`cerebra-screenings-${today()}.csv`,"\uFEFF"+csv,"text/csv;charset=utf-8");toast(`Exported ${rows.length} matched records.`);
}
window.addEventListener("resize",()=>{if(window.Plotly)document.querySelectorAll(".js-plotly-plot").forEach(el=>Plotly.Plots.resize(el));});
