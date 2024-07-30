import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "./catchAsyncErrors";
import Errorhandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";


export const isAuthenticated = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("this are cookies", req.cookies)
    const access_token = req.cookies.access_token as string
    console.log("Access token:", access_token);  

    if (!access_token) {
      return next(
        new Errorhandler("Please log in to access this resource", 400)
      );
    }

    const decoded = jwt.verify(
      access_token,
      process.env.ACCESS_TOKEN as string
    ) as JwtPayload;

    if (!decoded) {
      return next(new Errorhandler("Access token is not valid", 400));
    }

    const user = await redis.get(decoded.id);
    console.log("User data from Redis:", user);

    if (!user) {
      return next(new Errorhandler("User not found", 400));
    }
    
    req.user = JSON.parse(user);
    console.log("authentication successful")
    next();

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