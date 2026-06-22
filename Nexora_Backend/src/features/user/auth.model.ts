// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//       minlength: 2,
//       maxlength: 80,
//     },
//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//       maxlength: 160,
//       match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
//     },
//     password: {
//       type: String,
//       required: true,
//       minlength: 8,
//       select: false,
//     },
//     role: {
//       type: String,
//       enum: ["admin", "user", "contractor"],
//       default: "user",
//     },
//   },
//   { timestamps: true }
// );

// export const User = mongoose.model("User", userSchema);
