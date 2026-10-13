window.ImageOptimizer={
 async optimize(file,{maxWidth=1600,maxHeight=1600,quality=.82,type="image/webp"}={}){
  if(!file||!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size<220*1024)return file;
  try{
   const bmp=await createImageBitmap(file),scale=Math.min(1,maxWidth/bmp.width,maxHeight/bmp.height),w=Math.max(1,Math.round(bmp.width*scale)),h=Math.max(1,Math.round(bmp.height*scale));
   const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d",{alpha:false});if(!ctx)throw new Error("Không thể xử lý ảnh");ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.drawImage(bmp,0,0,w,h);bmp.close?.();
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Không nén được ảnh")),type,quality));
   if(blob.size>=file.size)return file;
   const ext=type==="image/webp"?"webp":"jpg",base=(file.name||"image").replace(/\.[^.]+$/,"");return new File([blob],base+"."+ext,{type,lastModified:Date.now()})
  }catch{return file}
 }
};