import {Request,Response,NextFunction} from "express"
import Errorhandler from "../utils/ErrorHandler"
import {catchAsyncError} from "../middleware/catchAsyncErrors"
import { generateLast12MonthData } from "../utils/analytics.generator"
import userModel from "../models/user.model"
import CourseModel from "../models/course.model"
import OrderModel from "../models/order.Model"

export const getUsersAnalytics=catchAsyncError(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const users=await generateLast12MonthData(userModel)
        res.status(200).json({
            success:true,
            users
        })
    } catch (error:any) {
        return next(new Errorhandler(error.message,400))
    }
})

export const getCoursesAnalytics=catchAsyncError(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const courses=await generateLast12MonthData(CourseModel)
        res.status(200).json({
            success:true,
            courses
        })
    } catch (error:any) {
        return next(new Errorhandler(error.message,400))
    }
})

export const getOrdersAnalytics=catchAsyncError(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const orders=await generateLast12MonthData(OrderModel)
        res.status(200).json({
            success:true,
            orders
        })
    } catch (error:any) {
        return next(new Errorhandler(error.message,400))
    }
})