import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const root=new URL('../',import.meta.url);
function harness(tamper=false){
 const listeners={},scope='https://example.test/mygolf/',stores=new Map([['unrelated',new Map()],['mygolf-shell-'+scope+'-v1',new Map()]]);let skipped=0,claimed=0;
 const context={URL,Request,Response,Uint8Array,Object,Array,Promise,Error,crypto:webcrypto,AbortSignal,
 self:{registration:{scope},addEventListener:(type,fn)=>listeners[type]=fn,skipWaiting:async()=>{skipped++;},clients:{claim:async()=>{claimed++;}}},
 fetch:async req=>{const path=new URL(req.url).pathname.replace('/mygolf/','');return new Response(tamper&&path==='app.js'?'old mismatched script':readFileSync(new URL(path,root)));},
 caches:{keys:async()=>[...stores.keys()],delete:async key=>stores.delete(key),open:async key=>{if(!stores.has(key))stores.set(key,new Map());return {put:async(k,v)=>stores.get(key).set(k,v.clone()),match:async k=>stores.get(key).get(k)?.clone()};}}};
 vm.runInNewContext(readFileSync(new URL('sw.js',root),'utf8'),context);
 async function dispatch(type,extra={}){let promise;listeners[type]({...extra,waitUntil:p=>promise=p,respondWith:p=>promise=p});return await promise;}
 return {stores,dispatch,counts:()=>({skipped,claimed}),scope};
}
test('mismatched deployed files reject installation and leave previous cache untouched',async()=>{const h=harness(true);await assert.rejects(h.dispatch('install'),/Asset version mismatch/);assert.equal(h.stores.size,2);assert(h.stores.has('mygolf-shell-'+h.scope+'-v1'));});
test('complete release is cached, explicit apply activates and offline requests use the verified release',async()=>{const h=harness();await h.dispatch('install');assert.equal(h.stores.size,3);assert.equal(h.counts().skipped,0);await h.dispatch('message',{data:{type:'IGNORE'}});assert.equal(h.counts().skipped,0);await h.dispatch('message',{data:{type:'SKIP_WAITING'}});assert.equal(h.counts().skipped,1);await h.dispatch('activate');assert.equal(h.counts().claimed,1);assert(h.stores.has('unrelated'));assert(!h.stores.has('mygolf-shell-'+h.scope+'-v1'));const response=await h.dispatch('fetch',{request:{method:'GET',url:h.scope+'app.js',mode:'same-origin'}});assert.equal(await response.text(),readFileSync(new URL('app.js',root),'utf8'));const index=await h.dispatch('fetch',{request:{method:'GET',url:h.scope,mode:'navigate'}});assert.match(await index.text(),/My Golf/);});
