import {Response} from "express"
import CourseModel from "../models/course.model"
import {catchAsyncError} from "../middleware/catchAsyncErrors"

export const createCourse=catchAsyncError(async(data:any,res:Response)=>{
    const course=CourseModel.create(data)
    res.status(200).json({
        success:true,
        course
    })
})

export const getAllCoursesService=async(res:Response)=>{
    const courses=await CourseModel.find().sort({createdAt:-1})
    res.status(200).json({
      success:true,
      courses
    })
  }