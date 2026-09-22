import {emptyData,validateBackup,SCHEMA_VERSION} from './core.js';
let db;
export function openDB() { return new Promise((resolve,reject)=>{const req=indexedDB.open('mygolf-v1',1); req.onupgradeneeded=()=>req.result.createObjectStore('app'); req.onerror=()=>reject(req.error); req.onsuccess=()=>{db=req.result;db.onversionchange=()=>db.close();resolve();};}); }
export function readData() {return new Promise((resolve,reject)=>{const tx=db.transaction('app'); const req=tx.objectStore('app').get('data'); req.onsuccess=()=>{try{resolve(req.result?validateBackup(req.result):emptyData());}catch(e){reject(e);}};req.onerror=()=>reject(req.error);});}
// Optimistic revision check prevents two tabs from silently overwriting each other.
export function saveData(next,expectedRevision) {return new Promise((resolve,reject)=>{const tx=db.transaction('app','readwrite');const store=tx.objectStore('app'); const req=store.get('data');let result,error;req.onsuccess=()=>{const current=req.result||emptyData();if(current.revision!==expectedRevision){error=new Error('다른 화면에서 기록이 변경됐습니다. 이 화면을 새로고침한 뒤 다시 입력해 주세요.');tx.abort();return;}try{if(current.schemaVersion>SCHEMA_VERSION)throw new Error('새 버전에서 저장한 기록입니다. 앱을 업데이트해 주세요.');result=validateBackup({...next,revision:current.revision+1});if(current.schemaVersion<SCHEMA_VERSION)store.put(current,'before-migration');store.put(result,'data');}catch(e){error=e;tx.abort();}};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(error||tx.error);tx.onabort=()=>reject(error||tx.error||new Error('저장하지 못했습니다.'));});}

export function readRawData(){return new Promise((resolve,reject)=>{const req=db.transaction('app').objectStore('app').get('data');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function requestPersistence(){
 if(!navigator.storage?.persist)return '이 브라우저에서는 저장 보호 요청을 지원하지 않습니다.';
 try{const granted=await navigator.storage.persisted()||await navigator.storage.persist();return granted?'저장 보호 승인됨 · 별도 백업은 계속 필요합니다.':'저장 보호 미승인 · 정기적으로 파일 백업해 주세요.';}catch{return '저장 보호 상태를 확인하지 못했습니다. 백업해 주세요.';}
}
