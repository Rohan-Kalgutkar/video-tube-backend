import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema=new Schema(
    {
        videoFile:{
            type:String, //cloudinary URL
            required:[true, "Video file is required"],
        },
        thumbnail:{
            type:String, //cloudinary URL
            required:[true, "Thumbnail is required"],
        },
        title:{
            type:String,
            required:[true, "Title is required"],
            trim:true,
            index:true
        },
        description:{
            type:String,
            required:[true, "Description is required"],
            trim:true,
        },
        duration:{
            type:Number,
            required:[true, "Duration is required"],
        },
        views:{
            type:Number,
            default:0,
        },
        isPublished:{
            type:Boolean,
            default:true, // Video is published by default
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:"User", // Reference to User model
            // required:true, // Owner is required
        }


    },{timestamps:true});


videoSchema.plugin(mongooseAggregatePaginate);

export const Video=mongoose.model("Video",videoSchema);