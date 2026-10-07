window.StudentRegistry=(()=>{
 const routes={featureHub:"StudentFeatureHub",
  settings:"StudentSettings",updateCenter:"StudentUpdateCenter",offlineCenter:"StudentOfflineCenter",smartNotify:"StudentSmartNotify",
  rewards:"StudentRewards",gameMap:"StudentGameMap",friends:"StudentFriends",aiQuestion:"StudentAIQuestion",ocrScan:"StudentOCRScan",
  advancedDashboard:"StudentAdvancedDashboard",parentLock:"StudentParentLock",certificate:"StudentCertificate",helpFeedback:"StudentHelpFeedback",
  personalExam:"StudentPersonalExam",mastery:"StudentMastery",interactiveExercises:"StudentInteractiveExercises"
 };
 const utilities=["StudentExamProctor","StudentI18n"];
 return {
  routes,utilities,
  has(route){return !!routes[route]},
  async render(route,ctx={}){const m=window[routes[route]];if(!m?.render)return '<div class="empty">Module chưa tải.</div>';return await m.render(ctx.user)},
  bind(route,ctx){const m=window[routes[route]];if(!m?.bind)return;const deps={
   settings:[ctx.toast],updateCenter:[ctx.toast],offlineCenter:[ctx.toast],rewards:[ctx.toast,ctx.render],gameMap:[ctx.nav,ctx.toast],
   friends:[ctx.startCustom,ctx.toast,ctx.render],aiQuestion:[ctx.toast],ocrScan:[ctx.toast],parentLock:[ctx.toast],
   certificate:[ctx.toast],helpFeedback:[ctx.toast],personalExam:[ctx.startCustom],interactiveExercises:[ctx.toast]
  };m.bind(...(deps[route]||[]))}
 }
})();