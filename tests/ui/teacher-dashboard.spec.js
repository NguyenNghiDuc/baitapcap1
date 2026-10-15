"use strict";
const {test,expect}=require("@playwright/test");
test.use({serviceWorkers:"block"});
for(const role of ["teacher","admin"]){
 test("Teacher workspace cards are styled and navigable for "+role,async({page},testInfo)=>{
  await page.route("**/api/public-config",route=>route.fulfill({
   status:200,contentType:"application/json",
   body:JSON.stringify({supabase:{enabled:false}})
  }));
  await page.goto("/#teacher");
  await expect(page.locator("#content")).toContainText("Đăng nhập",{timeout:12000});
  await page.evaluate(async selected=>{
   await window.SupabaseApp?.ready();
   window.AppAuthBridge.setUser({
    id:"teacher-dashboard-fixture",role:selected,name:"Giáo viên Test",email:"teacher@example.test"
   });
  },role);
  await expect(page.locator(".teacher-dashboard")).toBeVisible({timeout:12000});
  const cards=page.locator(".teacher-tool-card");
  await expect(cards).toHaveCount(8);
  await expect(page.locator('link[data-lazy-style-src="/css/teacher-dashboard.css"]')).toHaveCount(1);
  const layout=await page.evaluate(()=>{
   const grid=document.querySelector(".teacher-dashboard-grid"),first=grid.querySelector(".teacher-tool-card");
   const c=getComputedStyle(first),g=getComputedStyle(grid);
   return {display:g.display,columns:g.gridTemplateColumns.trim().split(/\s+/).length,
    height:parseFloat(c.minHeight),cardDisplay:c.display,
    gradient:getComputedStyle(document.querySelector(".teacher-dashboard .page-head")).backgroundImage,
    overflowing:document.querySelector("#content").scrollWidth>document.querySelector("#content").clientWidth+2};
  });
  expect(layout.display).toBe("grid");
  expect(layout.columns).toBe(testInfo.project.name==="mobile"?1:3);
  expect(layout.cardDisplay).toBe("flex");
  expect(layout.height).toBeGreaterThanOrEqual(160);
  expect(layout.gradient).toContain("linear-gradient");
  expect(layout.overflowing).toBe(false);
  await page.locator('[data-route="classes"].teacher-tool-card').click();
  await expect(page).toHaveURL(/#classes$/);
 });
}
