if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV === 'development') {
    require('dotenv').config();
};

const PORT = process.env.PORT;
const cors = require('cors');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const Io = require('socket.io')(server);
const cookieParser = require('cookie-parser');

//Db connect
require('./db.config')();

app.use(cookieParser());
app.use(cors({credentials: true, origin: ["http://localhost:3000", "localhost"]}));
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use((req,res,next) => {
    req.Io = Io;
    // req.redisClient = RedisClient;
    next();
});

app.use(require('./routes'))
// app.get('/gettoken', (req,res,next) => {
//     res.cookie('hallo', "12345678");
//     res.status(200).json({message: "Cookie set"})
// })

// app.get('/checktoken', (req,res,next) => {
//     console.log(req.cookies.hallo)
//     res.status(200).json({token: req.cookies.hallo})
// })

app.use(require('./middlewares/errorHandler'));

server.listen(PORT, () => console.log(`Server started on ${PORT}`))

Io.on('connection', socket => {
    console.log('Io connect')
    socket.on(`disconnect`, () => console.log('Io disconnect'))
})