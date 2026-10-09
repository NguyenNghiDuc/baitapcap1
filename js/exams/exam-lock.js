window.ExamLock=(() => {
  let active = false;
  let lockedHash = "";
  let leaveCount = 0;
  let clickGuard = null;
  let hashGuard = null;
  let popGuard = null;
  let unloadGuard = null;
  let visibilityGuard = null;
  let sideNotice = null;

  const hasExam = () => !!document.querySelector("#content .locked-exam-shell");
  function restoreRoute() {
    if (!active) return;
    if (!hasExam()) { exit(); return; }
    if (location.hash !== lockedHash) {
      history.replaceState(history.state, "", location.pathname + location.search + lockedHash);
    }
  }
  function enter(meta = {}) {
    // Never lock an empty screen, a listing page, or a failed exam render.
    if (!hasExam()) { exit(); return false; }
    if (active) return true;
    active = true;
    lockedHash = location.hash || "#tests";
    leaveCount = 0;
    document.body.classList.add("exam-mode-active");
    document.body.dataset.examTitle = meta.title || "Bài kiểm tra";
    for (const sel of [".topbar", "#sidebar"]) {
      const host = document.querySelector(sel);
      if (host && !host.querySelector(".exam-click-shield")) {
        const shield = document.createElement("div");
        shield.className = "exam-click-shield";
        shield.setAttribute("aria-hidden", "true");
        host.appendChild(shield);
      }
    }
    const sidebar = document.querySelector("#sidebar");
    if (sidebar) {
      sideNotice = document.createElement("div");
      sideNotice.className = "exam-side-lock";
      sideNotice.innerHTML = '<span class="exam-side-lock-icon">🔒</span><div><b>Đang làm bài kiểm tra</b><small>Nộp bài để trở về các chức năng khác.</small></div>';
      sidebar.appendChild(sideNotice);
    }
    clickGuard = e => {
      if (!active) return;
      if (!hasExam()) { exit(); return; }
      const target = e.target.closest?.("a,button,[role=tab],[data-route]");
      if (!target || target.closest(".locked-exam-shell")) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      restoreRoute();
    };
    hashGuard = () => { if (active) restoreRoute(); };
    popGuard = () => { if (active) restoreRoute(); };
    unloadGuard = e => {
      if (!active || !hasExam()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    visibilityGuard = () => {
      if (active && hasExam() && document.visibilityState === "hidden") {
        leaveCount++;
        document.dispatchEvent(new CustomEvent("bt:exam-tab-leave", {detail:{leaveCount,at:new Date().toISOString()}}));
      }
    };
    document.addEventListener("click", clickGuard, true);
    window.addEventListener("hashchange", hashGuard, true);
    window.addEventListener("popstate", popGuard, true);
    window.addEventListener("beforeunload", unloadGuard);
    document.addEventListener("visibilitychange", visibilityGuard);
    return true;
  }
  function exit() {
    active = false;
    document.body.classList.remove("exam-mode-active");
    delete document.body.dataset.examTitle;
    if (clickGuard) document.removeEventListener("click", clickGuard, true);
    if (hashGuard) window.removeEventListener("hashchange", hashGuard, true);
    if (popGuard) window.removeEventListener("popstate", popGuard, true);
    if (unloadGuard) window.removeEventListener("beforeunload", unloadGuard);
    if (visibilityGuard) document.removeEventListener("visibilitychange", visibilityGuard);
    clickGuard = hashGuard = popGuard = unloadGuard = visibilityGuard = null;
    sideNotice?.remove();
    sideNotice = null;
    document.querySelectorAll(".exam-click-shield,.exam-side-lock").forEach(el => el.remove());
  }
  function isActive() {
    if (active && !hasExam()) exit();
    return active;
  }
  function stats() { return {active:isActive(),lockedHash,leaveCount}; }
  return {enter,exit,isActive,route:()=>lockedHash,stats,restoreRoute};
})();
