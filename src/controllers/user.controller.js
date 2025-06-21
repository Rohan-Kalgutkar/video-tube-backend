import asyncHandler from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";

import { User } from "../models/user.models.js";

import { uploadonCloudinary } from "../utils/cloudinary.js";

import { apiResponse } from "../utils/apiResponse.js";

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

export { registerUser };
