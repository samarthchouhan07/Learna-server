"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMiddleware = void 0;
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const ErrorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    console.log(err);
    err.message = err.message || "Internal server error";
    if (err.message === "CastError") {
        const message = `Resource not found. Invalid: ${err.path}`;
        err = new ErrorHandler_1.default(message, 400);
    }
    if (err.statusCode === 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
        err = new ErrorHandler_1.default(message, 400);
    }
    if (err.name === "JsonWebTokenError") {
        const message = `json web token is invalid  please try again`;
        err = new ErrorHandler_1.default(message, 400);
    }
    if (err.name === "TokenExpireError") {
        const message = 'Json web Token is expired';
        err = new ErrorHandler_1.default(message, 400);
    }
    if (err.name === 'MongoError') {
        const message = "Duplicate email entered";
        err = new ErrorHandler_1.default(message, 400);
    }
    res.status(err.statusCode).json({
        success: false,
        message: err.message
    });
};
exports.ErrorMiddleware = ErrorMiddleware;
