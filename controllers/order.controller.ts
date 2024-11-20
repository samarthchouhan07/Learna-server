require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import Errorhandler from "../utils/ErrorHandler";
import { IOrder } from "../models/order.Model";
import userModel from "../models/user.model";
import CourseModel, { ICourse } from "../models/course.model";
import path from "path";
import ejs from "ejs";
import { sendMail } from "../utils/sendMail";
import notificationModel from "../models/notification.model";
import { getAllOrdersService, neworder } from "../services/order.service";
import { redis } from "../utils/redis";
import { Client, Environment } from "square";

const client = new Client({
  environment: Environment.Sandbox,
  accessToken: process.env.SQUARE_SANDBOX_ACCESS_TOKEN,
});

type CreatePaymentResponse = {
  payment?: {
    id: string;
  };
};

export const createOrder = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("createOrder controller hit");
    console.log("req.user:", req.user);

    try {
      const { courseId, payment_info } = req.body;
      if (payment_info && "id" in payment_info) {
        console.log("this is the payment info ", payment_info);
        const paymentId: string = payment_info.id;
        console.log("Getting payment info for payment ID:", paymentId);

        const { result: paymentResponse } = await client.paymentsApi.getPayment(
          paymentId
        );
        const payment = paymentResponse.payment;

        if (payment?.status !== "COMPLETED") {
          console.error("Payment not completed:", payment);
          return next(new Errorhandler("Payment not authorized", 400));
        }
      }
      const user = await userModel.findById(req.user?._id);
      if (!user) {
        return next(new Errorhandler("User not found", 404));
      }

      const courseExistInUser = user.courses.some(
        (course: any) => course._id.toString() === courseId
      );
      
      if (courseExistInUser) {
        return next(
          new Errorhandler("You have already purchased the course", 400)
        );
      }

      const course: ICourse | null = await CourseModel.findById(courseId);
      if (!course) {
        return next(new Errorhandler("Course doesn't exist", 400));
      }

      const data: any = {
        courseId: course?._id,
        userId: user?._id,
        payment_info,
      };

      const maildata = {
        _id: course._id.toString().slice(0, 6),
        name: course.name,
        price: course.price,
        date: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };

      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/order-confirmation.ejs"),
        maildata
      );

      // try {
      //   await sendMail({
      //     email: user.email,
      //     subject: "Order confirmation",
      //     template: "order-confirmation.ejs",
      //     data: maildata,
      //   });
      // } catch (error: any) {
      //   console.log(error.message);
      //   return next(new Errorhandler(error.message, 400));
      // }

      user.courses.push(course._id);
      await redis.set(req.user?._id, JSON.stringify(user));
      await user.save();

      await notificationModel.create({
        user: user._id,
        title: "New Order",
        message: `You have a new order for ${course.name}`,
      });

      course.purchased = course.purchased + 1;
      await course.save();

      await neworder(data, res, next);
    } catch (error: any) {
      console.error("Error creating order:", error);
      return next(
        new Errorhandler("Error creating order. Please try again.", 500)
      );
    }
  }
);

export const getAllOrders = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("getAllOrders controller got hit");
      getAllOrdersService(res);
    } catch (error: any) {
      return next(new Errorhandler(error.message, 400));
    }
  }
);

export const sendSquareAppId = catchAsyncError(
  async (req: Request, res: Response) => {
    res.status(200).json({
      config: {
        appId: process.env.SQUARE_SANDBOX_APPLICATION_ID,
      },
    });
  }
);

export const newPayment = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("New payment controller got hit");
      const { idempotencyKey, sourceId, amount } = req.body;

      const amountAsBigInt = BigInt(amount);

      const { result: paymentResponse } =
        await client.paymentsApi.createPayment({
          idempotencyKey,
          sourceId,
          amountMoney: {
            amount: amountAsBigInt,
            currency: "USD",
          },
          cashDetails: {
            buyerSuppliedMoney: {
              amount: amountAsBigInt,
              currency: "USD",
            },
          },
          autocomplete: true,
        });

      console.log("Payment created:", paymentResponse);

      if (
        !paymentResponse ||
        !paymentResponse.payment ||
        !paymentResponse.payment.id
      ) {
        throw new Error("Payment ID is missing");
      }
      const responsePayment = {
        ...paymentResponse.payment,
        amountMoney: {
          amount: Number(paymentResponse.payment.amountMoney?.amount),
          currency: paymentResponse.payment.amountMoney?.currency,
        },
        totalMoney: {
          amount: Number(paymentResponse.payment.totalMoney?.amount),
          currency: paymentResponse.payment.totalMoney?.currency,
        },
        cashDetails: {
          ...paymentResponse.payment.cashDetails,
          buyerSuppliedMoney: {
            amount: Number(
              paymentResponse.payment.cashDetails?.buyerSuppliedMoney.amount
            ),
            currency:
              paymentResponse.payment.cashDetails?.buyerSuppliedMoney.currency,
          },
          changeBackMoney: {
            amount: Number(
              paymentResponse.payment?.cashDetails?.changeBackMoney?.amount
            ),
            currency:
              paymentResponse.payment.cashDetails?.changeBackMoney?.currency,
          },
        },
      };
      res.status(201).json({ data: { payment: responsePayment } });
    } catch (error: any) {
      console.error("New payment error:", error);
      return next(new Errorhandler(error.message, 500));
    }
  }
);