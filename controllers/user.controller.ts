import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import Errorhandler from "../utils/ErrorHandler";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
require("dotenv").config();
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import { redis } from "../utils/redis";
import { sendMail } from "../utils/sendMail";
import { refreshTokenOptions, sendToken } from "../utils/jwt";
import { accessTokenOptions } from "../utils/jwt";
import { getUserById } from "../services/user.service";
import cloudinary from "cloudinary";
import { getAllUsersService } from "../services/user.service";
import { updateUserRoleService } from "../services/user.service";

interface IResgistration {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  isActive: true, 
}

export const registrationUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("Registration function called");
    console.log("Request body:", req.body);
    try {
      const { name, email, password } = req.body;
      const isEmailExist = await userModel.findOne({ email }).maxTimeMS(5000);
      if (isEmailExist) {
        return next(new Errorhandler("Email already exist", 400));
      }
      const user: IResgistration = {
        name,
        email,
        password,
        isActive: true, 
      };
      
      const newUser = await userModel.create(user);
      await redis.set(newUser._id.toString(), JSON.stringify(newUser));

      const accessToken = jwt.sign({ id: newUser._id }, process.env.ACCESS_TOKEN as string, { expiresIn: "5m" });
      const refreshToken = jwt.sign({ id: newUser._id }, process.env.REFRESH_TOKEN as string, { expiresIn: "3d" });

      res.cookie("access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
      });
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);

      res.status(200).json({
        success: true,
        message: "User created and logged in successfully",
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error("Error in registration:", error);
      return next(new Errorhandler(error.message, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}
export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );
  return { token, activationCode };
};

interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as Secret
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activation_code) {
        return next(new Errorhandler("Invalid activation code ", 400));
      }

      const { name, email, password } = newUser.user;

      const existUser = await userModel.findOne({ email });
      if (existUser) {
        return next(new Errorhandler("Email already exist", 400));
      }

      const user = await userModel.create({
        name,
        email,
        password,
      });
      res.status(200).json({
        success: true,
      }); 
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;
      if (!email || !password) {
        return next(
          new Errorhandler("please enter the email and password", 400)
        );
      }

      const user = await userModel.findOne({ email }).select("+password");
      if (!user) {
        return next(new Errorhandler("Invalid email or password", 400));
      }

      const isPasswordMatch = await user.comparePassword(password);
      if (!isPasswordMatch) {
        return next(new Errorhandler("Invalid email or password", 400));
      }

      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const logoutUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });
      const userId = req.user?._id || "";
      console.log("User object:", req.user);
      const deleted = await redis.del(userId);
      console.log("Redis deletion result:", deleted);
      res.status(200).json({
        success: true,
        message: "logged out user successfully",
      });
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const updateAccessToken = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("updateAccessToken got hit")
      const refresh_token = req.cookies.refresh_token as string;
      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;
      if (!decoded) {
        return next(new Errorhandler("could not refresh token", 400));
      }
      const session = await redis.get(decoded.id as string);
      if (!session) {
        return next(new Errorhandler("Session is missing in the updateAccessToken", 400));
      }
      const user = JSON.parse(session);

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        {
          expiresIn: "5m",
        }
      );
      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        {
          expiresIn: "3d",
        }
      );
      req.user = user;
      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);
      await redis.set(user._id,JSON.stringify(user),"EX",604800)

      next();
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const getUserInfo = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      console.log("getuserInfo got hit")
      const user = await userModel.findById(userId);
      if (!user) {
        return next(new Errorhandler("User not found", 404));
      }
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

interface ISocialAuthBody {
  email: string;
  name: string;
  avatar: string;
}

export const socialAuth = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = req.body as ISocialAuthBody;
      const user = await userModel.findOne({ email });
      if (!user) {
        const newUser = await userModel.create({ email, name, avatar });
        console.log(newUser);
        sendToken(newUser, 200, res);
      }
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);
//3:49:02

interface IUpdateUserInfo {
  name?: string;
  email: string;
}

export const updateUserInfo = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.body as IUpdateUserInfo;
      console.log(name);
      const userId = req.user?._id;
      console.log(userId, "found");
      const user = await userModel.findById(userId);
      console.log("user found in mongodb");
      
      if (name && user) {
        user.name = name;
        console.log("name updated");
      }
      await user?.save();
      console.log("mongodb updated");
      await redis.set(userId, JSON.stringify(user));
      console.log("redis updated");

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {}
  }
);

interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;
      if (!oldPassword || !newPassword) {
        return next(new Errorhandler("Enter old and new password", 400));
      }
      const user = await userModel.findById(req.user?._id).select("+password");
      if (user?.password === undefined) {
        return next(new Errorhandler("invalid user", 400));
      }
      const isPasswordMatch = await user?.comparePassword(oldPassword);
      if (!isPasswordMatch) {
        return next(new Errorhandler("invalid old password", 400));
      }
      user.password = newPassword;
      await user.save();
      await redis.set(req.user?._id, JSON.stringify(user));
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

interface IUpdateProfile {
  avatar: string;
}

export const updateProfilePicture = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body as IUpdateProfile;
      console.log("avatar extracted");
      const userId = req.user?._id;
      const user = await userModel.findById(userId);
      console.log("user found");
      if (avatar && user) {
        if (user?.avatar?.public_id) {
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
          console.log("deleted avatar");
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: "150",
          });
          console.log("updated avatar in the  avatar folder");
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.url,
          };
          console.log("updated on user side");
        } else {
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: "150",
          });
          console.log("uploaded avatar in the cloudinary");
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.url,
          };
          console.log("uploaded on the client side");
        }
      }
      await user?.save();
      console.log("saved the updates");
      await redis.set(userId, JSON.stringify(user));
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const getAllUsers = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllUsersService(res);
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const updateUserRole = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.body;
      updateUserRoleService(res, id, role);
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const deleteUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = await userModel.findById(id);
      if (!user) {
        return next(new Errorhandler("User not found", 400));
      }
      await user.deleteOne();
      await redis.del(id);
      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);