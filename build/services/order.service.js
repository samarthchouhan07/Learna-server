"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllOrdersService = exports.neworder = void 0;
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const order_Model_1 = __importDefault(require("../models/order.Model"));
exports.neworder = (0, catchAsyncErrors_1.catchAsyncError)(async (data, res, next) => {
    const order = await order_Model_1.default.create(data);
    console.log("new order got hit");
    res.status(200).json({
        success: true,
        order,
    });
});
const getAllOrdersService = async (res) => {
    try {
        console.log("getAllordersService got hit ");
        const orders = await order_Model_1.default.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            orders,
        });
        console.log("no error in getAllOrdersService");
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving orders',
        });
    }
};
exports.getAllOrdersService = getAllOrdersService;
