import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadonCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      throw new Error("No file path provided for upload.");
    }

    //Upload File on Cloudinary

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("Cloudinary upload response:", response);

    //File has been uploaded successfully

    console.log("File uploaded successfully:", response.url);

    // Remove the locally saved temporary file after successful upload
    fs.unlinkSync(localFilePath);

    return response.url; // Return the secure URL of the uploaded image
  } catch (error) {
    // fs.unlinkSync(localFilePath); // Remove the locally saved temporary file as the upload operation failed
    // return null; // Return null to indicate failure

    // console.error('Error uploading to Cloudinary:', error);
    // throw error;
    console.error("Error uploading to Cloudinary:", error);

    // Only try to delete file if it exists
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return null; // Gracefully return null for caller to handle
  }
};

export { uploadonCloudinary };
