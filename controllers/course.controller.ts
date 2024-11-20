import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import Errorhandler from "../utils/ErrorHandler";
import cloudinary from "cloudinary";
import { createCourse, getAllCoursesService } from "../services/course.service";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis";
import mongoose, { mongo } from "mongoose";
import ejs from "ejs";
import path from "path";
import { sendMail } from "../utils/sendMail";
import notificationModel from "../models/notification.model";
import axios from "axios";

export const uploadCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      console.log(data)
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
      createCourse(data, res, next);
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const editCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      const courseId = req.params.id;
      const courseData=await CourseModel.findById(courseId) as any;
      if (thumbnail && !thumbnail.startsWith("https")) {
        await cloudinary.v2.uploader.destroy(courseData.thumbnail.public_id);
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
      if(thumbnail.startsWith("https")){
        data.thumbnail={
          public_id:courseData?.thumbnail.public_id,
          url:courseData?.thumbnail.url,
        }
      }
      const course = await CourseModel.findByIdAndUpdate(
        courseId,
        {
          $set: data,
        },
        {
          new: true,
        }
      );
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const getSingleCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      console.log("got courseId");
      const isCacheExist = await redis.get(courseId);
      console.log("found in redis");
      if (isCacheExist) {
        const course = JSON.parse(isCacheExist);
        res.status(200).json({
          success: true,
          course,
        });
        console.log("sent from redis ");
      } else {
        const course = await CourseModel.findById(req.params.id).select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );
        console.log("hitting mongoDB");
        await redis.set(courseId, JSON.stringify(course), "EX", 604800);
        console.log("set in redis ");
        res.status(200).json({
          success: true,
          course,
        });
        console.log("sent from mongoDB");
      }
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const getAllCourses = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await CourseModel.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      res.status(200).json({
        success: true,
        courses,
      });
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const getCourseByUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;
      const courseExist = userCourseList?.find(
        (course: any) => course._id.toString() === courseId
      );
      if (!courseExist) {
        return next(
          new Errorhandler("You are not eligible to access this course", 400)
        );
      }
      const course = await CourseModel.findById(courseId);
      const content = course?.courseData;
      res.status(200).json({
        success: true,
        content,
      });
    } catch (error: any) {}
  }
);

interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, courseId, contentId }: IAddQuestionData = req.body;
      const course = await CourseModel.findById(courseId);
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new Errorhandler("invalid contentId", 400));
      }
      const courseContent = course?.courseData?.find((video: any) =>
        video._id.equals(contentId)
      );
      if (!courseContent) {
        return next(new Errorhandler("invalid contentId", 400));
      }
      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: [],
      };
      courseContent.questions.push(newQuestion);
      await notificationModel.create({
        user: req.user?._id,
        title: "New Question Received",
        message: `you have a new question in ${courseContent?.title}`,
      });

      await course?.save();
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

interface IAddAnswerData {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

export const addAnswer = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, courseId, contentId, questionId } = req.body;
      const course = await CourseModel.findById(courseId);
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new Errorhandler("invalid contentId", 400));
      }
      const courseContent = course?.courseData?.find(
        (video: any) => video._id === contentId
      );
      if (!courseContent) {
        return next(new Errorhandler("invalid contentId", 400));
      }
      const question = courseContent?.questions?.find(
        (question: any) => question._id === questionId
      );
      if (!question) {
        return next(new Errorhandler("Invalid questionId", 400));
      }
      const newAnswer: any = {
        user: req.user,
        answer,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),
      };
      question.questionReplies?.push(newAnswer);
      await course?.save();
      if (req.user?._id === question.user?._id) {
        await notificationModel.create({
          user: req.user?._id,
          title: "New Questions Reply is Received",
          message: `You have a new question reply to ${courseContent.title}`,
        });
      } else {
        const data = {
          name: question.user.name,
          title: courseContent.title,
        };
        const html = await ejs.renderFile(
          path.join(__dirname, "../mails/question-reply.ejs"),
          data
        );
        // try {
        //   await sendMail({
        //     email: question.user.email,
        //     subject: "Question Reply",
        //     template: "question-reply.ejs",
        //     data,
        //   });
        // } catch (error: any) {
        //   return next(new Errorhandler(error.message, 500));
        // }
      }
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

//5:51:09

interface IAddReview {
  review: string;
  rating: string;
  userId: string;
}

export const addReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;
      const courseExist = userCourseList?.some(
        (course: any) => course?._id.toString() === courseId.toString()
      );
      if (!courseExist) {
        return next(
          new Errorhandler("you are not eligible to access this resource ", 400)
        );
      }
      const course = await CourseModel.findById(courseId);
      const { review, rating } = req.body as IAddReview;
      const reviewData: any = {
        user: req.user,
        rating,
        comment: review,
      };
      course?.reviews.push(reviewData);

      let average = 0;
      course?.reviews.forEach((review: any) => {
        average = average + review.rating;
      });
      if (course) {
        course.ratings = average / course.reviews.length;
      }
      await course?.save();
      await redis.set(courseId,JSON.stringify(course),"EX",604800);
      await notificationModel.create({
        user: req.user?._id,
        title: "New review Received",
        message: `${req.user?.name} has given a review in ${course?.name}`
      });

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

interface IAddReviewData {
  comment: string;
  courseId: string;
  reviewId: string;
}

export const addReplyReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReviewData;
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new Errorhandler("Course not found", 400));
      }
      console.log("course found");
      const review = course?.reviews?.find(
        (review: any) => review._id.toString() === reviewId
      );
      if (!review) {
        return next(new Errorhandler("review not found", 400));
      }
      const replyData: any = {
        user: req.user,
        comment,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),
      };
      if (!review.commentReplies) {
        review.commentReplies = [];
      }
      review.commentReplies?.push(replyData);
      await course.save();
      await redis.set(courseId,JSON.stringify(course),"EX",604800);
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const getAdminAllCourses = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllCoursesService(res);
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const deleteCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const course = await CourseModel.findById(id);
      if (!course) {
        return next(new Errorhandler("Course not found", 400));
      }
      await course.deleteOne({ id });
      await redis.del(id);
      res.status(200).json({
        success: true,
        message: "course deleted successfully",
      });
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const generateVideoUrl = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoId } = req.body;
      const response = await axios.post(
        `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
        { ttl: 300 },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
          },
        }
      );
      res.json(response.data);
    } catch (error: any) {
      return next(new Errorhandler(error.middleware, 4000));
    }
  }
);
