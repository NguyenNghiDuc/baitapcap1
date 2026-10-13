"use strict";
const {test,expect}=require("@playwright/test");
async function adminSession(page,route){
 await page.goto("/");
 await expect(page.locator("#content .hero h1")).toBeVisible();
 await page.evaluate(r=>{
  window.AppAuthBridge.setUser({id:"admin-test-ui",name:"Admin test",role:"admin",email:"admin@example.test"});
  location.hash=r;
 },route);
}
test("alert center renders severity cards from authenticated API response",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.route("**/api/admin/alerts",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
  incidents:[{id:"db",severity:"critical",title:"Database không sẵn sàng",detail:"Không thể kết nối"}],
  counts:{critical:1,warning:0,info:0},windowMinutes:15,sampleCount:12,generatedAt:new Date().toISOString(),scope:"current-server-instance"
 })}));
 await adminSession(page,"adminAlerts");
 await expect(page.locator(".admin-alerts-page")).toBeVisible({timeout:12000});
 await expect(page.locator(".admin-alerts-item")).toHaveCount(1);
 await expect(page.locator(".admin-alerts-item")).toContainText("Database không sẵn sàng");
 await expect(page.locator('link[data-lazy-style-src="/css/admin-alerts.css"]')).toHaveCount(1);
 await expect(page.locator("#adminAlertsRefresh")).toBeVisible();
 expect(errors).toEqual([]);
});
test("filtered Admin scores can be exported to an Excel-readable CSV",async({page})=>{
 await page.route("**/api/admin/results?**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
  results:[{id:"r1",owner:{name:"Học sinh A",email:"a@example.test"},title:"Toán",subject:"math",grade:4,score:90,correct:9,total:10,createdAt:"2026-10-13T00:00:00Z"}],
  pagination:{page:1,limit:20,total:1,pages:1,hasMore:false},source:"postgres"
 })}));
 const urls=[];
 await page.route("**/api/admin/results/export?**",r=>{
  urls.push(r.request().url());
  return r.fulfill({status:200,headers:{"Content-Type":"text/csv; charset=utf-8"},body:"\ufeffTên,Điểm\r\nA,90\r\n"});
 });
 await adminSession(page,"adminResults");
 await expect(page.locator("#adminResultsExportCsv")).toBeVisible({timeout:12000});
 await page.locator('#adminResultsFilter select[name="grade"]').selectOption("4");
 await page.locator('#adminResultsFilter select[name="subject"]').selectOption("math");
 await page.locator('#adminResultsFilter button[type="submit"]').click();
 await expect(page.locator("#adminResultsExportCsv")).toBeVisible();
 const pending=page.waitForEvent("download");
 await page.locator("#adminResultsExportCsv").click();
 const download=await pending;
 expect(download.suggestedFilename()).toMatch(/bang-diem-.*\.csv/);
 expect(urls.length).toBe(1);
 expect(new URL(urls[0]).searchParams.get("grade")).toBe("4");
 expect(new URL(urls[0]).searchParams.get("subject")).toBe("math");
});
