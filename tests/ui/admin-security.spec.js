"use strict";
const {test,expect}=require("@playwright/test");
test.use({serviceWorkers:"block"});
test("guests cannot access security center or lazy-load its private styles",async({page})=>{
 await page.goto("/#adminSecurity");
 await expect(page.locator("#content")).toContainText("Chỉ quản trị viên",{timeout:12000});
 await expect(page.locator(".admin-security-page")).toHaveCount(0);
 await expect(page.locator('link[data-lazy-style-src="/css/admin-security.css"]')).toHaveCount(0);
});
test("security center renders server-confirmed permissions and only current user's devices",async({page})=>{
 await page.route("**/api/public-config",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({supabase:{enabled:false}})}));
 await page.route("**/api/admin/security",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
  permissions:{title:"Admin được cấp quyền",ownerConfigured:true,isOwner:false,capabilities:{
   viewUsers:true,manageRegularUsers:true,viewAudit:true,exportGrades:true,grantAdmin:false,editOtherAdmins:false
  }},
  devices:[{device:"iPhone",browser:"Safari",ip:"203.0.113.8",firstSeenAt:"2026-10-12T00:00:00Z",lastSeenAt:"2026-10-13T00:00:00Z",current:true}],
  notice:"Lịch sử thiết bị, không phải phiên đang hoạt động.",deviceLimit:25
 })}));
 await page.goto("/#adminSecurity");
 await expect(page.locator("#content")).toContainText("Chỉ quản trị viên",{timeout:12000});
 await page.evaluate(async()=>{
  await window.SupabaseApp?.ready();
  window.AppAuthBridge.setUser({id:"admin-1",name:"Test Admin",email:"test@example.test",role:"admin"});
 });
 await expect(page.locator(".admin-security-page")).toBeVisible({timeout:12000});
 await expect(page.locator(".admin-sec-stats")).toContainText("Admin được cấp quyền");
 await expect(page.locator(".admin-sec-powers")).toContainText("Không có quyền");
 await expect(page.locator(".admin-security-page")).toContainText("203.0.113.8");
 await expect(page.locator(".admin-security-page")).toContainText("Thiết bị này");
 await expect(page.locator('link[data-lazy-style-src="/css/admin-security.css"]')).toHaveCount(1);
});


test("Admin sees IPs of other accounts and can search device history",async({page})=>{
 const requests=[];
 await page.route("**/api/public-config",r=>r.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify({supabase:{enabled:false}})
 }));
 await page.route("**/api/admin/security",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
  permissions:{title:"Admin",ownerConfigured:false,capabilities:{}},devices:[],notice:""
 })}));
 await page.route("**/api/admin/device-logs?**",r=>{
  const q=new URL(r.request().url()).searchParams;
  requests.push({search:q.get("search")||"",status:q.get("status")||"all"});
  const all=[{name:"Minh Anh",email:"student@example.test",device:"iPhone",browser:"Safari",ip:"203.0.113.5",lastSeenAt:"2026-10-14T00:00:00Z",newDevice7d:true,changedIp7d:false},
  {name:"Cô Lan",email:"teacher@example.test",device:"Windows",browser:"Chrome",ip:"198.51.100.6",lastSeenAt:"2026-10-13T00:00:00Z",newDevice7d:false,changedIp7d:true}];
  const matching=all.filter(d=>(!q.get("search")||d.email.includes(q.get("search"))||d.ip.includes(q.get("search")))&&
   (!q.get("status")||q.get("status")==="all"||(q.get("status")==="new-device"&&d.newDevice7d)||(q.get("status")==="ip-change"&&d.changedIp7d)));
  return r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
   devices:matching,source:"postgres",summary:{totalDevices:2,uniqueAccounts:2,recent24h:0,newDevices7d:1,changedIp7d:1},pagination:{page:1,limit:20,total:matching.length,pages:1,hasMore:false}
  })});
 });
 await page.goto("/#adminSecurity");
 await expect(page.locator("#content")).toContainText("Chỉ quản trị viên",{timeout:12000});
 await page.evaluate(async()=>{
  await window.SupabaseApp?.ready();
  window.AppAuthBridge.setUser({id:"admin-own",name:"Admin",email:"admin@example.test",role:"admin"});
 });
 await expect(page.locator(".admin-device-history")).toBeVisible({timeout:12000});
 await expect(page.locator(".admin-device-history tbody tr")).toHaveCount(2);
 await expect(page.locator(".admin-device-metric")).toHaveCount(5);
 await expect(page.locator(".admin-device-history")).toContainText("IP đổi 7 ngày");
 await expect(page.locator(".admin-device-history")).toContainText("203.0.113.5");
 await expect(page.locator(".admin-device-history")).toContainText("198.51.100.6");
 await page.locator('#adminDeviceSearchForm input[name="search"]').fill("teacher@example.test");
 await page.locator('#adminDeviceSearchForm button[type="submit"]').click();
 await expect(page.locator(".admin-device-history tbody tr")).toHaveCount(1);
 await expect(page.locator(".admin-device-history")).toContainText("198.51.100.6");
 expect(requests).toEqual(expect.arrayContaining([{search:"teacher@example.test",status:"all"}]));
 await page.locator('#adminDeviceSearchForm select[name="status"]').selectOption("ip-change");
 await page.locator('#adminDeviceSearchForm button[type="submit"]').click();
 await expect(page.locator(".admin-device-history tbody tr")).toHaveCount(1);
 expect(requests).toEqual(expect.arrayContaining([{search:"teacher@example.test",status:"ip-change"}]));
});
