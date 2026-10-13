"use strict";
const ROLES=new Set(["","student","parent","teacher","admin"]);
const STATUSES=new Set(["","active","locked"]);
function choice(value,allowed){
 if(value===undefined||value===null)return "";
 if(typeof value!=="string"||value.length>40||!allowed.has(value))throw Error("Bộ lọc tài khoản không hợp lệ");
 return value;
}
function parseUserFilters(query={}){
 return {role:choice(query.role,ROLES),accountStatus:choice(query.accountStatus,STATUSES)};
}
function applyUserFilters(users,{role="",accountStatus=""}={}){
 return users.filter(u=>(!role||u.role===role)&&
  (accountStatus===""||(accountStatus==="locked"?u.locked===true:u.locked!==true)));
}
module.exports={parseUserFilters,applyUserFilters};
