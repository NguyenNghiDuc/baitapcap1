const {defineConfig,devices}=require("@playwright/test");
module.exports=defineConfig({
 testDir:"./tests/ui",
 timeout:30000,
 fullyParallel:false,
 retries:1,
 use:{baseURL:"http://127.0.0.1:4173",trace:"retain-on-failure",screenshot:"only-on-failure"},
 webServer:{command:"node server.js",url:"http://127.0.0.1:4173/api/health",reuseExistingServer:false,timeout:30000,env:{...process.env,PORT:"4173",SEED_DEMO:"1",NODE_ENV:"test"}},
 projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}},{name:"mobile",use:{...devices["iPhone 13"]}}]
});