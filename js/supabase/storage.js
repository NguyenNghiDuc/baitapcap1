window.SupabaseStorage=(()=>{
 async function client(){await window.SupabaseApp.ready();if(!window.SupabaseApp.client)throw new Error("Supabase Storage chưa cấu hình");return window.SupabaseApp.client}
 async function uid(){const c=await client(),{data}=await c.auth.getUser();if(!data?.user)throw new Error("Bạn cần đăng nhập Supabase");return data.user.id}
 function ext(file){const n=file.name||"";return (n.includes(".")?n.split(".").pop():"bin").replace(/[^a-z0-9]/gi,"").toLowerCase()}
 async function upload(bucket,file,folder,{upsert=false,optimizeImage=true}={}){
  if(optimizeImage&&window.ImageOptimizer&&String(file?.type||"").startsWith("image/"))file=await window.ImageOptimizer.optimize(file);
  const c=await client(),id=await uid(),name=`${folder||id}/${crypto.randomUUID()}.${ext(file)}`;
  const {data,error}=await c.storage.from(bucket).upload(name,file,{cacheControl:"3600",upsert,contentType:file.type||undefined});
  if(error)throw error;return {bucket,path:data.path,name:file.name,size:file.size,type:file.type}
 }
 async function studentWork(file){const id=await uid();return upload("student-work",file,id)}
 async function material(file){const id=await uid();return upload("learning-materials",file,id)}
 async function avatar(file){if(window.ImageOptimizer)file=await window.ImageOptimizer.optimize(file,{maxWidth:640,maxHeight:640,quality:.8});const id=await uid();const c=await client(),path=`${id}/avatar.${ext(file)}`;const {data,error}=await c.storage.from("avatars").upload(path,file,{upsert:true,contentType:file.type});if(error)throw error;const {data:pub}=c.storage.from("avatars").getPublicUrl(data.path);return {bucket:"avatars",path:data.path,url:pub.publicUrl}}
 async function remove(bucket,paths){const c=await client(),{error}=await c.storage.from(bucket).remove(paths);if(error)throw error;return true}
 return {upload,studentWork,material,avatar,remove}
})();