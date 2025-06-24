import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import brcypt from "bcrypt";
// import { use } from "react";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    // avatar: {
    //   type: String, //cloudinary URL
    //   required: true,
    // },

    avatar: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    coverImage: {
      url: { type: String },
      public_id: { type: String },
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, // Do not return password in queries by default
    },
    refreshToken: {
      type: String,
      select: false, // Do not return refreshToken in queries by default
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password") == false) {
    return next(); // Skip hashing if password is not modified
  }

  this.password = await brcypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  console.log("Plain password:", password);
  console.log("Hashed password from DB:", this.password);
  return await brcypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};
export const User = mongoose.model("User", userSchema);
