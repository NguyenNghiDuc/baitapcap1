"use strict";
const {test,expect}=require("@playwright/test");
test.use({serviceWorkers:"block"});
for(const role of ["teacher","admin"]){
 test("Teacher workspace cards are styled and navigable for "+role,async({page},testInfo)=>{
  await page.route("**/api/teacher/overview",route=>route.fulfill({
   status:200,contentType:"application/json",body:JSON.stringify({
    counts:{classes:2,students:27,assignments:8,pendingGrading:3},
    recentAssignments:[
     {id:"assignment-1",title:"Toán luyện tập tuần 1",className:"Lớp 4A",deadline:"2026-10-21T00:00:00Z"}
    ]
   })
  }));
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
  await expect(page.locator("[data-teacher-count]")).toHaveCount(4);
  await expect(page.locator('[data-teacher-count="classes"]')).toHaveText("2");
  await expect(page.locator('[data-teacher-count="students"]')).toHaveText("27");
  await expect(page.locator('[data-teacher-count="assignments"]')).toHaveText("8");
  await expect(page.locator('[data-teacher-count="pendingGrading"]')).toHaveText("3");
  await expect(page.locator("#teacherRecentAssignments")).toContainText("Toán luyện tập tuần 1");
  await expect(page.locator('script[data-lazy-src="/js/teacher/overview.js"]')).toHaveCount(1);

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

test("Teacher dashboard stays navigable if the summary service is unavailable",async({page})=>{
 await page.route("**/api/public-config",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify({supabase:{enabled:false}})
 }));
 await page.route("**/api/teacher/overview",route=>route.fulfill({
  status:503,contentType:"application/json",body:JSON.stringify({error:"Unavailable"})
 }));
 await page.goto("/#teacher");
 await expect(page.locator("#content")).toContainText("Đăng nhập",{timeout:12000});
 await page.evaluate(async()=>{
  await window.SupabaseApp?.ready();
  window.AppAuthBridge.setUser({id:"teacher-test",role:"teacher",name:"Teacher",email:"teacher@example.test"});
 });
 await expect(page.locator(".teacher-dashboard")).toBeVisible({timeout:12000});
 await expect(page.locator('[data-teacher-count="classes"]')).toHaveText("—");
 await expect(page.locator("#teacherOverviewStatus")).toContainText("Không tải được",{timeout:12000});
 await expect(page.locator(".teacher-tool-card")).toHaveCount(8);
 await page.locator('[data-route="classes"].teacher-tool-card').click();
 await expect(page).toHaveURL(/#classes$/);
});
