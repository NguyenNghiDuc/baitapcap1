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
 async function avatar(file){
  if(file?.type!=="image/jpeg"||file.size>2*1024*1024)throw new Error("Ảnh đại diện cần là JPEG dưới 2 MB");
  const id=await uid(),c=await client(),path=`${id}/avatar.jpg`;
  const {error}=await c.storage.from("avatars").upload(path,file,{upsert:true,contentType:"image/jpeg",cacheControl:"60"});
  if(error)throw error;
  const {data:signed,error:signError}=await c.storage.from("avatars").createSignedUrl(path,3600);
  if(signError||!signed?.signedUrl)throw signError||new Error("Không đọc được ảnh đại diện riêng tư");
  return {bucket:"avatars",path,url:signed.signedUrl};
 }
 async function remove(bucket,paths){const c=await client(),{error}=await c.storage.from(bucket).remove(paths);if(error)throw error;return true}
 return {upload,studentWork,material,avatar,remove}
})();