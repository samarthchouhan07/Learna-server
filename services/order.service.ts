import { NextFunction, Response } from "express";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import OrderModel from "../models/order.Model";

export const neworder = catchAsyncError(async (data: any, res: Response, next: NextFunction) => {
  const order = await OrderModel.create(data);
  console.log("new order got hit")
  res.status(200).json({
    success: true,
    order,
  });
});

export const getAllOrdersService = async (res: Response) => {
  try {
    console.log("getAllordersService got hit ")
    const orders = await OrderModel.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      orders,
    });
    console.log("no error in getAllOrdersService")
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving orders',
    });
  }
};