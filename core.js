export const DEFAULT_CLUBS = ['드라이버','3U','5I','6I','7I','8I','9I','P','52°','56°','60°','퍼터'];
export const RATINGS = ['미평가','완전 망한 샷','의도와 다른 샷','So-so, 보통','그럭저럭 잘 친 샷','완전 잘 친 샷'];
export const TAGS = ['슬라이스','훅','푸시','풀','뒤땅','탑핑','생크','거리 부족','거리 초과','뽕샷','짧은 퍼트 실패','판단 실수'];
export const LIES = ['티잉 구역','페어웨이','러프','벙커','공이 발보다 높음','공이 발보다 낮음','오르막','내리막','그린','그린 밖'];
export const uid = () => crypto.randomUUID();
export function localDate() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function newRound(name,date=localDate(),count=18) { return {id:uid(),name,date,createdAt:new Date().toISOString(),finished:false,lastHole:0,holes:Array.from({length:count},(_,i)=>({number:i+1,par:4,complete:false,gir:null,shots:[]}))}; }
export function emptyData() { return {schemaVersion:2,revision:0,clubs:[...DEFAULT_CLUBS],rounds:[],lastBackup:null}; }
export function holeStats(h) { const actual=h.shots.filter(s=>s.kind==='shot'); const penalty=h.shots.reduce((n,s)=>n+s.penalty,0); const conceded=h.shots.filter(s=>s.kind==='conceded').length; return {actual:actual.length,penalty,conceded,total:actual.length+penalty+conceded,putts:actual.filter(s=>s.onGreen).length}; }
export function roundStats(r) { const played=r.holes.filter(h=>h.shots.length||h.complete); return {total:played.reduce((n,h)=>n+holeStats(h).total,0),par:played.reduce((n,h)=>n+h.par,0),complete:r.holes.filter(h=>h.complete).length,putts:played.reduce((n,h)=>n+holeStats(h).putts,0),penalty:played.reduce((n,h)=>n+holeStats(h).penalty,0),conceded:played.reduce((n,h)=>n+holeStats(h).conceded,0)}; }
export function summarize(rounds) { const holes=rounds.flatMap(r=>r.holes); const shots=holes.flatMap(h=>h.shots).filter(s=>s.kind==='shot'); const rated=shots.filter(s=>s.rating!==null); const counts=Array.from({length:6},(_,i)=>shots.filter(s=>i===0?s.rating===null:s.rating===i).length); const tags={}; shots.forEach(s=>s.tags.forEach(t=>tags[t]=(tags[t]||0)+1)); return {shots,rated,counts,mean:rated.length?rated.reduce((n,s)=>n+s.rating,0)/rated.length:null,good:counts[4]+counts[5],bad:counts[1]+counts[2],penalty:holes.reduce((n,h)=>n+holeStats(h).penalty,0),threePutts:holes.filter(h=>holeStats(h).putts>=3).length,tags}; }
export function scoreName(total,par) { const d=total-par; return d===0?'파':d===-1?'버디':d===-2?'이글':d===1?'보기':d===2?'더블보기':d===3?'트리플보기':`${d>0?'+':''}${d}`; }
export const SCHEMA_VERSION = 2;
export function migrate(input) {
 if(!input||![1,2].includes(input.schemaVersion)) throw new Error('지원하지 않는 백업 버전입니다. 최신 앱으로 열어 주세요. 원본은 변경하지 않았습니다.');
 const d=structuredClone(input);
 if(d.schemaVersion===1){
  if(!Array.isArray(d.rounds)) throw new Error('라운드 형식이 올바르지 않습니다.');
  for(const r of d.rounds){
   if(!r||!Array.isArray(r.holes)) throw new Error('홀 형식이 올바르지 않습니다.');
   r.lastHole=Math.max(0,r.holes.findLastIndex(h=>Array.isArray(h?.shots)&&h.shots.length>0));
  }
  d.schemaVersion=2;
 }
 return d;
}
export function validateBackup(source) {
 const input=migrate(source);
 const fail=()=>{throw new Error('지원하는 My Golf 백업 파일이 아니거나 기록 형식이 올바르지 않습니다.');};
 const text=(x,n=100)=>typeof x==='string'&&x.length<=n;
 const integer=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const ids=new Set(); const id=x=>{if(!text(x,100)||!UUID.test(x)||ids.has(x)) fail(); ids.add(x); return x;};
 if(!input||input.schemaVersion!==SCHEMA_VERSION||!Array.isArray(input.clubs)||input.clubs.length<1||input.clubs.length>30||!input.clubs.every(c=>text(c,20)&&c.trim())||new Set(input.clubs).size!==input.clubs.length||!Array.isArray(input.rounds)||input.rounds.length>5000) fail();
 const rounds=input.rounds.map(r=>{
  if(!r||!text(r.name,100)||!r.name.trim()||!text(r.date,10)||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isFinite(Date.parse(r.date))||new Date(r.date).toISOString().slice(0,10)!==r.date||!text(r.createdAt,40)||!Number.isFinite(Date.parse(r.createdAt))||typeof r.finished!=='boolean'||!Array.isArray(r.holes)||![9,18].includes(r.holes.length)) fail();
  if(!integer(r.lastHole,0,r.holes.length-1)) fail();
  return {id:id(r.id),name:r.name,date:r.date,createdAt:r.createdAt,finished:r.finished,lastHole:r.lastHole,holes:r.holes.map((h,i)=>{
   if(!h||h.number!==i+1||!integer(h.par,3,6)||typeof h.complete!=='boolean'||![true,false,null].includes(h.gir)||!Array.isArray(h.shots)||h.shots.length>100) fail();
   return {number:h.number,par:h.par,complete:h.complete,gir:h.gir,shots:h.shots.map(s=>{
    if(!s||!['shot','conceded'].includes(s.kind)||!text(s.club,20)||!(s.rating===null||integer(s.rating,1,5))||!integer(s.penalty,0,10)||!text(s.penaltyReason,50)||typeof s.onGreen!=='boolean'||!text(s.type,30)||!text(s.lie,30)||!text(s.note,500)||!Array.isArray(s.tags)||s.tags.length>20||!s.tags.every(t=>text(t,30))) fail();
    if(s.kind==='conceded'&&(s.rating!==null||s.penalty!==0||s.onGreen)) fail();
    return {id:id(s.id),kind:s.kind,club:s.club,rating:s.rating,penalty:s.penalty,penaltyReason:s.penaltyReason,onGreen:s.onGreen,type:s.type,lie:s.lie,note:s.note,tags:[...new Set(s.tags)]};
   })};
  })};
 });
 return {schemaVersion:SCHEMA_VERSION,revision:integer(input.revision,0,Number.MAX_SAFE_INTEGER)?input.revision:0,clubs:[...input.clubs],rounds,lastBackup:text(input.lastBackup,40)?input.lastBackup:null};
}

// Defaults affect only new entries. Historical flags are never inferred or rewritten.
export function makeDraft(h,clubs=DEFAULT_CLUBS){
 const shots=h?.shots||[],last=shots.at(-1);
 return {club:last?.club==='퍼터'?'퍼터':shots.length||h?.par===3?'':clubs.includes('드라이버')?'드라이버':clubs[0]||'',rating:null,penalty:0,penaltyReason:'',onGreen:true,type:'',lie:'',note:'',tags:[],details:false,clubExplicit:false};
}
export function concededShot(id=uid()) {return {id,kind:'conceded',club:'퍼터',rating:null,penalty:0,penaltyReason:'',onGreen:false,type:'',lie:'',note:'',tags:[]};}
export function convertToConceded(shot){
 if(shot.kind!=='shot'||shot.club!=='퍼터'||shot.penalty) throw new Error('벌타 없는 퍼터 기록만 컨시드로 변경할 수 있습니다.');
 return concededShot(shot.id);
}
export function estimateGir(h){
 const i=h.shots.findIndex(s=>s.kind==='shot'&&s.onGreen);
 if(i<0)return null;
 return h.shots.slice(0,i).reduce((n,s)=>n+1+s.penalty,0)<=h.par-2;
}
