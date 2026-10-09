const {handler}=require("../server");
module.exports=(req,res)=>{req.url="/api/ai/status";return handler(req,res)};
