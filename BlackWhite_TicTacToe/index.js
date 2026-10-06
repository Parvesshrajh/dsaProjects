const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const zod = require('zod')
require('dotenv').config()
const userModel = require("./db")


const app = express()
const userSchema = zod.object({
    username: zod
        .string()
        .trim()
        .min(3)
        .max(20)
        .regex(
            /^[a-zA-Z0-9_]+$/,
            "username can only contain letters, numbers, and underscores"
        ),
    password: zod
        .string()
        .min(6)
        .max(15)
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^a-zA-Z0-9]/,
            "Password must contain at least one special character"
        )
})

app.use(express.json())
app.post('/signup', async (req, res) => {
    const data = {
        username: req.body.username,
        password: req.body.password
    }

    const acceptance = userSchema.safeParse(data)

    if (!acceptance.success) {
        return res.status(400).json({
            message: 'please provide valid credentials'
        })
    }

    try {
        const existingUser = await userModel.findOne({
            username: data.username
        })

        if (existingUser) {
            return res.status(409).json({
                message: 'user already exists'
            })
        }

        await userModel.create({
            username: data.username,
            password: data.password
        })

        return res.status(201).json({
            message: 'signed up successfully'
        })
    } catch (err) {
        console.log(err)

        return res.status(500).json({
            message: 'server error'
        })
    }
})

app.post('/signin', async (req, res) => {
    const data = {
        username: req.body.username,
        password: req.body.password
    }

    const acceptance = userSchema.safeParse(data)

    if (!acceptance.success) {
        return res.status(400).json({
            message: 'please provide valid credentials'
        })
    }

    try {
        const user = await userModel.findOne({
            username: data.username,
            password: data.password
        })

        if (!user) {
            return res.status(400).json({
                message: 'please provide valid username or password'
            })
        }

        const token = jwt.sign({
            userId: user._id
        }, process.env.JWT_SECRET)

        return res.status(200).json({
            message: 'signed in successfully',
            token: token
        })
    } catch (err) {
        console.log(err)

        return res.status(500).json({
            message: 'server error'
        })
    }
})

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_PASS)

        console.log('MongoDb connected')

        app.listen(process.env.PORT, () => {
            console.log(`server running on http://localhost/:${process.env.PORT}`)
        })
    } catch (err) {
        console.log("MongoDb connection failed")
        console.log(err)
    }
}
main()