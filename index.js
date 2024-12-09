import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import expressMongoSanitize from "express-mongo-sanitize";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import mongoose from "mongoose";
import morgan from "morgan";
import cron from "node-cron";
import xss from "xss-clean";
import assetsRoute from "./features/assets/route/assets_route.js";
import authRouter from "./features/auth/routes/auth.route.js";
import userRouter from "./features/auth/routes/user.route.js";
import { errorHandler } from "./features/error/error-controllroller.js";
import addOnRoute from "./features/investment/router/addons.router.js";
import investmentRoute from "./features/investment/router/investment.router.js";
import oneOffRoute from "./features/investment/router/one_offs.router.js";
import "./utils/schedule_cron_jobs.js";

import activityLogRouter from "./features/activity-log/activity.routes.js";
import loanRouter from "./features/loans/loans.routes.js";
import notificationRouter from "./features/notifications/routes/notification.js";
import paymentRouter from "./features/payments/payments.route.js";
import rentalRouter from "./features/rentals/rentals.route.js";
import withdrawalRouter from "./features/withdrawals/withdrawal.route.js";
import dailyLoanDeductions from "./utils/loan-cron.js";
import dailyRentalUpdates from "./utils/rental-cron.js";
import dailyAccruedReturnJob from "./utils/schedule_cron_jobs.js";

// Check if con scheduling works properly
cron.schedule("* * * * *", () => {
  console.log("Running a task every day at midnight");
});

// Cron job for daily accrued returns
dailyAccruedReturnJob();

// Cron job loans
dailyLoanDeductions();

// Cron job rentals
dailyRentalUpdates();

dotenv.config();

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("DB connected"))
  .catch((err) => console.error("DB connection error:", err));

// Initialize Express app
const app = express();

// Set scurity http
app.use(helmet());

// Cross site request middleware
app.use(cors());
// LOGGGER
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" })); // Parses JSON requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Data Sanitizer against Nosql injections
app.use(expressMongoSanitize());

// Data Sanitizer against xss
app.use(xss());

// Paramter Pollution Policy
app.use(hpp());

// Rate limiting & Prevention of bruce false attacks middleware
app.use(
  "/api",
  rateLimit({
    max: 300,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: "Too many requests, please try again later.",
  })
);

// Log incoming requests
app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.url}`);
  next();
});

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
// Investment routes
app.use("/api/v1/investments", investmentRoute);
app.use("/api/v1/add-on", addOnRoute);
app.use("/api/v1/add-offs", oneOffRoute);
app.use("/api/v1/assets", assetsRoute);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/activity-logs", activityLogRouter);
app.use("/api/v1/loans", loanRouter);
app.use("/api/v1/rentals", rentalRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/withdrawals", withdrawalRouter);

// File uploads routes
// app.use("/api/v1/uploads", firebaseUpload);

// Aseets routes
app.use("/api/v1/assets", assetsRoute);

// Handle unknown routes
app.all("*", (req, res, next) => {
  next(new Error(`Route ${req.originalUrl} not found`));
});

// app.use((err, req, res, next) => {
//   res.status(err.statusCode || 500).json({1
//     status: err.status || "error",
//     message: err.message || "Something went wrong",
//   });
// });

// Error handling middleware
app.use(errorHandler);

// Start server
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  server.close(() => process.exit(1));
});
