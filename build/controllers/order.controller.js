"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newPayment = exports.sendSquareAppId = exports.getAllOrders = exports.createOrder = void 0;
require("dotenv").config();
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const user_model_1 = __importDefault(require("../models/user.model"));
const course_model_1 = __importDefault(require("../models/course.model"));
const path_1 = __importDefault(require("path"));
const ejs_1 = __importDefault(require("ejs"));
const sendMail_1 = require("../utils/sendMail");
const notification_model_1 = __importDefault(require("../models/notification.model"));
const order_service_1 = require("../services/order.service");
const redis_1 = require("../utils/redis");
const square_1 = require("square");
const client = new square_1.Client({
    environment: square_1.Environment.Sandbox,
    accessToken: process.env.SQUARE_SANDBOX_ACCESS_TOKEN,
});
exports.createOrder = (0, catchAsyncErrors_1.catchAsyncError)(async (req, res, next) => {
    console.log("createOrder controller hit");
    console.log("req.user:", req.user);
    try {
        const { courseId, payment_info } = req.body;
        if (payment_info && "id" in payment_info) {
            console.log("this is the payment info ", payment_info);
            const paymentId = payment_info.id;
            console.log("Getting payment info for payment ID:", paymentId);
            const { result: paymentResponse } = await client.paymentsApi.getPayment(paymentId);
            const payment = paymentResponse.payment;
            if (payment?.status !== "COMPLETED") {
                console.error("Payment not completed:", payment);
                return next(new ErrorHandler_1.default("Payment not authorized", 400));
            }
        }
        const user = await user_model_1.default.findById(req.user?._id);
        if (!user) {
            return next(new ErrorHandler_1.default("User not found", 404));
        }
        const courseExistInUser = user.courses.some((course) => course._id.toString() === courseId);
        if (courseExistInUser) {
            return next(new ErrorHandler_1.default("You have already purchased the course", 400));
        }
        const course = await course_model_1.default.findById(courseId);
        if (!course) {
            return next(new ErrorHandler_1.default("Course doesn't exist", 400));
        }
        const data = {
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
        const html = await ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/order-confirmation.ejs"), maildata);
        try {
            await (0, sendMail_1.sendMail)({
                email: user.email,
                subject: "Order confirmation",
                template: "order-confirmation.ejs",
                data: maildata,
            });
        }
        catch (error) {
            console.log(error.message);
            return next(new ErrorHandler_1.default(error.message, 400));
        }
        user.courses.push(course._id);
        await redis_1.redis.set(req.user?._id, JSON.stringify(user));
        await user.save();
        await notification_model_1.default.create({
            user: user._id,
            title: "New Order",
            message: `You have a new order for ${course.name}`,
        });
        course.purchased = course.purchased + 1;
        await course.save();
        await (0, order_service_1.neworder)(data, res, next);
    }
    catch (error) {
        console.error("Error creating order:", error);
        return next(new ErrorHandler_1.default("Error creating order. Please try again.", 500));
    }
});
exports.getAllOrders = (0, catchAsyncErrors_1.catchAsyncError)(async (req, res, next) => {
    try {
        console.log("getAllOrders controller got hit");
        (0, order_service_1.getAllOrdersService)(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.sendSquareAppId = (0, catchAsyncErrors_1.catchAsyncError)(async (req, res) => {
    res.status(200).json({
        config: {
            appId: process.env.SQUARE_SANDBOX_APPLICATION_ID,
        },
    });
});
exports.newPayment = (0, catchAsyncErrors_1.catchAsyncError)(async (req, res, next) => {
    try {
        console.log("New payment controller got hit");
        const { idempotencyKey, sourceId, amount } = req.body;
        const amountAsBigInt = BigInt(amount);
        const { result: paymentResponse } = await client.paymentsApi.createPayment({
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
        if (!paymentResponse ||
            !paymentResponse.payment ||
            !paymentResponse.payment.id) {
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
                    amount: Number(paymentResponse.payment.cashDetails?.buyerSuppliedMoney.amount),
                    currency: paymentResponse.payment.cashDetails?.buyerSuppliedMoney.currency,
                },
                changeBackMoney: {
                    amount: Number(paymentResponse.payment?.cashDetails?.changeBackMoney?.amount),
                    currency: paymentResponse.payment.cashDetails?.changeBackMoney?.currency,
                },
            },
        };
        res.status(201).json({ data: { payment: responsePayment } });
    }
    catch (error) {
        console.error("New payment error:", error);
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
