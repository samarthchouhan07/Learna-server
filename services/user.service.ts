import userModel from "../models/user.model";
import { redis } from "../utils/redis";
import { Response } from "express";

export const getUserById = async (id: string, res: Response) => {
  const userJSON = await redis.get(id);
  if (userJSON) {
    const user = JSON.parse(userJSON);
    res.status(200).json({
      success: true,
      user,
    });
  }
};

export const getAllUsersService = async (res: Response) => {
  const users = await userModel.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    users,
  });
};

export const updateUserRoleService = async (
  res: Response,
  id: string,
  role: string
) => {
  const user = await userModel.findByIdAndUpdate(id, { role }, { new: true });
  res.status(200).json({
    success: true,
    user,
  });
};
