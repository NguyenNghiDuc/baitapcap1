"use strict";
const {test,expect}=require("@playwright/test");
test.use({serviceWorkers:"block"});
test("students cannot load correction-review pages",async({page})=>{
 await page.goto("/#gradeReviews");
 await expect(page.locator("#content")).toContainText("Chỉ giáo viên/Admin",{timeout:12000});
 await expect(page.locator('link[data-lazy-style-src="/css/grade-reviews.css"]')).toHaveCount(0);
});
test("teacher sees only own correction requests and Admin can approve mocked requests",async({page})=>{
 await page.route("**/api/public-config",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({supabase:{enabled:false}})}));
 const changes=[];let done=false;
 await page.route("**/api/grade-reviews?**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
  reviews:[{id:"r1",submissionId:"s1",assignmentTitle:"Toán 4",studentName:"Học sinh",requesterName:"Cô giáo",
   oldScore:70,newScore:85,reason:"Sai cách cộng hai câu",feedback:"",status:done?"approved":"pending",createdAt:"2026-10-13T00:00:00Z"}],
  pagination:{page:1,limit:20,total:1,pages:1}
 })}));
 await page.route("**/api/grade-reviews/r1/decision",r=>{changes.push(r.request().postDataJSON());done=true;return r.fulfill({status:200,contentType:"application/json",body:'{"review":{"status":"approved"}}'})});
 await page.goto("/#gradeReviews");
 await expect(page.locator("#content")).toContainText("Chỉ giáo viên/Admin",{timeout:12000});
 await page.evaluate(async()=>{
  await window.SupabaseApp?.ready();
  window.AppAuthBridge.setUser({id:"adm",name:"Admin",email:"admin@example.test",role:"admin"});
 });
 await expect(page.locator(".grade-review-page")).toBeVisible({timeout:12000});
 await expect(page.locator(".grade-review-row")).toHaveCount(1);
 await expect(page.locator(".grade-review-row")).toContainText("70%");
 await expect(page.locator(".grade-review-row")).toContainText("85%");
 await page.evaluate(()=>window.confirm=()=>true);
 await page.locator('button[name="decision"][value="approve"]').click();
 await expect(page.locator('.grade-review-badge[data-status="approved"]')).toBeVisible({timeout:12000});
 expect(changes).toHaveLength(1);expect(changes[0].decision).toBe("approve");
});
