const {test,expect}=require("@playwright/test");

test("long local result history mounts only visible rows",async({page})=>{
 await page.goto("/");
 await page.evaluate(()=>{
  const all=Array.from({length:600},(_,i)=>({title:"Bài thử "+i,subject:"math",score:60,date:"13/10/2026",clientSubmissionId:"test-"+i}));
  localStorage.setItem("bt_results",JSON.stringify(all));
 });
 await page.goto("/#history");
 await expect(page.locator("#historyVirtualScroll .virtual-viewport")).toBeVisible();
 const count=await page.locator(".virtual-history-row").count();
 expect(count).toBeGreaterThan(0);
 expect(count).toBeLessThan(60);
 await expect(page.locator(".virtual-history-row").first()).toContainText("Bài thử 599");
});
test("offline pending work is partitioned per account",async({page})=>{
 await page.goto("/");
 const result=await page.evaluate(()=>{
  const q=window.OfflineSyncQueue;
  q.setOwner({email:"first@example.test"});
  q.enqueueResult({clientSubmissionId:"fixture-a",title:"A"});
  const a=q.count();
  q.setOwner({email:"second@example.test"});
  const b=q.count();
  q.setOwner({email:"first@example.test"});
  const back=q.count();
  q.setOwner(null);
  return {a,b,back,guest:q.count()};
 });
 expect(result).toEqual({a:1,b:0,back:1,guest:0});
});
