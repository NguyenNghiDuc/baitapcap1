"use strict";
const autocannon=require("autocannon");
const input=process.env.LOAD_TEST_URL||"http://127.0.0.1:3000";
let target;
try{target=new URL(input)}catch{console.error("LOAD_TEST_URL không hợp lệ");process.exit(1)}
const local=["localhost","127.0.0.1","::1","[::1]"].includes(target.hostname);
if(!local&&process.env.ALLOW_REMOTE_LOAD_TEST!=="yes"){
 console.error("Từ chối tạo tải lên website ngoài localhost. Cần ALLOW_REMOTE_LOAD_TEST=yes khi có quyền và lịch kiểm tra.");
 process.exit(2);
}
if(!["http:","https:"].includes(target.protocol))process.exit(2);
const requestedConnections=Number(process.env.LOAD_CONNECTIONS||50);
const requestedDuration=Number(process.env.LOAD_DURATION||15);
const maxConnections=local?1000:200,maxDuration=local?90:30;
if(!Number.isInteger(requestedConnections)||requestedConnections<1||requestedConnections>maxConnections)throw Error("LOAD_CONNECTIONS phải từ 1 đến "+maxConnections);
if(!Number.isInteger(requestedDuration)||requestedDuration<1||requestedDuration>maxDuration)throw Error("LOAD_DURATION phải từ 1 đến "+maxDuration+" giây");
const paths=["/","/api/app/version","/api/health"]; // GET-only public endpoints: never create accounts, exams or submissions.
const calls=paths.map(path=>({method:"GET",path}));
console.log("Benchmark",target.origin,"connections",requestedConnections,"seconds",requestedDuration);
autocannon({url:target.origin,connections:requestedConnections,duration:requestedDuration,pipelining:1,
 requests:calls,timeout:10},(error,result)=>{
 if(error){console.error(error);process.exitCode=1;return}
 const summary={url:target.origin,connections:requestedConnections,durationSeconds:requestedDuration,
  latency:{mean:result.latency.mean,p50:result.latency.p50,p95:result.latency.p95,p99:result.latency.p99,max:result.latency.max},
  requestsPerSecond:result.requests.average,errors:result.errors,timeouts:result.timeouts,non2xx:result.non2xx};
 console.log(JSON.stringify(summary,null,2));
 const p95Limit=Number(process.env.LOAD_P95_MAX_MS||0);
 if(result.errors||result.timeouts||result.non2xx||(p95Limit&&result.latency.p95>p95Limit))process.exitCode=2;
});
