"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("dotenv").config();
const error_1 = require("./middleware/error");
const express_1 = __importDefault(require("express"));
const user_route_1 = __importDefault(require("./routes/user.route"));
exports.app = (0, express_1.default)();
const course_route_1 = __importDefault(require("./routes/course.route"));
const order_route_1 = __importDefault(require("./routes/order.route"));
const notification_route_1 = __importDefault(require("./routes/notification.route"));
const analytics_route_1 = __importDefault(require("./routes/analytics.route"));
const layout_route_1 = __importDefault(require("./routes/layout.route"));
const express_rate_limit_1 = require("express-rate-limit");
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
exports.app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', "https://learna-client.vercel.app"],
    credentials: true,
}));
exports.app.use(express_1.default.json({ limit: "50mb" }));
exports.app.use((0, cookie_parser_1.default)());
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
});
exports.app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to the API",
    });
});
exports.app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});
exports.app.use("/api/v1", user_route_1.default);
exports.app.use("/api/v1", course_route_1.default);
exports.app.use("/api/v1", order_route_1.default);
exports.app.use("/api/v1", notification_route_1.default);
exports.app.use("/api/v1", analytics_route_1.default);
exports.app.use("/api/v1", layout_route_1.default);
exports.app.get("/test", (req, res, next) => {
    res.status(200).json({
        success: true,
        message: "API is working",
    });
});
exports.app.all("*", (req, res, next) => {
    const err = new Error(`Route ${req.originalUrl} not found`);
    next(err);
});
exports.app.use(limiter);
exports.app.use(error_1.ErrorMiddleware);
exports.default = exports.app;
