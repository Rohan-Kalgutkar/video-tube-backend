import multer from 'multer';

const storage = multer.diskStorage({
    destination: function (req, file, cb)  {
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Use a unique suffix to avoid file name collisions
        // cb(null, Date.now() + '-' + file.originalname);
        cb(null, file.originalname); // Keep the original file name
    }
})

export const upload = multer({ 
    // storage: storage 
    storage,
});