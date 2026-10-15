"use strict";
const {isDeepStrictEqual}=require("node:util");

// Merge a possibly stale local snapshot into the latest row-locked PostgreSQL
// app_state. A concurrent update to the SAME field fails closed instead of
// silently replacing another worker's change.
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const object=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
const owns=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const validId=x=>object(x)&&(typeof x.id==="string"||typeof x.id==="number")&&String(x.id).length>0;
const keyed=(...arrays)=>arrays.every(xs=>Array.isArray(xs)&&xs.every(validId)&&new Set(xs.map(x=>String(x.id))).size===xs.length);
const GRADE_FIELDS=["score","gradedAt","gradingStatus","feedback"];
const scored=s=>s?.score!==null&&s?.score!==undefined&&s?.score!==""&&Number.isFinite(Number(s.score));
function conflict(path){
 // Never include values (passwords, student names, or grades) in the error.
 throw Error("Xung đột dữ liệu đồng thời tại "+(path.join(".")||"app_state")+". Tải lại và thử tiếp.");
}
function validateLegacy(before,next){
 if(!object(before)||!object(next))throw Error("Snapshot dữ liệu không hợp lệ");
 if(!isDeepStrictEqual(before.gradeReviews||[],next.gradeReviews||[]))
  throw Error("Không được sửa yêu cầu duyệt điểm bằng lối lưu dữ liệu cũ");
 if(!isDeepStrictEqual(before.resultReviewDecisions||[],next.resultReviewDecisions||[]))
  throw Error("Không được sửa lịch sử xem xét kết quả bằng lối lưu dữ liệu cũ");
 if(!isDeepStrictEqual(before.deviceSecurityReviews||[],next.deviceSecurityReviews||[]))
  throw Error("Không được sửa nhật ký xem xét đăng nhập bằng lối lưu dữ liệu cũ");
 if(!Array.isArray(before.submissions||[])||!Array.isArray(next.submissions||[]))
  throw Error("Danh sách bài nộp không hợp lệ");
 const base=new Map((before.submissions||[]).filter(validId).map(s=>[String(s.id),s]));
 const nextMap=new Map((next.submissions||[]).filter(validId).map(s=>[String(s.id),s]));
 const reviewed=new Set((before.gradeReviews||[]).map(r=>String(r.submissionId)));
 for(const [id,old] of base){
  if(!nextMap.has(id)&&(scored(old)||reviewed.has(id)))
   throw Error("Không thể xóa bài đã chấm hoặc có yêu cầu sửa điểm bằng lối lưu dữ liệu cũ");
 }
 for(const submission of next.submissions||[]){
  if(!validId(submission))continue;
  const old=base.get(String(submission.id));
  if(!old)continue; // A brand-new submission can have its initial auto-score.
  for(const key of GRADE_FIELDS){
   if(!isDeepStrictEqual(old[key],submission[key]))
    throw Error("Điểm và nhận xét đã nộp chỉ được sửa bằng API chấm/duyệt điểm");
  }
 }
}
function merge(base,next,remote,path=[]){
 if(isDeepStrictEqual(base,next))return clone(remote);
 if(isDeepStrictEqual(remote,base))return clone(next);
 if(isDeepStrictEqual(remote,next))return clone(remote);
 if(keyed(base,next,remote)){
  const was=new Map(base.map(x=>[String(x.id),x]));
  const local=new Map(next.map(x=>[String(x.id),x]));
  const output=new Map(remote.map(x=>[String(x.id),clone(x)]));
  for(const [id,original] of was){
   if(local.has(id))continue;
   if(output.has(id)&&!isDeepStrictEqual(original,output.get(id)))conflict([...path,id]);
   output.delete(id);
  }
  for(const [id,updated] of local){
   if(!was.has(id)){
    if(output.has(id)&&!isDeepStrictEqual(output.get(id),updated))conflict([...path,id]);
    if(!output.has(id))output.set(id,clone(updated));
   }else if(output.has(id)){
    output.set(id,merge(was.get(id),updated,output.get(id),[...path,id]));
   }else if(!isDeepStrictEqual(was.get(id),updated)){
    conflict([...path,id]); // Do not resurrect a concurrently deleted item.
   }
  }
  return [...output.values()];
 }
 if(object(base)&&object(next)&&object(remote)){
  const out=clone(remote);
  for(const key of new Set([...Object.keys(base),...Object.keys(next)])){
   if(!owns(next,key)){
    if(owns(out,key)&&!isDeepStrictEqual(out[key],base[key]))conflict([...path,key]);
    delete out[key];continue;
   }
   if(!owns(base,key)){
    if(owns(out,key)&&!isDeepStrictEqual(out[key],next[key]))conflict([...path,key]);
    if(!owns(out,key))out[key]=clone(next[key]);
    continue;
   }
   if(isDeepStrictEqual(base[key],next[key]))continue;
   if(!owns(out,key))conflict([...path,key]);
   out[key]=merge(base[key],next[key],out[key],[...path,key]);
  }
  return out;
 }
 // Array without stable IDs or a leaf simultaneously updated by both writers.
 // Prefer rejecting an ambiguous write over dropping session/access data.
 conflict(path);
}
function mergeAppState(base,next,remote){
 validateLegacy(base,next);
 if(!object(remote)||!Array.isArray(remote.users))throw Error("Trạng thái PostgreSQL không hợp lệ");
 const merged=merge(base,next,remote);
 // Grade approval is authoritative: it is never copied from the local cache.
 merged.gradeReviews=clone(remote.gradeReviews||[]);
 merged.resultReviewDecisions=clone(remote.resultReviewDecisions||[]);
 merged.deviceSecurityReviews=clone(remote.deviceSecurityReviews||[]);
 return merged;
}
module.exports={mergeAppState,validateLegacy};
