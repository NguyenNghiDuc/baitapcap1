const autocannon=require("autocannon");
const url=process.env.LOAD_TEST_URL||"http://127.0.0.1:3000";
const connections=Number(process.env.LOAD_CONNECTIONS||50),duration=Number(process.env.LOAD_DURATION||15);
autocannon({url,connections,duration,pipelining:1,requests:[{method:"GET",path:"/api/health"},{method:"GET",path:"/"}]},(err,r)=>{if(err){console.error(err);process.exit(1)}console.log(JSON.stringify({url,connections,duration,requests:r.requests,latency:r.latency,throughput:r.throughput,errors:r.errors,timeouts:r.timeouts,non2xx:r.non2xx},null,2));if(r.errors||r.timeouts)process.exitCode=2});
