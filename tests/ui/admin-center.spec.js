"use strict";
const {test,expect}=require("@playwright/test");
test("guest cannot open the Admin Center or see Admin categories",async({page})=>{
 await page.goto("/#adminCenter");
 await expect(page.locator("#content")).toContainText("Chỉ quản trị viên",{timeout:10000});
 await expect(page.locator(".admin-center-grid")).toHaveCount(0);
 await expect(page.locator('[data-nav-group="admin"]')).toBeHidden();
});
test("verified Admin UI bridge displays eight working menu groups and roadmap search",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/");
 await expect(page.locator("#content .hero h1")).toBeVisible();
 // UI-only role simulation. API authorization is covered independently by server tests.
 await page.evaluate(()=>{
  window.AppAuthBridge.setUser({id:"admin-ui-test",role:"admin",name:"UI Test Admin",email:"ui-admin@example.test"});
  location.hash="#adminCenter";
 });
 await expect(page.locator(".admin-center")).toBeVisible({timeout:12000});
 await expect(page.locator(".admin-center-group")).toHaveCount(8);
 await expect(page.locator(".admin-center-feature")).toHaveCount(12);
 await expect(page.locator("#adminCenterFilters")).toBeVisible();
 await expect(page.locator('[data-nav-group="admin"]')).toBeVisible();
 const allLinks=page.locator('[data-nav-group="admin"] .admin-only');
 await expect(allLinks).toHaveCount(17);
 await page.locator('#adminCenterFilters input[name="search"]').fill("phân quyền");
 await page.locator('#adminCenterFilters button[type="submit"]').click();
 await expect(page.locator(".admin-center-feature")).not.toHaveCount(0);
 await expect(page.locator(".admin-center-pager")).toContainText("kết quả");
 await page.locator("#sidebarSearch").fill("Nhật ký");
 await expect(page.locator('[data-admin-section="security"]')).toBeVisible();
 await expect(page.locator('[data-admin-section="exams"]')).toBeHidden();
 expect(errors).toEqual([]);
});
