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

app.use(cors({credentials: true, origin: ["http://localhost:3000"]}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use((req,res,next) => {
    req.Io = Io;
    next();
});

// app.use(require('./routes'))
app.get('/', (req,res,next) => {
    res.status(200).json({message: "We are connected"})
})
app.get('/gettoken', (req,res,next) => {
    res.cookie('myexchange', "123456")
    res.status(200).json({message: "Cookie set"})
})

app.get('/checktoken', (req,res,next) => {
    let token = req.cookies.myexchange;
    console.log(req.cookies)
    if (token) {
        res.status(200).json({token});
    }else {
        res.status(500).json({message: "Token not valid"})
    }
});

app.get('/clearcookie', (req,res,next) => {
    res.clearCookie('myexchange');
    res.clearCookie('hallo');
    res.clearCookie('_csrf')
    res.status(200).json({message: "Cookie already clear"})
})

app.use(require('./middlewares/errorHandler'));

server.listen(PORT, () => console.log(`Server started on ${PORT}`))

Io.on('connection', socket => {
    console.log('Io connect')
    socket.on(`disconnect`, () => console.log('Io disconnect'))
})