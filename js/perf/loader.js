window.PerfLoader=(()=>{
 const loaded=new Map();let hashPromise=null;
 const routeFiles={
  tests:["/js/exams/interaction.js","/js/exams/term-exams.js","/js/exams/runner.js","/js/exams/catalog.js"],
  accountSecurity:["/js/auth/account-security.js"],
  liveClassroom:["/js/supabase/realtime.js","/js/teacher/live-classroom.js"],
  today:["/js/student/dashboard.js"],goals:["/js/student/goals.js"],formulas:["/js/student/formulas.js"],vocab:["/js/student/vocab.js"],
  accessibility:["/js/student/accessibility.js"],notes:["/js/student/notes.js"],wrongReview:["/js/student/review.js"],quickPractice:["/js/student/quick-practice.js"],
  studyPath:["/js/student/study-path.js"],languageLab:["/js/student/language.js"],adaptive:["/js/student/adaptive.js"],speech:["/js/student/speech.js"],
  schedule:["/js/student/schedule.js"],worksheet:["/js/student/worksheet.js"],profileStats:["/js/student/profile-stats.js"],missions:["/js/student/missions.js"],
  leaderboard:["/js/student/leaderboard.js"],bookmarks:["/js/student/bookmarks.js"],prepPlan:["/js/student/prep-plan.js"],writing:["/js/student/writing.js"],
  handwriting:["/js/supabase/storage.js","/js/student/handwriting.js"],sync:["/js/student/sync.js"],targetScore:["/js/student/target-score.js"],
  topics:["/js/student/topics.js"],mathWork:["/js/student/math-work.js"],settings:["/js/student/settings.js"],updateCenter:["/js/student/update-center.js"],
  offlineCenter:["/js/student/offline-center.js"],smartNotify:["/js/student/smart-notify.js"],rewards:["/js/student/rewards.js"],gameMap:["/js/student/parent-lock.js","/js/student/game-map.js"],
  friends:["/js/student/friends.js"],aiQuestion:["/js/student/ai-question.js"],ocrScan:["/js/student/ocr-scan.js"],advancedDashboard:["/js/student/advanced-dashboard.js"],
  parentLock:["/js/student/parent-lock.js"],certificate:["/js/student/certificate.js"],helpFeedback:["/js/student/help-feedback.js"],personalExam:["/js/student/personal-exam.js"],
  mastery:["/js/student/mastery.js"],interactiveExercises:["/js/student/interactive-exercises.js"],featureHub:["/js/student/feature-hub.js"],
  historyCompare:["/js/student/history-compare.js"],performanceMode:["/js/student/performance-mode.js"],chapterAchievements:["/js/student/chapter-achievements.js"],
  materials:["/js/supabase/storage.js","/js/teacher/material-storage.js"]
 };
 async function versioned(src){if(!hashPromise)hashPromise=fetch("/asset-hashes.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null);const m=await hashPromise,h=m?.hashes?.[src];return h?src+"?h="+h:src}
 async function script(src){
  if(loaded.has(src))return loaded.get(src);
  if(document.querySelector(`script[data-lazy-src="${src}"]`))return Promise.resolve();
  const resolved=await versioned(src);const p=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=resolved;s.async=true;s.dataset.lazySrc=src;s.onload=()=>resolve();s.onerror=()=>{loaded.delete(src);reject(new Error("Không tải được "+src))};document.head.appendChild(s)});
  loaded.set(src,p);return p
 }
 async function ensureRoute(route){for(const src of routeFiles[route]||[])await script(src)}
 function prefetch(route){const files=routeFiles[route]||[];const run=()=>files.forEach(async src=>{if(loaded.has(src))return;const l=document.createElement("link");l.rel="prefetch";l.as="script";l.href=await versioned(src);document.head.appendChild(l)});("requestIdleCallback" in window)?requestIdleCallback(run,{timeout:2500}):setTimeout(run,1200)}
 function cleanupRoute(){window.SupabaseRealtime?.unsubscribeAll?.().catch?.(()=>{});window.StudentExamProctor?.stop?.()}
 window.addEventListener("online",()=>window.OfflineSyncQueue?.flush?.());
 return {ensureRoute,prefetch,cleanupRoute,routeFiles}
})();