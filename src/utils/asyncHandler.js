const asyncHandler = (requestHandler) => {

    return (req,res,next) => {
        Promise
        .resolve(requestHandler(req, res, next))
        .catch((err)=>next(err));
    }

}


export default asyncHandler;

// const asyncHandler=()=>{}

// const asyncHandler=(func)=> {()=>{}}

// const asyncHandler=(func)=>async ()=>{}


////Try Catch Code

// const asyncHandler = (fn) => async (err,req,res,next)=>{
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message || "Internal Server Error",
//             error: err.error || "Something went wrong"
            
            
//         })
//         // next(error);
//     }
// }