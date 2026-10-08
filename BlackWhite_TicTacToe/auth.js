const jwt = require('jsonwebtoken')

function auth(req, res, next) {
    const authHeader = req.headers.authorization

    console.log("AUTH HEADER:", authHeader)

    if (!authHeader) {
        return res.status(401).json({
            message: 'please sign in'
        })
    }

    const token = authHeader.split(" ")[1]

    console.log("TOKEN:", token)

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.userId = decoded.userId

        next()
    } catch (err) {
        return res.status(401).json({
            message: 'invalid token'
        })
    }
}

module.exports = auth