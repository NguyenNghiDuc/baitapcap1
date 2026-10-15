"use strict";
const {test,expect}=require("@playwright/test");
test.use({serviceWorkers:"block"});
const users=[
 {id:"student-a",name:"Minh Anh",email:"student@example.test",role:"student",grade:4,locked:false},
 {id:"student-b",name:"Ngọc",email:"second@example.test",role:"student",grade:5,locked:true},
 {id:"teacher-a",name:"Cô Lan",email:"teacher@example.test",role:"teacher",grade:null,locked:false},
 {id:"admin-a",name:"Quản trị",email:"admin@example.test",role:"admin",grade:null,locked:false}
];
test("Admin users filter role and locked accounts and reset without losing management actions",async({page})=>{
 const requested=[];
 await page.route("**/api/public-config",r=>r.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify({supabase:{enabled:false}})
 }));
 await page.route("**/api/admin/users?**",r=>{
  const q=new URL(r.request().url()).searchParams;
  requested.push({role:q.get("role")||"",status:q.get("accountStatus")||"",page:q.get("page")||""});
  let filtered=users.filter(u=>(!q.get("role")||u.role===q.get("role"))&&
   (!q.get("accountStatus")||(q.get("accountStatus")==="locked"?u.locked:!u.locked)));
  const needle=(q.get("search")||"").toLowerCase();
  if(needle)filtered=filtered.filter(u=>(u.name+" "+u.email+" "+u.role).toLowerCase().includes(needle));
  const pageNumber=Number(q.get("page")||1),limit=Number(q.get("limit")||30);
  const pageUsers=filtered.slice((pageNumber-1)*limit,pageNumber*limit);
  return r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
   users:pageUsers,allUsersTotal:users.length,
   accountSummary:{roles:{student:2,parent:0,teacher:1,admin:1},unlocked:3,locked:1,total:4},
   durable:true,presenceAvailable:false,
   canGrantAdmin:false,pagination:{page:pageNumber,limit,total:filtered.length,
    pages:Math.ceil(filtered.length/limit),hasMore:pageNumber*limit<filtered.length}
  })});
 });
 await page.goto("/#adminUsers");
 await expect(page.locator("#content")).toContainText("Chỉ quản trị viên",{timeout:12000});
 await page.evaluate(async()=>{
  await window.SupabaseApp?.ready();
  window.AppAuthBridge.setUser({id:"fixture-admin",name:"Admin fixture",role:"admin",email:"fixture@example.test"});
 });
 await expect(page.locator("#adminUsersRoleFilter")).toBeVisible({timeout:12000});
 await expect(page.locator(".admin-users-table-card tbody tr")).toHaveCount(4);
 await expect(page.locator('[data-user-save]')).toHaveCount(4);
 await expect(page.locator(".admin-users-role-card")).toHaveCount(6);
 await expect(page.locator('[data-users-summary-role="student"]')).toContainText("2");
 await expect(page.locator('[data-users-summary-role="admin"]')).toContainText("1");
 await expect(page.locator('[data-users-summary-status="locked"]')).toContainText("1");
 await page.locator('[data-users-summary-role="student"]').click();
 await expect(page.locator("#adminUsersRoleFilter")).toHaveValue("student");
 await expect(page.locator('[data-users-summary-role="student"]')).toHaveAttribute("aria-pressed","true");
 await expect(page.locator(".admin-users-table-card tbody tr")).toHaveCount(2);
 await page.locator('[data-users-summary-status="locked"]').click();
 await expect(page.locator("#adminUsersStatusFilter")).toHaveValue("locked");
 await expect(page.locator(".admin-users-table-card tbody tr")).toHaveCount(1);
 await expect(page.locator(".admin-users-table-card")).toContainText("Ngọc");
 await expect(page.locator(".admin-users-table-card")).not.toContainText("Minh Anh");
 await expect(page.locator("#adminUsersRoleFilter")).toHaveValue("student");
 await expect(page.locator("#adminUsersStatusFilter")).toHaveValue("locked");
 await page.locator("#adminUsersResetFilters").click();
 await expect(page.locator(".admin-users-table-card tbody tr")).toHaveCount(4);
 await expect(page.locator("#adminUsersStatusFilter")).toHaveValue("");
 await expect(page.locator("#adminUsersRoleFilter")).toHaveValue("");
 expect(requested).toEqual(expect.arrayContaining([
  {role:"student",status:"",page:"1"},
  {role:"student",status:"locked",page:"1"},
  {role:"",status:"",page:"1"}
 ]));
});
