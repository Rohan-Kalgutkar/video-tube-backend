// require("dotenv").config();

// import mongoose from "mongoose";
// import {DB_NAME} from "./constants.js";

// import express from "express";

// const app= express();



import connectDB from "./db/index.js";
import dotenv from "dotenv";
import {app} from "./app.js";


dotenv.config({
    path:'./.env'
});

connectDB()
.then(()=>{

    app.on("error", (err) => {
        console.error("Server error:", err);
        throw err;
    });
    
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
})
.catch((error) => {
    console.error("MongoDB connection failed:", error);
    process.exit(1); // Exit the process with failure
})

/*

import express from "express";

const app= express();


// const connectDB = async () => {

// }

// connectDB()



;( async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error", (err) => {
            console.log("Server error:", err);
            throw err;});
        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });
        
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1); // Exit the process with failure
    }
})()

*/

