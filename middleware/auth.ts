import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "./catchAsyncErrors";
import Errorhandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";


export const isAuthenticated = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("isAuthenticated middleware hit");
    const access_token = req.cookies.access_token;

    if (!access_token) {
      console.log("Access token is missing");
      return next(new Errorhandler("Access token is missing", 400));
    }

    try {
      const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN!) as JwtPayload;
      const user = await redis.get(decoded.id);

      if (!user) {
        console.log("User not found in Redis");
        return next(new Errorhandler("User not found", 400));
      }

      req.user = JSON.parse(user);
      console.log("Authentication successful", req.user);
      next();
    } catch (error) {
      console.log("Error verifying token:", error);
      return next(new Errorhandler("Invalid access token", 400));
    }
  }
);

export const authorizeRoles=(...roles:string[])=>{
   return (req:Request,res:Response,next:NextFunction)=>{
    if(!roles.includes(req.user?.role||"")){
      return next(new Errorhandler(`Role: ${req.user?.role} is not allowed to access this resouce`,400))
    }
    next()
   }
}