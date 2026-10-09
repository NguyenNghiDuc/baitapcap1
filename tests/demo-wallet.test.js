const test=require("node:test"),assert=require("node:assert/strict");
const wallet=require("../routes/demo-wallet");
const user={id:"stu1",role:"student",name:"Demo Student"};
function db(){return {users:[{...user}],demoTransactions:[],demoPurchases:[]}}
async function call(state,path,method="GET",body={}){
 let status=0,result;const ctx={send:(r,n,x)=>{status=n;result=x},parseBody:async()=>body,requireUser:async()=>user,load:()=>state,save:async()=>{}};
 const before=process.env.WALLET_DEMO;process.env.WALLET_DEMO="1";
 try{await wallet({method},null,path,ctx)}finally{if(before===undefined)delete process.env.WALLET_DEMO;else process.env.WALLET_DEMO=before}
 return {status,result}
}
test("wallet starts empty, and top up requires server-side valid amount",async()=>{
 const d=db();assert.equal((await call(d,"/api/demo-wallet")).result.wallet.balance,0);
 assert.equal((await call(d,"/api/demo-wallet/credit","POST",{amount:1,requestId:"request-00001"})).status,400);
 assert.equal((await call(d,"/api/demo-wallet/credit","POST",{amount:50000,requestId:"request-00002"})).status,200);
 assert.equal((await call(d,"/api/demo-wallet/credit","POST",{amount:50000,requestId:"request-00002"})).result.wallet.balance,50000);
});
test("VIP purchase is price-checked and duplicate-safe",async()=>{
 const d=db();
 assert.equal((await call(d,"/api/demo-wallet/buy","POST",{planId:"month",requestId:"request-00003"})).status,402);
 await call(d,"/api/demo-wallet/credit","POST",{amount:100000,requestId:"request-00004"});
 const b=await call(d,"/api/demo-wallet/buy","POST",{planId:"month",requestId:"request-00005"});
 assert.equal(b.result.wallet.balance,51000);assert.equal(b.result.wallet.validVip,true);
 const dupe=await call(d,"/api/demo-wallet/buy","POST",{planId:"month",requestId:"request-00005"});
 assert.equal(dupe.result.wallet.balance,51000);
});
