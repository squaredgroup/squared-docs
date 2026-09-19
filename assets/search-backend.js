import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);

async function search(query,limit=30,signal){
  const q=String(query||"").trim();
  if(q.length<2)return [];
  let request=client.rpc("search_help_center",{p_query:q,p_limit:limit});
  if(signal)request=request.abortSignal(signal);
  const {data,error}=await request;
  if(error)throw error;
  return data||[];
}

async function event(event_type,payload={}){
  const {data:{session}}=await client.auth.getSession();
  const row={
    user_id:session?.user?.id||null,
    event_type,
    path:location.pathname,
    query:session?null:(payload.query||null),
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
async function currentProfile(){
  const session=await currentSession();
  if(!session)return null;
  const {data}=await client.from("profiles").select("id,role,display_name,username,is_banned").eq("id",session.user.id).maybeSingle();
  return data||null;
}

window.SQSearchBackend={search,event,currentSession,currentProfile,client};
window.dispatchEvent(new CustomEvent("sq:backend-ready"));
