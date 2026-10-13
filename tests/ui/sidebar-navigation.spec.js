const {test,expect}=require("@playwright/test");
async function openMenu(page,url="/"){
 await page.goto(url);
 if(await page.locator("#menuBtn").isVisible())await page.locator("#menuBtn").click();
}
test("sidebar groups learning, exams, games and admin in distinct menus",async({page})=>{
 await openMenu(page);
 const sidebar=page.locator("#sidebar");
 for(const group of ["student","exams","games","classes","admin","account","system"])
  await expect(sidebar.locator('[data-nav-group="'+group+'"]')).toHaveCount(1);
 await expect(sidebar.locator('[data-nav-group="admin"]')).toBeHidden();
 await expect(sidebar.locator('[data-nav-group="exams"] a[href="/kiem-tra.html"]')).toContainText("Bài kiểm tra");
 await expect(sidebar.locator('[data-nav-group="games"] a[href="#game"]')).toContainText("Mini game");
 await expect(sidebar.locator('[data-nav-group="student"] a[href="#today"]')).toHaveCount(1);
});
test("search matches categories without Vietnamese accents or spaces",async({page})=>{
 await openMenu(page);
 const search=page.locator("#sidebarSearch");
 await search.fill("minigame");
 await expect(page.locator('[data-nav-group="games"]')).toBeVisible();
 await expect(page.locator('[data-nav-group="games"]')).toHaveAttribute("open","");
 await expect(page.locator('[data-nav-group="exams"]')).toBeHidden();
 await search.fill("bai kiem tra");
 await expect(page.locator('[data-nav-group="exams"]')).toBeVisible();
 await expect(page.locator('[data-nav-group="exams"] a[href="/kiem-tra.html"]')).toBeVisible();
 await search.fill("foobar-no-match");
 await expect(page.locator("#sidebarNoResults")).toBeVisible();
 await search.fill("");
 await expect(page.locator("#sidebarNoResults")).toBeHidden();
});
test("active page expands its menu and protected links stay hidden from visitors",async({page})=>{
 await openMenu(page,"/#history");
 const exams=page.locator('[data-nav-group="exams"]');
 await expect(exams).toHaveAttribute("open","");
 await expect(exams.locator('a[href="#history"]')).toHaveAttribute("aria-current","page");
 await expect(exams.locator('a[href="#questionBank"]')).toBeHidden();
 await expect(page.locator('[data-nav-group="admin"]')).toBeHidden();
});
test("menu search keyboard shortcut focuses input",async({page})=>{
 await openMenu(page);
 await page.keyboard.press("/");
 await expect(page.locator("#sidebarSearch")).toBeFocused();
 await page.locator("#sidebarSearch").fill("toan");
 await page.keyboard.press("Escape");
 await expect(page.locator("#sidebarSearch")).toHaveValue("");
});
test("admin category is available after verified admin login",async({page})=>{
 test.skip(!process.env.E2E_ADMIN_PASSWORD,"Requires disposable E2E admin fixture");
 await openMenu(page);
 await page.locator("#authBtn").click();
 await page.locator('#sbLoginForm input[name="email"]').fill("admin@demo.vn");
 await page.locator('#sbLoginForm input[name="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
 await page.locator("#sbLoginForm .auth-primary").click();
 await expect(page.locator("#sideRole")).toContainText("Quản trị");
 await expect(page.locator('[data-nav-group="admin"]')).toBeVisible();
 await expect(page.locator('[data-nav-group="admin"] a[href="#adminResults"]')).not.toBeHidden();
});


test("profile shell never crashes when role changes from pending to verified Admin",async({page})=>{
 const jsErrors=[];
 page.on("pageerror",err=>jsErrors.push(err.message));
 await openMenu(page,"/#home");
 await page.evaluate(()=>{
  window.AppAuthBridge.setUser({id:"auth-unit-1",name:"Testing Admin",email:"tester@example.test",role:"pending",pendingProfile:true});
 });
 await expect(page.locator("#sideRole")).toContainText("Đang xác thực quyền");
 await page.evaluate(()=>{
  window.AppAuthBridge.setUser({id:"auth-unit-1",name:"Testing Admin",email:"tester@example.test",role:"admin"});
 });
 await expect(page.locator("#sideRole")).toContainText("Quản trị viên");
 await expect(page.locator('[data-nav-group="admin"]')).toBeVisible();
 expect(jsErrors.filter(msg=>/forEach is not a function/.test(msg))).toEqual([]);
});
