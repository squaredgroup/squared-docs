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
    className:"tw-inline-flex tw-items-center tw-justify-center",
    dangerouslySetInnerHTML:{__html:html}
  });
}

function DockButton({label,icon,onClick,href,danger=false}){
  const className=[
    "tw-flex","tw-h-9","tw-w-9","tw-items-center","tw-justify-center","tw-rounded-lg",
    "tw-border","tw-border-transparent","tw-transition","tw-duration-150",
    danger?"tw-text-rose-500":"tw-text-[var(--muted)]",
    "hover:tw-bg-[var(--panel-2)]","hover:tw-text-[var(--text)]"
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
      className:"sq-react-dock tw-fixed tw-bottom-4 tw-right-4 tw-z-[420] tw-hidden xl:tw-flex tw-items-center tw-gap-1 tw-rounded-xl tw-p-1.5 tw-shadow-lg sq-glass",
      style:{position:"fixed",right:"16px",bottom:"16px",zIndex:420}
    },
    h("div",{
      className:"tw-flex tw-h-9 tw-items-center tw-gap-2 tw-rounded-lg tw-px-2.5 tw-text-[10px] tw-font-medium tw-text-[var(--muted)]",
      title:online?"Connexion active":"Hors ligne"
    },
      h("span",{className:"tw-h-2 tw-w-2 tw-rounded-full "+(online?"tw-bg-[#7BE84E]":"tw-bg-rose-500")}),
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
