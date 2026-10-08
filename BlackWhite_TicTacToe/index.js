const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const zod = require('zod')
require('dotenv').config()
const userModel = require("./db")
const auth = require("./auth")


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
const games = new Map()

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html")
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

        const hashedPassword = await bcrypt.hash(data.password, 5)

        await userModel.create({
            username: data.username,
            password: hashedPassword
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
        })

        if (!user) {
            return res.status(400).json({
                message: 'please provide valid username or password'
            })
        }

        const passwordMatch = await bcrypt.compare(data.password, user.password)

        if (passwordMatch) {
            const token = jwt.sign({
                userId: user._id
            }, process.env.JWT_SECRET)

            return res.status(200).json({
                message: 'signed in successfully',
                token: token
            })
        }
        else {
            return res.status(403).json({
                message: 'incorrect credentials'
            })
        }

    } catch (err) {
        console.log(err)

        return res.status(500).json({
            message: 'server error'
        })
    }
})

app.get('/player', (req, res) => {
    return res.sendFile(__dirname + "/game.html")
})

app.use(auth)

app.post('/game', (req, res) => {

    const userId = req.userId

    const playerWish = req.body.playerWish
    const boardIndex = req.body.boardIndex

    if (!games.has(userId)) {
        games.set(userId, {
            symbol: '',
            oppositeSymbol: '',
            board: ['', '', '', '', '', '', '', '', '',]
        })
    }

    const game = games.get(userId)

    if (playerWish) {
        game.symbol = playerWish
        game.oppositeSymbol = game.symbol === 'X' ? 'O' : 'X'

        return res.json({
            message: 'symbol selected'
        })
    }

    if (boardIndex) {
        const index = Number(boardIndex) - 1
        if (game.board[index] !== '') {
            return res.status(400).json({
                message: 'cell already occupied',
                board: game.board
            })
        }

        game.board[index] = game.symbol

        let winner = isWin(game.board)

        if (winner) {
            return res.json({
                win: winner,
                board: game.board
            })
        }

        if (!game.board.includes('')) {
            return res.json({
                draw: true,
                board: game.board
            })
        }

        let randomIndex
        do {
            randomIndex = Math.floor(Math.random() * game.board.length)
        } while (game.board[randomIndex] !== '')

        game.board[randomIndex] = game.oppositeSymbol

        winner = isWin(game.board)

        if (winner) {
            return res.json({
                win: winner,
                board: game.board
            })
        }

        return res.json({
            message: 'placed on-board',
            board: game.board
        })
    }
})

function isWin(board) {
    if (board[0] === board[1] && board[1] == board[2] && board[0] !== '') {
        return board[0]
    }

    if (board[3] === board[4] && board[4] == board[5] && board[3] !== '') {
        return board[3]
    }

    if (board[6] === board[7] && board[7] == board[8] && board[6] !== '') {
        return board[6]
    }

    if (board[0] === board[3] && board[3] == board[6] && board[0] !== '') {
        return board[0]
    }

    if (board[1] === board[4] && board[4] == board[7] && board[1] !== '') {
        return board[1]
    }

    if (board[2] === board[5] && board[5] == board[8] && board[2] !== '') {
        return board[2]
    }

    if (board[0] === board[4] && board[4] == board[8] && board[0] !== '') {
        return board[0]
    }

    if (board[2] === board[4] && board[4] == board[6] && board[2] !== '') {
        return board[2]
    }
    return null
}

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_PASS)

        console.log('MongoDb connected')

        app.listen(process.env.PORT, () => {
            console.log(`server running on http://localhost:${process.env.PORT}`)
        })
    } catch (err) {
        console.log("MongoDb connection failed")
        console.log(err)
    }
}
main()