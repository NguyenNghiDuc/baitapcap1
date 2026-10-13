"use strict";
const {test,expect}=require("@playwright/test");
const ADMIN_ASSETS=["admin-users.css","admin-results.css","admin-console.css","admin-audit.css"];
test("guest first paint avoids Admin-only CSS and stays interactive",async({page})=>{
 const failures=[];page.on("pageerror",e=>failures.push(e.message));
 await page.goto("/");
 await expect(page.locator("#content .hero h1")).toBeVisible();
 const measurements=await page.evaluate(()=>({
  scripts:document.querySelectorAll('script[src]').length,
  coreStyles:document.querySelectorAll('link[rel="stylesheet"][href*="/css/"],link[rel="stylesheet"][href^="css/"]').length,
  adminStyles:[...document.querySelectorAll('link[rel="stylesheet"]')].filter(l=>/\/css\/admin-(users|console|results|audit)\.css/.test(new URL(l.href).pathname)).length,
  content:document.querySelector("#content")?.textContent?.trim().length||0
 }));
 expect(measurements.scripts).toBeLessThanOrEqual(30);
 expect(measurements.coreStyles).toBeLessThanOrEqual(10);
 expect(measurements.adminStyles).toBe(0);
 expect(measurements.content).toBeGreaterThan(80);
 expect(failures).toEqual([]);
});
test("unauthenticated private pages show clear guidance without extra private assets",async({page})=>{
 for(const route of ["adminAlerts","adminCenter","admin","adminUsers","adminResults","adminAudit","performanceMonitor","storageHealth","profile"]){
  await page.goto("/#"+route);
  await expect(page.locator("#content")).toContainText(/Đăng nhập|quản trị viên/i);
  await expect(page.locator("#content .perf-skeleton")).toHaveCount(0);
 }
 const extra=await page.locator('link[data-lazy-style-src*="admin-"]').count();
 expect(extra).toBe(0);
});
test("core study screens navigate without blank results or runtime crashes",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 for(const route of ["home","subjects","history","ai","wrongReview","adaptive","bookmarks","practice","today"]){
  await page.goto("/#"+route);
  await expect(page.locator("#content .perf-skeleton")).toHaveCount(0,{timeout:12000});
  const content=await page.locator("#content").innerText();
  expect(content.trim().length,route).toBeGreaterThan(15);
  expect(content,route).not.toMatch(/Chức năng này đang tạm lỗi|Module chưa tải|⚠️ Có lỗi/);
 }
 expect(errors).toEqual([]);
});
test("Admin audit is accessible only to a verified Admin and its CSS is lazy",async({page})=>{
 test.skip(!process.env.E2E_ADMIN_PASSWORD,"Requires disposable local Admin fixture");
 await page.goto("/");
 await page.locator("#authBtn").click();
 await page.locator('#sbLoginForm input[name="email"]').fill("admin@demo.vn");
 await page.locator('#sbLoginForm input[name="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
 await page.locator("#sbLoginForm .auth-primary").click();
 await expect(page.locator("#sideRole")).toContainText("Quản trị",{timeout:10000});
 await page.goto("/#adminAudit");
 await expect(page.locator(".admin-audit-page")).toBeVisible({timeout:12000});
 await expect(page.locator('link[data-lazy-style-src="/css/admin-audit.css"]')).toHaveCount(1);
 await expect(page.locator('link[data-lazy-style-src="/css/admin-console.css"]')).toHaveCount(1);
 for(const asset of ADMIN_ASSETS.filter(x=>!["admin-audit.css","admin-console.css"].includes(x)))
  await expect(page.locator('link[data-lazy-style-src="/css/'+asset+'"]')).toHaveCount(0);
 await expect(page.locator("#adminAuditSearch")).toBeVisible();
});
