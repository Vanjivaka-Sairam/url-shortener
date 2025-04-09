import mongoose from "mongoose";


async function connectToMongoDB(url) {
    try {
        await mongoose.connect(url);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
}

export default connectToMongoDB;
