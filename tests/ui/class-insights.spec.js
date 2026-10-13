"use strict";
const {test,expect}=require("@playwright/test");
test.use({serviceWorkers:"block"});
test("guest and student routes avoid loading staff data and CSS",async({page})=>{
 await page.goto("/#classInsights");
 await expect(page.locator("#content")).toContainText("Chỉ giáo viên/Admin",{timeout:12000});
 await expect(page.locator(".class-insights-page")).toHaveCount(0);
 await expect(page.locator('link[data-lazy-style-src="/css/class-insights.css"]')).toHaveCount(0);
});
test("teacher can view class insights via lazy module without student records",async({page})=>{
 await page.route("**/api/public-config",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({supabase:{enabled:false}})}));
 await page.route("**/api/teacher/class-insights?**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
  classes:[{id:"a",name:"4A",grade:4,studentCount:3,assignmentCount:2,submissionAttempts:5,
   uniqueSubmitted:4,pendingReview:2,gradedAttempts:3,completionRate:67,lastAssignmentAt:null}],
  pagination:{page:1,limit:12,total:1,pages:1},note:"Đây là dữ liệu tổng hợp."
 })}));
 await page.goto("/#classInsights");
 await expect(page.locator("#content")).toContainText("Chỉ giáo viên/Admin",{timeout:12000});
 await page.evaluate(async()=>{
  await window.SupabaseApp?.ready();
  window.AppAuthBridge.setUser({id:"teacher-qa",name:"Cô giáo",role:"teacher",email:"teacher@demo.invalid"});
 });
 await expect(page.locator(".class-insights-page")).toBeVisible({timeout:12000});
 await expect(page.locator(".class-insights-card")).toHaveCount(1);
 await expect(page.locator(".class-insights-card")).toContainText("4A");
 await expect(page.locator(".class-insights-card")).toContainText("67%");
 await expect(page.locator(".class-insights-card")).toContainText("2");
 await expect(page.locator("#classInsightsPrev")).toBeDisabled();
 await expect(page.locator('link[data-lazy-style-src="/css/class-insights.css"]')).toHaveCount(1);
 await expect(page.locator(".class-insights-page")).not.toContainText("teacher@demo.invalid");
});
