"use strict";
const {test,expect}=require("@playwright/test");
test.use({serviceWorkers:"block"});
async function openAdmin(page){
 await page.route("**/api/public-config",r=>r.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify({supabase:{enabled:false}})
 }));
 await page.goto("/");
 await expect(page.locator("#content .hero h1")).toBeVisible({timeout:12000});
 await page.evaluate(async()=>{
  await window.SupabaseApp?.ready();
  window.AppAuthBridge.setUser({id:"admin-theme-fixture",role:"admin",name:"Admin UI",email:"theme@example.test"});
  location.hash="#adminCenter";
 });
 await expect(page.locator(".admin-center")).toBeVisible({timeout:12000});
 await expect(page.locator('link[data-lazy-style-src="/css/admin-console.css"]')).toHaveCount(1);
}
test("Admin orange design applies to header and sidebar without exposing it to guests",async({page})=>{
 await page.goto("/#adminCenter");
 await expect(page.locator("#content")).toContainText("Chỉ quản trị viên",{timeout:12000});
 await expect(page.locator('[data-nav-group="admin"]')).toBeHidden();
 await expect(page.locator('link[data-lazy-style-src="/css/admin-console.css"]')).toHaveCount(0);
 await openAdmin(page);
 const styles=await page.evaluate(()=>{
  const header=document.querySelector("#content .page-head");
  const group=document.querySelector('#sidebar [data-nav-group="admin"]');
  const icon=group.querySelector(".sidebar-nav-icon");
  const active=group.querySelector('.admin-nav-section a[href="#adminCenter"]');
  return {header:getComputedStyle(header).backgroundImage,icon:getComputedStyle(icon).backgroundImage,
   activeBackground:getComputedStyle(active).backgroundImage};
 });
 expect(styles.header).toContain("rgb(127, 50, 14)");
 expect(styles.icon).toContain("rgb(255, 173, 82)");
 expect(styles.activeBackground).toContain("rgba(");
});
test("Admin orange theme remains legible in dark mode and mobile",async({page},testInfo)=>{
 await openAdmin(page);
 await page.evaluate(()=>{document.documentElement.dataset.theme="dark"});
 const styles=await page.evaluate(()=>{
  const head=document.querySelector("#content .page-head");
  const content=document.querySelector("#content");
  const group=document.querySelector('#sidebar [data-nav-group="admin"]');
  return {header:getComputedStyle(head).backgroundImage,
   text:getComputedStyle(head.querySelector("h1")).color,
   sidebar:getComputedStyle(group).backgroundImage,
   bodyWidth:content.scrollWidth,visibleWidth:content.clientWidth,
   columns:getComputedStyle(content.querySelector(".admin-center-stats")).gridTemplateColumns};
 });
 expect(styles.header).toContain("rgb(85, 39, 9)");
 expect(styles.text).toBe("rgb(255, 255, 255)");
 expect(styles.sidebar).toContain("rgba(");
 if(testInfo.project.name==="mobile"){
  expect(styles.bodyWidth).toBeLessThanOrEqual(styles.visibleWidth+2);
  expect(styles.columns.split(" ").length).toBe(2);
 }
});
