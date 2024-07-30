import {app} from "./app"
require("dotenv").config()
import connectDB from "./utils/db"
import http from "http";
import {v2 as cloudinary} from "cloudinary";
import {initSocketServer} from "./socketServer" 
const server=http.createServer(app)

cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.CLOUD_API_KEY,
    api_secret:process.env.CLOUD_SECRET_KEY
})

initSocketServer(server);

server.listen(process.env.PORT,()=>{
    console.log(`server is connected with port ${process.env.PORT}`)
    connectDB()
})

