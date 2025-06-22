import asyncHandler from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";


export const verifyJWT=asyncHandler(async (req, _, next) =>{

    try {
        const token=req.cookies?.accessToken || req.header("Authrization")?.replace("Bearer ", "");

        console.log("Token:", token);
    
        if(!token) {
            throw new apiError(401, " Unauthorized request.Access token is required");
        }
    
        const decodedToken=jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user=await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
    
            //TODO: discuss about frontend
    
            throw new apiError(401, "Invalid Access token. User not found");
        }
    
        req.user=user;
    
        next();
    } catch (error) {
        // Handle token verification errors
        throw new apiError(401, error?.message|| "Invalid Access token. Please login again");
        // // Pass the error to the next middleware
        // next(error);
        
    }


});