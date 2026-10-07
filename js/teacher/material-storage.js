window.TeacherMaterialStorage={
 bind(toast,rerender){
  document.querySelector("#uploadForm")?.addEventListener("submit",async e=>{
   e.preventDefault();const file=document.querySelector("#uploadFile")?.files?.[0];if(!file)return;const title=new FormData(e.currentTarget).get("title");
   try{
    if(window.SupabaseApp?.enabled()){
      const up=await window.SupabaseStorage.material(file);
      await API.post("/api/storage/material",{title,bucket:up.bucket,path:up.path,type:file.type,size:file.size});
    }else{
      const rd=new FileReader();const dataUrl=await new Promise((resolve,reject)=>{rd.onload=()=>resolve(rd.result);rd.onerror=reject;rd.readAsDataURL(file)});
      await API.post("/api/upload",{title,dataUrl});
    }
    toast("Upload tài liệu thành công");rerender?.()
   }catch(x){toast(x.message)}
  })
 }
};