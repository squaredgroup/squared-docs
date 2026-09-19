import {createClient} from './vendor/supabase.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';
import {escapeHTML,safeRoute,markdown,componentState,aggregateState,labels,sampleRatio} from './hc-state.js';
export const db=globalThis.__SQHelpClient||(globalThis.__SQHelpClient=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY));
export const base=new URL('../',import.meta.url);
export const href=path=>safeRoute(path,base.href)||new URL('search.html',base).href;
export const esc=escapeHTML;
export const $=(q,root=document)=>root.querySelector(q);
export const $$=(q,root=document)=>Array.from(root.querySelectorAll(q));
export {markdown,componentState,aggregateState,labels,sampleRatio};
export const fmt=value=>value&&Number.isFinite(new Date(value).getTime())?new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'Non renseigné';
export function checked(result){if(result.error)throw result.error;return result.data;}
export async function session(){const {data,error}=await db.auth.getSession();if(error)throw error;return data.session;}
export async function profile(){const s=await session();if(!s)return null;const p=checked(await db.from('profiles').select('id,role,is_banned,display_name,username,avatar_url').eq('id',s.user.id).maybeSingle());return p;}
export async function requireUser(staff=false){const p=await profile();if(!p){const next=location.href.substring(base.href.length);location.assign(href('login.html?next='+encodeURIComponent(next)));return null;}if(p.is_banned)throw new Error('Votre compte est suspendu.');if(staff&&!['admin','moderator'].includes(p.role))throw new Error('Cet espace est réservé à l’équipe habilitée.');return p;}
export function notice(message,error=false){let el=$('#opsNotice');if(!el){el=document.createElement('div');el.id='opsNotice';el.className='ops-notice';el.setAttribute('role','status');document.body.append(el);}el.textContent=message;el.dataset.error=String(error);el.hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>el.hidden=true,6000);}
export function failure(host,error){if(!host)return;host.innerHTML='<div class="ops-empty" role="alert"><strong>Chargement impossible</strong><p>'+esc(error?.message||'Le service ne répond pas. Réessayez dans un instant.')+'</p><button class="btn" type="button" data-retry>Réessayer</button></div>';host.querySelector('[data-retry]').onclick=()=>location.reload();}
export function empty(title,body){return '<div class="ops-empty"><strong>'+esc(title)+'</strong><p>'+esc(body)+'</p></div>';}
export async function busy(button,operation){if(button?.disabled)return;const original=button?.textContent;if(button){button.disabled=true;button.setAttribute('aria-busy','true');}try{return await operation();}catch(e){notice(e.message||'Action impossible.',true);throw e;}finally{if(button){button.disabled=false;button.removeAttribute('aria-busy');}}}
export function onAction(host,selector,callback){host.addEventListener('click',event=>{const target=event.target.closest(selector);if(!target||!host.contains(target))return;event.preventDefault();busy(target,()=>callback(target,event)).catch(()=>{});});}
export function formObject(form){return Object.fromEntries(new FormData(form));}
export function openDialog(title,body,submit='Enregistrer'){
 return new Promise(resolve=>{
  const previous=document.activeElement;const dialog=document.createElement('dialog');dialog.className='ops-dialog';dialog.setAttribute('aria-labelledby','opsDialogTitle');
  dialog.innerHTML='<form><header><h2 id="opsDialogTitle">'+esc(title)+'</h2><button class="icon-btn" type="button" data-close aria-label="Fermer">×</button></header>'+body+'<footer><button class="btn" type="button" data-close>Annuler</button><button class="btn green" type="submit">'+esc(submit)+'</button></footer></form>';
  document.body.append(dialog);let result=null;dialog.addEventListener('close',()=>{dialog.remove();previous?.focus();resolve(result);},{once:true});dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());dialog.querySelector('form').onsubmit=e=>{e.preventDefault();result=new FormData(e.currentTarget);dialog.close();};dialog.showModal();
 });
}
export function field(name,label,value='',type='text',options={}){const id='ops-'+name;const attrs=' id="'+id+'" name="'+name+'" '+(options.required?'required ':'')+(options.max?'maxlength="'+options.max+'" ':'');if(type==='textarea')return '<label class="ops-field" for="'+id+'">'+esc(label)+'<textarea '+attrs+' rows="'+(options.rows||5)+'">'+esc(value)+'</textarea></label>';if(type==='select')return '<label class="ops-field" for="'+id+'">'+esc(label)+'<select '+attrs+(options.multiple?' multiple':'')+'>'+options.values.map(o=>{const [v,t]=Array.isArray(o)?o:[o,o];return '<option value="'+esc(v)+'" '+(String(value)===String(v)?'selected':'')+'>'+esc(t)+'</option>';}).join('')+'</select></label>';return '<label class="ops-field" for="'+id+'">'+esc(label)+'<input '+attrs+' type="'+type+'" value="'+esc(value)+'"></label>';}
export function downloadJSON(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function applyPreferences(p){const choice=p.theme||'light';const theme=choice==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):choice;document.documentElement.dataset.theme=theme;document.body.classList.toggle('sidebar-mini',!!p.compact_sidebar);document.body.classList.toggle('reduce-motion',!!p.reduced_motion);try{localStorage.setItem('sq-docs-theme',theme);localStorage.setItem('sq-help-sidebar-mini',p.compact_sidebar?'1':'0');localStorage.setItem('sq-help-reduced-motion',p.reduced_motion?'1':'0');}catch{}window.dispatchEvent(new CustomEvent('sq:preferences-updated',{detail:p}));}
