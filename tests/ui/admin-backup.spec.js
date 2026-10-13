"use strict";
const {test,expect}=require("@playwright/test");
test.use({serviceWorkers:"block"});
test("guests cannot load the backup center or its Admin stylesheet",async({page})=>{
 await page.goto("/#adminBackup");
 await expect(page.locator("#content")).toContainText("Chỉ quản trị viên",{timeout:12000});
 await expect(page.locator(".admin-backup-page")).toHaveCount(0);
 await expect(page.locator('link[data-lazy-style-src="/css/admin-backup.css"]')).toHaveCount(0);
});
test("owner-ready preview is status-only and cannot restore via browser",async({page})=>{
 await page.route("**/api/public-config",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({supabase:{enabled:false}})}));
 await page.route("**/api/admin/backup/status",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
  database:{configured:true,healthy:true},
  snapshotEncryption:{configured:true,algorithm:"AES-256-GCM"},
  environment:{serverless:true,storageMode:"supabase"},
  manualBackupReady:false,fullBackupVerified:false,lastBackupAt:null,scope:"app_state_only",
  notice:"Chưa xác minh backup ngoài máy chủ.",generatedAt:"2026-10-13T00:00:00Z"
 })}));
 await page.goto("/#adminBackup");
 await expect(page.locator("#content")).toContainText("Chỉ quản trị viên",{timeout:12000});
 await page.evaluate(async()=>{
  await window.SupabaseApp?.ready();
  window.AppAuthBridge.setUser({id:"admin",name:"Admin QA",role:"admin",email:"admin@example.test"});
 });
 await expect(page.locator(".admin-backup-page")).toBeVisible({timeout:12000});
 await expect(page.locator(".admin-backup-page")).toContainText("AES-256-GCM");
 await expect(page.locator(".admin-backup-page")).toContainText("Vercel không lưu file bền vững");
 await expect(page.locator(".admin-backup-page")).toContainText("Chưa xác minh");
 await expect(page.locator(".admin-backup-page")).toContainText("--verify");
 await expect(page.locator('link[data-lazy-style-src="/css/admin-backup.css"]')).toHaveCount(1);
 await expect(page.locator('[id*="adminRestore"],[data-action="restore"]')).toHaveCount(0);
});
