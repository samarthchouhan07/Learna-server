import Errorhandler from "../utils/ErrorHandler";
import {Request,Response,NextFunction} from "express"
export const ErrorMiddleware=(err:any ,req:Request,res:Response,next:NextFunction)=>{
    err.statusCode=err.statusCode||500
    console.log(err)
    err.message=err.message||"Internal server error"

    if(err.message==="CastError"){
        const message=`Resource not found. Invalid: ${err.path}`
        err=new Errorhandler(message,400)
    }
    if(err.statusCode===11000){
        const message=`Duplicate ${Object.keys(err.keyValue)} entered`
        err=new Errorhandler(message,400)
    }
    if(err.name==="JsonWebTokenError"){
        const message=`json web token is invalid  please try again`
        err=new Errorhandler(message,400)
    }
    if(err.name==="TokenExpireError"){
        const message='Json web Token is expired'
        err=new Errorhandler(message,400)
    }
    if (err.name==='MongoError' ) {
        const message="Duplicate email entered"
        err=new Errorhandler(message,400)
    }

    res.status(err.statusCode).json({
        success:false,
        message:err.message
    })
}