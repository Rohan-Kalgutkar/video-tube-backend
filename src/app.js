import express from 'express';

import cors from 'cors';
import cookieParser from 'cookie-parser';


const app = express();

// Middleware to parse JSON bodies

app.use(cors({
    origin: process.env.CORS_ORIGIN, // Adjust the origin as needed
    credentials: true // Allow credentials to be sent
}))


app.use(express.json({limit: '16kb'})); // Increase the limit as needed

app.use(express.urlencoded({ extended: true, limit: '16kb' })); // Increase the limit as needed

app.use(express.static('public')); // Serve static files from the 'public' directory

app.use(cookieParser()); // Middleware to parse cookies



//Import Routes
import userRoutes from './routes/user.routes.js';

//routes decalaration

app.use("/api/v1/users", userRoutes);

//http://localhost:3000/api/v1/users/register

export  {app};