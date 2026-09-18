import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);

async function search(query,limit=30){
  const q=String(query||"").trim();
  if(q.length<2)return [];
  const {data,error}=await client.rpc("search_help_center",{p_query:q,p_limit:limit});
  if(error)throw error;
  return data||[];
}

async function event(event_type,payload={}){
  const {data:{session}}=await client.auth.getSession();
  const row={
    user_id:session?.user?.id||null,
    event_type,
    path:location.pathname,
    query:payload.query||null,
    target_href:payload.target_href||null,
    metadata:payload.metadata||{}
  };
  const {error}=await client.from("help_events").insert(row);
  if(error)throw error;
}

async function currentSession(){
  const {data:{session}}=await client.auth.getSession();
  return session;
}

window.SQSearchBackend={search,event,currentSession,client};
window.dispatchEvent(new CustomEvent("sq:backend-ready"));
