"use strict";
const {isDeepStrictEqual}=require("node:util");

// Three-way merge of a legacy, potentially stale app_state snapshot.
// BASE is what this server last read, NEXT is its intended change, and REMOTE
// is the latest locked PostgreSQL value. Never replace REMOTE wholesale.
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const object=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
const owns=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const validId=x=>object(x)&&(typeof x.id==="string"||typeof x.id==="number")&&String(x.id).length>0;
const keyed=(...arrays)=>arrays.every(xs=>Array.isArray(xs)&&xs.every(validId)&&new Set(xs.map(x=>String(x.id))).size===xs.length);
const GRADE_FIELDS=["score","gradedAt","gradingStatus","feedback"];
function validateLegacy(before,next){
 if(!object(before)||!object(next))throw Error("Snapshot dữ liệu không hợp lệ");
 if(!isDeepStrictEqual(before.gradeReviews||[],next.gradeReviews||[]))
  throw Error("Không được sửa yêu cầu duyệt điểm bằng lối lưu dữ liệu cũ");
 const base=new Map((before.submissions||[]).filter(validId).map(s=>[String(s.id),s]));
 for(const submission of next.submissions||[]){
  if(!validId(submission))continue;
  const old=base.get(String(submission.id));
  if(!old)continue; // A brand-new submission can carry its initial automatic score.
  for(const key of GRADE_FIELDS)
   if(!isDeepStrictEqual(old[key],submission[key]))
    throw Error("Điểm và nhận xét đã nộp chỉ được sửa bằng API chấm/duyệt điểm");
 }
}
function merge(base,next,remote){
 if(isDeepStrictEqual(base,next))return clone(remote);
 if(keyed(base,next,remote)){
  const was=new Map(base.map(x=>[String(x.id),x]));
  const local=new Map(next.map(x=>[String(x.id),x]));
  const output=new Map(remote.map(x=>[String(x.id),clone(x)]));
  for(const [id] of was)if(!local.has(id))output.delete(id);
  for(const [id,updated] of local){
   if(!was.has(id)){
    if(!output.has(id))output.set(id,clone(updated)); // Never clobber a concurrent insert.
   }else if(output.has(id)){
    output.set(id,merge(was.get(id),updated,output.get(id)));
   } // A concurrently deleted record is not resurrected.
  }
  return [...output.values()];
 }
 if(object(base)&&object(next)&&object(remote)){
  const out=clone(remote);
  for(const key of new Set([...Object.keys(base),...Object.keys(next)])){
   if(!owns(next,key)){delete out[key];continue}
   if(!owns(base,key)){
    if(!owns(out,key))out[key]=clone(next[key]);
    continue; // Remote insert wins on key collision.
   }
   if(isDeepStrictEqual(base[key],next[key]))continue;
   out[key]=merge(base[key],next[key],out[key]);
  }
  return out;
 }
 return clone(next);
}
function mergeAppState(base,next,remote){
 validateLegacy(base,next);
 if(!object(remote)||!Array.isArray(remote.users))throw Error("Trạng thái PostgreSQL không hợp lệ");
 const merged=merge(base,next,remote);
 // The transaction-only grade-review workflow is authoritative across workers.
 merged.gradeReviews=clone(remote.gradeReviews||[]);
 return merged;
}
module.exports={mergeAppState,validateLegacy};
