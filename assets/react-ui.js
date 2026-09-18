import React, { useEffect, useMemo, useState } from "https://esm.sh/react@19";
import { createRoot } from "https://esm.sh/react-dom@19/client";

const h=React.createElement;

function relative(path){
  const parts=location.pathname.split("/").filter(Boolean);
  const nested=["wix","workspace","design-system","development","security"].includes(parts.length>1?parts[parts.length-2]:"");
  return (nested?"../":"")+path;
}

function Icon({name,style="outline"}){
  const html=window.SQIconly?.icon?.(name,style,"sm")||"";
  return h("span",{
    className:"inline-flex items-center justify-center",
    dangerouslySetInnerHTML:{__html:html}
  });
}

function DockButton({label,icon,onClick,href,danger=false}){
  const className=[
    "flex","h-9","w-9","items-center","justify-center","rounded-lg",
    "border","border-transparent","transition","duration-150",
    danger?"text-rose-500":"text-[var(--muted)]",
    "hover:bg-[var(--panel-2)]","hover:text-[var(--text)]"
  ].join(" ");

  const props={
    className,
    title:label,
    "aria-label":label,
    onClick
  };

  if(href){
    props.href=href;
    return h("a",props,h(Icon,{name:icon}));
  }
  return h("button",{...props,type:"button"},h(Icon,{name:icon}));
}

function ModernDock(){
  const [online,setOnline]=useState(navigator.onLine);
  const [collapsed,setCollapsed]=useState(()=>{
    try{return localStorage.getItem("sq-react-dock-collapsed")==="1"}catch{return false}
  });

  useEffect(()=>{
    const on=()=>setOnline(true);
    const off=()=>setOnline(false);
    addEventListener("online",on);
    addEventListener("offline",off);
    return ()=>{removeEventListener("online",on);removeEventListener("offline",off)};
  },[]);

  useEffect(()=>{
    try{localStorage.setItem("sq-react-dock-collapsed",collapsed?"1":"0")}catch{}
  },[collapsed]);

  const pageLabel=useMemo(()=>{
    const p=location.pathname.split("/").filter(Boolean).pop()||"index.html";
    if(p==="index.html")return "Accueil";
    if(p==="forum.html")return "Forum";
    if(p==="support.html")return "Support";
    if(p==="server-status.html")return "Serveurs";
    return "Help Center";
  },[]);

  const openSearch=()=>document.querySelector("[data-search-open]")?.click();

  return h("div",{
      className:"sq-react-dock fixed bottom-4 right-4 z-[420] hidden xl:flex items-center gap-1 rounded-xl p-1.5 shadow-lg sq-glass",
      style:{position:"fixed",right:"16px",bottom:"16px",zIndex:420}
    },
    h("div",{
      className:"flex h-9 items-center gap-2 rounded-lg px-2.5 text-[10px] font-medium text-[var(--muted)]",
      title:online?"Connexion active":"Hors ligne"
    },
      h("span",{className:"h-2 w-2 rounded-full "+(online?"bg-[#7BE84E]":"bg-rose-500")}),
      collapsed?null:h("span",null,pageLabel)
    ),
    collapsed?null:h(React.Fragment,null,
      h(DockButton,{label:"Rechercher",icon:"search",onClick:openSearch}),
      h(DockButton,{label:"Forum",icon:"forum",href:relative("forum.html")}),
      h(DockButton,{label:"Support",icon:"support",href:relative("support.html")}),
      h(DockButton,{label:"Haut de page",icon:"arrowUp",onClick:()=>scrollTo({top:0,behavior:"smooth"})})
    ),
    h(DockButton,{
      label:collapsed?"Déployer les outils":"Réduire les outils",
      icon:collapsed?"plus":"collapse",
      onClick:()=>setCollapsed(v=>!v)
    })
  );
}

function mount(){
  if(document.getElementById("sq-react-ui-root"))return;
  const root=document.createElement("div");
  root.id="sq-react-ui-root";
  document.body.appendChild(root);
  createRoot(root).render(h(ModernDock));
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
else mount();
