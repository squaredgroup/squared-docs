import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

let allResults=[];
let activeKind="all";
let timer=null;

function history(){
  try{return JSON.parse(localStorage.getItem("sq-help-search-history")||"[]")}catch{return []}
}
function saveHistory(query){
  if(!query||query.length<2)return;
  const next=[query,...history().filter(x=>x!==query)].slice(0,8);
  localStorage.setItem("sq-help-search-history",JSON.stringify(next));
  renderHistory();
}
function renderHistory(){
  const host=$("#searchHistory");
  if(!host)return;
  const items=history();
  host.innerHTML=items.length?items.map(q=>'<button class="search-history-item" data-history="'+esc(q)+'">'+(window.SQIconly?SQIconly.icon("time","regular","sm"):"")+'<span>'+esc(q)+'</span></button>').join(""):'<div class="forum-empty">Aucune recherche récente.</div>';
  $$("[data-history]",host).forEach(b=>b.addEventListener("click",()=>{$("#universalSearchInput").value=b.dataset.history;runSearch(b.dataset.history)}));
}

function iconFor(kind){
  if(kind==="forum")return "forum";
  if(kind==="ticket")return "support";
  return "quick";
}

function render(){
  const host=$("#universalSearchResults");
  const list=activeKind==="all"?allResults:allResults.filter(x=>x.kind===activeKind);
  $("#universalResultCount").textContent=list.length+" résultat"+(list.length>1?"s":"");

  if(!list.length){
    host.innerHTML='<div class="sq-empty-state"><span class="sq-empty-icon">'+(window.SQIconly?SQIconly.icon("search","regular","lg"):"")+'</span><strong>Aucun résultat</strong><p>Essayez une formulation plus courte, consultez la communauté ou ouvrez une demande privée.</p></div>';
    return;
  }

  const groups={knowledge:[],forum:[],ticket:[]};
  list.forEach(x=>(groups[x.kind]??=groups.knowledge).push(x));

  host.innerHTML=Object.entries(groups).filter(([,rows])=>rows.length).map(([kind,rows])=>{
    const label=kind==="knowledge"?"Documentation":kind==="forum"?"Communauté":"Mes demandes";
    return '<section class="search-result-group"><div class="search-result-group-head"><strong>'+label+'</strong><span>'+rows.length+'</span></div>'+rows.map(x=>'<a class="universal-result" href="'+esc(x.href)+'" data-result-kind="'+kind+'" data-result-href="'+esc(x.href)+'"><span class="universal-result-icon">'+(window.SQIconly?SQIconly.icon(iconFor(kind),kind==="ticket"?"fill":"outline","md"):"")+'</span><span><strong>'+esc(x.title)+'</strong><p>'+esc(x.description||"")+'</p><em>'+esc(x.category||label)+'</em></span><span class="universal-result-arrow">'+(window.SQIconly?SQIconly.icon("arrowRight","regular","sm"):"")+'</span></a>').join("")+'</section>';
  }).join("");

  $$("[data-result-href]",host).forEach(a=>a.addEventListener("click",()=>{
    window.SQSearchBackend?.event("search_click",{
      query:$("#universalSearchInput").value,
      target_href:a.dataset.resultHref,
      metadata:{kind:a.dataset.resultKind,source:"search-page"}
    }).catch(()=>{});
  }));
}

async function runSearch(q){
  const query=String(q||"").trim();
  if(query.length<2){allResults=[];render();return}
  const host=$("#universalSearchResults");
  host.innerHTML='<div class="loading">Recherche dans Squared…</div>';

  const {data,error}=await client.rpc("search_help_center",{p_query:query,p_limit:50});
  if(error){
    host.innerHTML='<div class="forum-empty"><strong>Recherche momentanément indisponible</strong>'+esc(error.message)+'</div>';
    return;
  }
  allResults=data||[];
  saveHistory(query);
  render();

  window.SQSearchBackend?.event("search",{
    query,
    metadata:{results:allResults.length,source:"search-page"}
  }).catch(()=>{});
}

$("#universalSearchInput")?.addEventListener("input",e=>{
  clearTimeout(timer);
  timer=setTimeout(()=>runSearch(e.target.value),180);
});
$("#universalSearchInput")?.addEventListener("keydown",e=>{
  if(e.key==="Enter"){clearTimeout(timer);runSearch(e.currentTarget.value)}
});

$$("[data-kind]").forEach(b=>b.addEventListener("click",()=>{
  $$("[data-kind]").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  activeKind=b.dataset.kind;
  render();
}));

renderHistory();

const q=new URLSearchParams(location.search).get("q");
if(q){$("#universalSearchInput").value=q;runSearch(q)}
