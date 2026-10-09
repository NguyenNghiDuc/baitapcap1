const {handler}=require("../server");
module.exports=(req,res)=>{req.url="/api/ai";return handler(req,res)};
