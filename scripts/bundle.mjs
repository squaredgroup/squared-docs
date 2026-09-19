import {build} from 'esbuild';
import fs from 'node:fs/promises';
await fs.mkdir('assets/vendor',{recursive:true});
await build({stdin:{contents:'export { createClient } from "@supabase/supabase-js";',resolveDir:process.cwd(),sourcefile:'supabase-entry.js'},bundle:true,format:'esm',platform:'browser',target:['es2022'],minify:true,outfile:'assets/vendor/supabase.js',legalComments:'eof'});
await build({entryPoints:['assets/react-ui.js'],bundle:true,format:'esm',platform:'browser',target:['es2022'],minify:true,outfile:'assets/react-ui.bundle.js',define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});
const packages=['react','react-dom','@supabase/supabase-js','tailwindcss'];const notices=[];for(const name of packages){const path='node_modules/'+name;const pkg=JSON.parse(await fs.readFile(path+'/package.json','utf8'));let license='';for(const f of ['LICENSE','LICENSE.txt','LICENSE.md']){try{license=await fs.readFile(path+'/'+f,'utf8');break;}catch{}}notices.push('## '+name+' '+pkg.version+'\n\n'+(license||'License: '+pkg.license));}await fs.writeFile('assets/vendor/NOTICES.txt',notices.join('\n\n'));
console.log('Local dependencies bundled.');
