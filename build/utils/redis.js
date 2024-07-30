"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = require("ioredis");
require('dotenv').config();
const redisClient = () => {
    if (process.env.REDIS_URL) {
        console.log("redis connected");
        return process.env.REDIS_URL;
    }
    throw new Error("redis connection failure");
};
exports.redis = new ioredis_1.Redis(redisClient());
