import asyncHandler from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";

import { User } from "../models/user.models.js";

import { uploadonCloudinary } from "../utils/cloudinary.js";

import { apiResponse } from "../utils/apiResponse.js";

import jwt from "jsonwebtoken";

import mongoose from "mongoose";

const generateAccessAndResfreshTokens = async (userID) => {
  try {
    const user = await User.findById(userID);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false }); // Skip validation for refreshToken field

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw new apiError(
      500,
      "Internal server error while generating refresh and access token"
    );
  }
};

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

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar image is required");
  }

  // Upload avatar image to Cloudinary

  const avatarUrl = await uploadonCloudinary(avatarLocalPath);

  const coverImageUrl = await uploadonCloudinary(coverImageLocalPath);

  if (!avatarUrl) {
    throw new apiError(500, "Failed to upload avatar image");
  }

  // Create user object

  const user = await User.create({
    fullName,
    avatar: avatarUrl, // This will be the URL returned by Cloudinary
    coverImage: coverImageUrl || "", ///This way written becuase there was no strick check on coverimage like Avatar thats why if not there replace wiht null
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); // Exclude password and refreshToken from the response

  if (!createdUser) {
    throw new apiError(500, "User creation failed");
  }

  // Return response

  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User registered successfully"));

  // return apiResponse(res, 201, "User registered successfully", {
  //     user: createdUser,
  // });
});

const loginUser = asyncHandler(async (req, res) => {
  //TODO:

  // Retrieve req.body =>Data
  // Check if username, emaiil exists
  // Find the user
  // Check if password is correct
  // Generate access token and refresh token and send to user
  // Send these token in response as cookies(secure cookies) to user

  const { email, username, password } = req.body;
  console.log(email);

  if (!username && !email) {
    throw new apiError(400, "Email or username is required");
  }

  //Alternative to above code:

  // if(!(username || email)){
  //   throw new apiError(400, "Email or username is required");
  // }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  }).select("+password");

  if (!user) {
    throw new apiError(401, "Invalid username or email");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new apiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndResfreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true, // Set secure flag in production
    // sameSite: "Strict", // Adjust as per your requirements
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //ToDo
  //Reset the Refresh Token in the database
  //Remove the cookie parser logic to successfull logut

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // or null // This removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true, // Set secure flag in production
    // sameSite: "Strict", // Adjust as per your requirements
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // ToDo
  // Get the refresh token from cookies
  // Verify the refresh token
  // Generate new access token
  // Send the new access token in response

  //Step1: Get refresh token from various sources/cookies

  const incomingRefreshToken =
    req.cookies.refreshToken ||
    req.body.refreshToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!incomingRefreshToken) {
    throw new apiError(401, "Unauthorized request. Refresh token is required");
  }

  try {
    //Step2: Verify the refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    //Step3 : Get user from Db and include refreshToken explicitly

    const user = await User.findById(decodedToken?._id).select("+refreshToken");

    if (!user) {
      throw new apiError(401, "Invalid refresh token. User not found");
    }

    //Step4: Check if token matches stored one
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new apiError(
        401,
        "Refresh Token is expired or invalid. Please login again"
      );
    }

    // const options = {
    //   httpOnly: true,
    //   secure: true, // Set secure flag in production
    //   // sameSite: "Strict", // Adjust as per your requirements
    // };

    // const { newAccessToken, newRefreshToken } = await user.generateAccessToken(
    //   user._id
    // );

    //Debugged Code:

    //Step5: Generate new token

    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    //Step6: Save the new refreshToken in DB

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    //Step7: Set cookies

    const options = {
      httpOnly: true,
      secure: true,
    };

    console.log("✅ Refreshed Access Token:", newAccessToken);
    console.log("🔁 Refreshed Refresh Token:", newRefreshToken);

    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(
          200,
          {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw new apiError(401, "Invalid refresh token. Please login again");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  //ToDo
  //Get current password and new password from req.body
  //Validate both passwords
  //Find the user from req.user._id
  //Check if current password is correct
  //Hash the new password
  //Save the user object
  //Send response

  const { currentPassword, newPassword, confPassword } = req.body;

  console.log("New Password:", newPassword);
  console.log("Confirm Password:", confPassword);

  if (newPassword.trim() !== confPassword.trim()) {
    throw new apiError(400, "New password and confirm password do not match");
  }

  const user = await User.findById(req.user._id).select("+password");

  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

  if (!isPasswordCorrect) {
    throw new apiError(400, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  //ToDo
  //Find the user from req.user._id
  //Send response

  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new apiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new apiResponse(200, user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  //ToDo
  //Get user details from req.body
  //Validate the details
  //Check if user exists
  //Update the user object
  //Save the user object
  //Send response

  const { fullName, email } = req.body;

  if (!(fullName && email)) {
    throw new apiError(400, "Full name and email are required");
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    {
      new: true,
      // runValidators: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(200, user, "User details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  //ToDo
  //Check if image is present
  //Upload the image to cloudinary
  //Find the user from req.user._id
  //Update the avatar field
  //Save the user object
  //Send response

  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar image is required");
  }

  //ToDO: delete old image to be done after research

  const avatarUrl = await uploadonCloudinary(avatarLocalPath);

  if (!avatarUrl) {
    throw new apiError(500, "Failed to upload avatar image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatarUrl,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(200, user, "User avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  //ToDo
  //Check if image is present
  //Upload the image to cloudinary
  //Find the user from req.user._id
  //Update the coverImage field
  //Save the user object
  //Send response

  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new apiError(400, "Cover image file is required");
  }

  const coverImageUrl = await uploadonCloudinary(coverImageLocalPath);

  if (!coverImageUrl) {
    throw new apiError(500, "Failed to upload cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImageUrl,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(200, user, "User cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new apiError(400, "Username is missing");
  }

  // User.find({username})

  //Aggregrate

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },

        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  console.log("Data Returned by aggregate: ", channel);

  if (!channel?.length) {
    throw new apiError(404, "Channel does not exist");
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, channel[0], "User channel fetched successfully ")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        user[0].watchHistory,
        "Watch History Fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
