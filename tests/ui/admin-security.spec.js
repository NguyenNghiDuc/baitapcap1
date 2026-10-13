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
