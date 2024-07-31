require("dotenv").config();
import { ErrorMiddleware } from "./middleware/error";
import express, { NextFunction, Request, Response } from "express";
import userRouter from "./routes/user.route";
export const app = express();
import courseRouter from "./routes/course.route";
import orderRouter from "./routes/order.route";
import notificationRouter from "./routes/notification.route";
import analyticsRouter from "./routes/analytics.route"
import layoutRouter from "./routes/layout.route"
import {rateLimit} from "express-rate-limit";

import cors from "cors";
import cookieParser from "cookie-parser";

app.use(express.json({ limit: "50mb" }));

app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials:true
  })
);

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	limit: 100,
	standardHeaders: 'draft-7',
	legacyHeaders: false, 
})



app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the API",
  });
});


app.use("/api/v1", userRouter, courseRouter, orderRouter, notificationRouter,analyticsRouter,layoutRouter);

app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "API is working",
  });
});

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route ${req.originalUrl} not found`);
  next(err);
});

app.use(limiter)

app.use(ErrorMiddleware);

export default app;