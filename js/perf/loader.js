window.PerfLoader=(()=>{
 const loaded=new Map(),prefetched=new Set();let hashPromise=null,prefetchTimer=null;
 const routeFiles={
  tests:["/js/exams/interaction.js","/js/exams/term-exams.js","/js/exams/runner.js","/js/exams/catalog.js"],
  profile:["/js/student/profile-page.js","/js/supabase/storage.js"],
  adminResults:["/js/admin/results.js"],
  adminAudit:["/js/admin/audit-log.js"],
  history:["/js/perf/virtual-list.js"],
  performanceMonitor:["/js/admin/performance-monitor.js"],
  accountSecurity:["/js/auth/account-security.js"],
  liveClassroom:["/js/supabase/realtime.js","/js/teacher/live-classroom.js"],
  today:["/js/student/dashboard.js"],goals:["/js/student/goals.js"],formulas:["/js/student/formulas.js"],vocab:["/js/student/vocab.js"],
  accessibility:["/js/student/accessibility.js"],notes:["/js/student/notes.js"],wrongReview:["/js/student/review.js"],quickPractice:["/js/student/quick-practice.js"],
  studyPath:["/js/student/study-path.js"],languageLab:["/js/student/language.js"],adaptive:["/js/student/adaptive.js"],speech:["/js/student/speech.js"],
  schedule:["/js/student/schedule.js"],worksheet:["/js/student/worksheet.js"],profileStats:["/js/student/profile-stats.js"],missions:["/js/student/missions.js"],
  leaderboard:["/js/student/leaderboard.js"],bookmarks:["/js/student/bookmarks.js"],prepPlan:["/js/student/prep-plan.js"],writing:["/js/student/writing.js"],
  handwriting:["/js/perf/image-opt.js","/js/supabase/storage.js","/js/student/handwriting.js"],sync:["/js/student/sync.js"],targetScore:["/js/student/target-score.js"],
  topics:["/js/student/topics.js"],mathWork:["/js/student/math-work.js"],premium:["/js/student/demo-wallet.js"],settings:["/js/student/settings.js"],updateCenter:["/js/student/update-center.js"],
  offlineCenter:["/js/student/offline-center.js"],smartNotify:["/js/student/smart-notify.js"],rewards:["/js/student/rewards.js"],gameMap:["/js/student/parent-lock.js","/js/student/game-map.js"],
  friends:["/js/student/friends.js"],aiQuestion:["/js/student/ai-question.js"],ocrScan:["/js/student/ocr-scan.js"],advancedDashboard:["/js/student/advanced-dashboard.js"],
  parentLock:["/js/student/parent-lock.js"],certificate:["/js/student/certificate.js"],helpFeedback:["/js/student/help-feedback.js"],personalExam:["/js/student/personal-exam.js"],
  mastery:["/js/student/mastery.js"],interactiveExercises:["/js/student/interactive-exercises.js"],featureHub:["/js/student/feature-hub.js"],
  historyCompare:["/js/student/history-compare.js"],performanceMode:["/js/student/performance-mode.js"],chapterAchievements:["/js/student/chapter-achievements.js"],
  materials:["/js/perf/image-opt.js","/js/supabase/storage.js","/js/teacher/material-storage.js"]
 };
 async function versioned(src){if(!hashPromise)hashPromise=Promise.race([fetch("/asset-hashes.json",{cache:"force-cache"}).then(r=>r.ok?r.json():null).catch(()=>null),new Promise(resolve=>setTimeout(()=>resolve(null),350))]);const m=await hashPromise,h=m?.hashes?.[src];return h?src+"?h="+h:src}
 async function script(src){
  if(loaded.has(src))return loaded.get(src);
  if(document.querySelector(`script[data-lazy-src="${src}"]`))return Promise.resolve();
  const resolved=await versioned(src);const p=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=resolved;s.async=true;s.dataset.lazySrc=src;s.onload=()=>resolve();s.onerror=()=>{loaded.delete(src);reject(new Error("Không tải được "+src))};document.head.appendChild(s)});
  loaded.set(src,p);return p
 }
 async function ensureRoute(route){
  // Exam modules are preloaded in index.html. Do not block exams on config or asset-hash requests.
  if(route==="tests"&&window.TermExamBank&&window.TermExamCatalog&&window.ExamRunner&&window.ExamInteraction)return;
  // Feature flags are fetched in the background; do not hold every page on this API.
  if(route!=="tests")window.RuntimeGuard?.ready?.();
  if(window.RuntimeGuard&&!window.RuntimeGuard.enabled(route))throw new Error("Chức năng này đang được tạm tắt để bảo trì");
  const files=routeFiles[route]||[];
  if(["profile","handwriting","materials"].includes(route))await Promise.all(files.map(script));
  else for(const src of files)await script(src)
 }
 function prefetch(route){
  const files=routeFiles[route]||[];
  if(!files.length||navigator.connection?.saveData||navigator.connection?.effectiveType==="2g")return;
  const run=async()=>{
   for(const src of files.slice(0,4)){
    if(loaded.has(src)||prefetched.has(src)||prefetched.size>=16)continue;
    prefetched.add(src);
    const link=document.createElement("link");
    link.rel="prefetch";link.as="script";link.dataset.prefetchSrc=src;
    link.href=await versioned(src);
    document.head.appendChild(link);
   }
  };
  if("requestIdleCallback" in window)requestIdleCallback(()=>run(),{timeout:1600});
  else setTimeout(()=>run(),200);
 }
 function skeleton(route){
  const isTable=["history","adminResults","adminUsers","submissions","questionBank"].includes(route);
  const blocks=isTable?'<span class="perf-skeleton-filter"></span><span class="perf-skeleton-table"></span>':'<span></span><span></span><span></span>';
  return '<div class="perf-skeleton'+(isTable?" perf-skeleton-list":"")+'" role="status" aria-live="polite" aria-label="Đang tải dữ liệu">'+
   '<small>Đang tải dữ liệu…</small>'+blocks+'</div>';
 }
 // Warm only code assets, not authenticated API responses, on user intent.
 document.addEventListener("pointerover",e=>{
  const el=e.target.closest?.("a[href^='#'],[data-route]");
  if(!el)return;
  const route=el.dataset.route||el.getAttribute("href")?.slice(1);
  clearTimeout(prefetchTimer);
  if(routeFiles[route])prefetchTimer=setTimeout(()=>prefetch(route),140);
 },{passive:true});
 document.addEventListener("focusin",e=>{
  const el=e.target.closest?.("a[href^='#'],[data-route]");
  if(!el)return;
  const route=el.dataset.route||el.getAttribute("href")?.slice(1);
  if(routeFiles[route])prefetch(route);
 });
 function cleanupRoute(){window.PerformanceMonitor?.stop?.();window.API?.abortAll?.();window.SupabaseRealtime?.unsubscribeAll?.().catch?.(()=>{});window.StudentExamProctor?.stop?.();try{window.speechSynthesis?.cancel?.()}catch{}try{window._btSpeechRecognition?.abort?.()}catch{}if(window._btBreak){clearTimeout(window._btBreak);window._btBreak=null}}
 window.addEventListener("online",()=>window.OfflineSyncQueue?.flush?.());
 return {ensureRoute,prefetch,cleanupRoute,skeleton,routeFiles}
})();