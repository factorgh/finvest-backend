import mongoose from "mongoose";

// Define the Notification schema
const NotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    // Update 'user' to an array of ObjectId references to the 'User' model
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User(s) are required"], // This will now be an array
      },
    ],
    message: {
      type: String,
      required: [true, "Message is required"],
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Tracks creation and update times
  }
);

// Create the Notification model
const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
