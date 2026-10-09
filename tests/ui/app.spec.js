const {test,expect}=require("@playwright/test");
test("home renders without white screen",async({page})=>{await page.goto("/");await expect(page.getByText("Bài Tập",{exact:false}).first()).toBeVisible();await expect(page.locator("#content")).not.toBeEmpty()});
test("polished auth modal has login and register flows",async({page})=>{await page.goto("/");await page.locator("#authBtn").click();await expect(page.locator(".auth-modal")).toBeVisible();await expect(page.getByRole("button",{name:"Đăng nhập",exact:true}).first()).toBeVisible();await page.getByRole("button",{name:"Đăng ký",exact:true}).click();await expect(page.locator("#sbRegisterForm")).toBeVisible();await expect(page.locator("#regPassword")).toBeVisible()});
test("demo admin can login through fallback auth",async({page})=>{await page.goto("/");await page.locator("#authBtn").click();await page.locator('#sbLoginForm input[name="email"]').fill("admin@demo.vn");await page.locator('#sbLoginForm input[name="password"]').fill("27032006");await page.locator("#sbLoginForm .auth-primary").click();await expect(page.locator("#sideRole")).toContainText("Quản trị")});
test("term exam catalog renders daily and semester exams",async({page})=>{await page.goto("/#tests");await expect(page.getByText("Kiểm tra theo môn, học kỳ",{exact:false})).toBeVisible();await expect(page.getByText("Toán hôm nay",{exact:false}).first()).toBeVisible();await expect(page.locator(".term-exam")).toHaveCount(216)});
test("mobile navigation opens",async({page},testInfo)=>{test.skip(testInfo.project.name!=="mobile","mobile only");await page.goto("/");await page.locator("#menuBtn").click();await expect(page.locator("#sidebar")).toHaveClass(/open/)});

test("exercise navigation works and answers survive reload",async({page})=>{
 await page.goto("/#subjects");
 await expect(page.locator("#lessonResults")).toBeVisible();
 await page.locator("#lessonResults [data-start]").first().click();
 await expect(page).toHaveURL(/#practice$/);
 await expect(page.locator(".locked-exam-shell")).toBeVisible();
 await expect(page.locator(".locked-question-card .options [data-answer]")).toHaveCount(4);
 await page.locator(".locked-question-card [data-answer]").first().click();
 await expect(page.locator(".locked-question-card [data-answer]").first()).toHaveClass(/selected/);
 await page.reload();
 await expect(page).toHaveURL(/#practice$/);
 await expect(page.locator(".locked-exam-shell")).toBeVisible();
 await expect(page.locator(".locked-question-card [data-answer]").first()).toHaveClass(/selected/);
 await page.locator("#lockedNext").click();
 await expect(page.locator(".locked-progress-card")).toContainText("Câu 2/");
});
test("exercise from home opens and can submit",async({page})=>{
 await page.goto("/");
 await page.locator(".lesson-row [data-start]").first().click();
 await expect(page).toHaveURL(/#practice$/);
 await expect(page.locator(".locked-exam-shell")).toBeVisible();
 page.once("dialog",dialog=>dialog.accept());
 await page.locator("#lockedSubmit").click();
 await expect(page.locator(".result-card")).toBeVisible();
 await page.locator("#goHistory").click();
 await expect(page).toHaveURL(/#history$/);
});
test("practice route without a saved quiz offers a way back",async({page})=>{
 await page.goto("/#practice");
 await expect(page.getByText("Chưa có bài tập đang làm")).toBeVisible();
 await page.locator('[data-route="subjects"]').click();
 await expect(page).toHaveURL(/#subjects$/);
});

test("exercise fallback still works if primary renderer is unavailable",async({page})=>{
 await page.goto("/#subjects");await expect(page.locator("#lessonResults")).toBeVisible();
 await page.evaluate(()=>{delete window.LockedExamUI});
 await page.locator("#lessonResults [data-start]").first().click();
 await expect(page.locator("[data-fallback-answer]")).toHaveCount(4);
 await page.locator("[data-fallback-answer]").first().click();
 await expect(page.locator("[data-fallback-answer].selected")).toHaveCount(1);
});
