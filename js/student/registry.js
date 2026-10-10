window.StudentRegistry=(()=>{
 const routes={tests:"TermExamCatalog",realActivity:"StudentRealActivity",systemMonitor:"StudentSystemMonitor",adminGrades:"StudentAdminGrades",featureHub:"StudentFeatureHub",accountSecurity:"AccountSecurity",liveClassroom:"LiveClassroom",
  settings:"StudentSettings",updateCenter:"StudentUpdateCenter",offlineCenter:"StudentOfflineCenter",smartNotify:"StudentSmartNotify",
  rewards:"StudentRewards",gameMap:"StudentGameMap",friends:"StudentFriends",aiQuestion:"StudentAIQuestion",ocrScan:"StudentOCRScan",
  advancedDashboard:"StudentAdvancedDashboard",parentLock:"StudentParentLock",certificate:"StudentCertificate",helpFeedback:"StudentHelpFeedback",
  personalExam:"StudentPersonalExam",mastery:"StudentMastery",interactiveExercises:"StudentInteractiveExercises",historyCompare:"StudentHistoryCompare",performanceMode:"StudentPerformanceMode",chapterAchievements:"StudentChapterAchievements"
 };
 const utilities=["StudentExamProctor","StudentI18n"];
 return {
  routes,utilities,
  has(route){return !!routes[route]},
  async render(route,ctx={}){if(route==="gameMap"&&!window.StudentParentLock?.allowed("game"))return `<div class="empty large"><h2>🔐 Game đang bị Parent Lock giới hạn</h2></div>`;if(route==="rewards"&&!window.StudentParentLock?.allowed("reward"))return `<div class="empty large"><h2>🔐 Shop đang bị Parent Lock giới hạn</h2></div>`;const m=window[routes[route]];if(!m?.render)return '<div class="empty">Module chưa tải.</div>';return await m.render(ctx.user)},
  bind(route,ctx){const m=window[routes[route]];if(!m?.bind)return;const deps={tests:[ctx],accountSecurity:[ctx.toast],liveClassroom:[ctx.toast],
   settings:[ctx.toast],updateCenter:[ctx.toast],offlineCenter:[ctx.toast],rewards:[ctx.toast,ctx.render],gameMap:[ctx.nav,ctx.toast],
   friends:[ctx.startCustom,ctx.toast,ctx.render],aiQuestion:[ctx.toast],ocrScan:[ctx.toast],parentLock:[ctx.toast],
   certificate:[ctx.toast],helpFeedback:[ctx.toast],personalExam:[ctx.startCustom],interactiveExercises:[ctx.toast],performanceMode:[ctx.startCustom]
  };m.bind(...(deps[route]||[]))}
 }
})();