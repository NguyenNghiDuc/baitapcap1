"use strict";
const {test,expect}=require("@playwright/test");
test.use({serviceWorkers:"block"});
test("guests cannot open Admin integrity page or load private styles",async({page})=>{
 await page.goto("/#adminIntegrity");
 await expect(page.locator("#content")).toContainText("Chỉ quản trị viên",{timeout:12000});
 await expect(page.locator(".admin-integrity-page")).toHaveCount(0);
 await expect(page.locator('link[data-lazy-style-src="/css/admin-integrity.css"]')).toHaveCount(0);
});
test("Admin integrity UI shows genuine findings and unavailable checks without repair controls",async({page})=>{
 await page.route("**/api/public-config",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({supabase:{enabled:false}})}));
 await page.route("**/api/admin/integrity",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
  source:"postgresql",readonly:true,checkedAt:"2026-10-13T00:00:00Z",
  statement:"Không thay thế kiểm toán dữ liệu.",counts:{ok:1,problem:1,warning:0,unavailable:1},
  checks:[
   {id:"table_users",name:"Bảng users",state:"ok",detail:"Có trong database."},
   {id:"result_ranges",name:"Điểm bài kiểm tra bất thường",state:"problem",detail:"Có ít nhất một bản ghi cần kiểm tra thủ công."},
   {id:"migration_status",name:"Trạng thái migration",state:"unavailable",detail:"Không đọc được lịch sử migration."}
  ]
 })}));
 await page.goto("/#adminIntegrity");
 await expect(page.locator("#content")).toContainText("Chỉ quản trị viên",{timeout:12000});
 await page.evaluate(async()=>{
  await window.SupabaseApp?.ready();
  window.AppAuthBridge.setUser({id:"admin-test",role:"admin",name:"Admin UI",email:"admin@sample.invalid"});
 });
 await expect(page.locator(".admin-integrity-page")).toBeVisible({timeout:12000});
 await expect(page.locator(".admin-integrity-check")).toHaveCount(3);
 await expect(page.locator('.admin-integrity-check[data-state="problem"]')).toContainText("Điểm bài kiểm tra bất thường");
 await expect(page.locator('.admin-integrity-check[data-state="unavailable"]')).toContainText("Chưa xác minh");
 await expect(page.locator("#adminIntegrityRefresh")).toBeVisible();
 await expect(page.locator('link[data-lazy-style-src="/css/admin-integrity.css"]')).toHaveCount(1);
 await expect(page.getByRole("button",{name:/Xóa dữ liệu|Chạy migration|Tự động sửa/})).toHaveCount(0);
});
