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

    return {
      url: response.secure_url,
      public_id: response.public_id
    }; // Return the secure URL and pub_id of the uploaded image
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

const deleteFromCloudinary = async (public_id) => {
  try {
    if (!public_id) {
      throw new Error("No public_id provided for deletion.");
    }

    const result = await cloudinary.uploader.destroy(public_id);
    console.log("Cloudinary destroy result:", result);
    return result;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error.message);
    return null;
  }
};

export { uploadonCloudinary, deleteFromCloudinary };
