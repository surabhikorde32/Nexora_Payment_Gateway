import mongoose from "mongoose";

export const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI is not set. Server will start without MongoDB.");
    return;
  }

  mongoose.set("strictQuery", true)

  await mongoose.connect(process.env.MONGO_URI, {
    autoIndex:process.env.NODE_ENV !== "production",
  });

  console.log("MongoDB connected");
};
