import asyncHandler from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";

import { User } from "../models/user.models.js";

import { uploadonCloudinary } from "../utils/cloudinary.js";

import { apiResponse } from "../utils/apiResponse.js";

import jwt from "jsonwebtoken";

const generateAccessAndResfreshTokens= async (userID) =>{
  try {

    const user =await User.findById(userID)

    const accessToken=user.generateAccessToken()
    const refreshToken=user.generateRefreshToken()

    user.refreshToken=refreshToken;

    await user.save({validateBeforeSave:false}); // Skip validation for refreshToken field

    return {
      accessToken,
      refreshToken
    }

    
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw new apiError(500, "Internal server error while generating refresh and access token");
    
  }
}

const registerUser = asyncHandler(async (req, res) => {
  // res.status(200).json({
  //     message: "User registered successfully",
  // })

  //Registration Steps

  // get user details from request body (Frontend)
  // Validation - not empty, valid email, password length, etc.
  // Check if user already exists
  // check for images, check for avatar
  // Upload them to cloudinary, avatar
  // Create user Object - create entry in Db
  // Remove password and refresh token field from response
  // Check for user creation
  // Return response

  const { fullName, email, username, password } = req.body;
  console.log("User Registration Details:", {
    fullName,
    email,
    username,
    password,
  });

  // if (fullName===""){
  //     throw new apiError(400,"Full name is required");
  // }

  console.log("Received files:", req.files);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new apiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [
      // { email: email.trim().toLowerCase() },
      // { username: username.trim().toLowerCase() }

      { username },
      { email },
    ],
  });

  if (existedUser) {
    throw new apiError(409, "User already exists with this email or username");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

//   const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;

  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;

  }

  if(!avatarLocalPath){
    throw new apiError(400, "Avatar image is required");

  }

    // Upload avatar image to Cloudinary

    const avatarUrl = await uploadonCloudinary(avatarLocalPath);

    const coverImageUrl = await uploadonCloudinary(coverImageLocalPath);

    if (!avatarUrl) {
      throw new apiError(500, "Failed to upload avatar image");
    }

    // Create user object

    const user=await User.create({
        fullName,
        avatar: avatarUrl, // This will be the URL returned by Cloudinary
        coverImage: coverImageUrl || "",  ///This way written becuase there was no strick check on coverimage like Avatar thats why if not there replace wiht null
        email,
        password,
        username: username.toLowerCase(),
    })

    const createdUser=await User.findById(
        user._id,
    ).select(
        "-password -refreshToken"
    ); // Exclude password and refreshToken from the response

    if(!createdUser){
        throw new apiError(500, "User creation failed");
    }

    // Return response

    return res.status(201).json(

        new apiResponse(200,createdUser, "User registered successfully"),
    );

    
    // return apiResponse(res, 201, "User registered successfully", {
    //     user: createdUser,
    // });





});





const loginUser=asyncHandler(async (req, res) => {

  //TODO:

  // Retrieve req.body =>Data
  // Check if username, emaiil exists
  // Find the user
  // Check if password is correct
  // Generate access token and refresh token and send to user
  // Send these token in response as cookies(secure cookies) to user

  const { email, username, password } = req.body;
  console.log(email);

  if(!username && !email) {
    throw new apiError(400, "Email or username is required");
  }

  //Alternative to above code:

  // if(!(username || email)){
  //   throw new apiError(400, "Email or username is required");
  // }

  const user= await User.findOne({
    $or: [
      {username},
      {email}
    ],

  }).select("+password");

  if(!user) {
    throw new apiError(401, "Invalid username or email");
  }

  const isPasswordValid=await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new apiError(401, "Invalid password");
  }

  const {accessToken,refreshToken}=await generateAccessAndResfreshTokens(user._id)

  const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

  const options={
    httpOnly: true,
    secure:true, // Set secure flag in production
    // sameSite: "Strict", // Adjust as per your requirements

  }


  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new apiResponse(
      200, 
      {
        user: loggedInUser, accessToken, 
        refreshToken

      },
      "User logged in successfully"
    )
  )



});


const logoutUser=asyncHandler(async (req, res) => {

  //ToDo
  //Reset the Refresh Token in the database
  //Remove the cookie parser logic to successfull logut


  await User.findByIdAndUpdate(
    req.user._id, 
    { 
      $set: { 
        refreshToken: undefined // or null
      }
    }, 
    { 
      new: true 
    }
  )

  const options={
    httpOnly: true,
    secure: true, // Set secure flag in production
    // sameSite: "Strict", // Adjust as per your requirements

  }


  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new apiResponse(200, {}, "User logged out successfully"));

});


const refreshAccessToken= asyncHandler(async(req,res)=>{

  // ToDo
  // Get the refresh token from cookies
  // Verify the refresh token
  // Generate new access token
  // Send the new access token in response


  const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken || 
  req.header("Authorization")?.replace("Bearer ", "");

  if(!incomingRefreshToken) {
    throw new apiError(401, "Unauthorized request. Refresh token is required");
  }

  try {
    const decodedToken=jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    )
  
    const user=await User.findById(decodedToken?._id)
  
    if(!user) {
      throw new apiError(401, "Invalid refresh token. User not found");
    }
  
    if(incomingRefreshToken!== user?.refreshToken) {
      throw new apiError(401, "Refresh Token is expired or invalid. Please login again");
    }
  
    const options={
      httpOnly: true,
      secure: true, // Set secure flag in production
      // sameSite: "Strict", // Adjust as per your requirements
  
    }
  
    const {newAccessToken,newRefreshToken}=await user.generateAccessToken(user._id);
  
  
    return res
    .status(200)
    .cookie("accessToken", newAccessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new apiResponse(
        200, 
        {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }, 
        "Access token refreshed successfully"
      )
    )
  
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw new apiError(401, "Invalid refresh token. Please login again");
    
  }

})

export { 
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken
};
