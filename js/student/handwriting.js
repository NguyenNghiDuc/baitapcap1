window.StudentHandwriting={
 render(){return `<section class="page-head"><span class="eyebrow">BÀI VIẾT TAY</span><h1>📷 Nộp ảnh bài làm</h1><p>Ưu tiên Supabase Storage; hỗ trợ PNG/JPEG tối đa 5MB.</p></section><div class="panel"><form id="handwritingForm" class="stack"><input name="title" placeholder="Tên bài" required><input id="handwritingFile" type="file" accept="image/png,image/jpeg" required><button class="primary">Tải ảnh bài làm</button><div id="handwritingStatus" class="muted"></div></form></div>`},
 bind(toast){
  document.querySelector("#handwritingForm")?.addEventListener("submit",async e=>{
   e.preventDefault();const f=document.querySelector("#handwritingFile").files[0],title=new FormData(e.currentTarget).get("title"),st=document.querySelector("#handwritingStatus");if(!f)return;
   if(!["image/png","image/jpeg"].includes(f.type))return toast("Chỉ hỗ trợ PNG hoặc JPEG");
   const file=await window.ImageOptimizer?.optimize?.(f,{maxWidth:1600,maxHeight:1600,quality:.78,type:"image/jpeg"})||f;
   if(file.size>5*1024*1024)return toast("Ảnh sau xử lý vẫn lớn hơn 5MB");
   try{
    st.textContent="Đang tải...";
    if(window.SupabaseApp?.enabled()){
      const up=await window.SupabaseStorage.studentWork(file);
      await API.post("/api/storage/student-work",{title,bucket:up.bucket,path:up.path,type:up.type||file.type,size:up.size||file.size});
    }else{
      const rd=new FileReader();const dataUrl=await new Promise((resolve,reject)=>{rd.onload=()=>resolve(rd.result);rd.onerror=reject;rd.readAsDataURL(file)});
      await API.post("/api/student/handwriting",{title,dataUrl});
    }
    st.textContent="Đã tải lên thành công";toast("Đã tải ảnh bài làm");e.currentTarget.reset()
   }catch(x){st.textContent=x.message;toast(x.message)}
  })
 }
};