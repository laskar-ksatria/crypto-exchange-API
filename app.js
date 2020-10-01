require('dotenv').config();

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


// const whiteList = ["http://localhost:3000", "http://localhost:3001"];

// app.use(cors({ credentials: true, origin: whiteList }));
app.use(cors())
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use((req,res,next) => {
    req.Io = Io;
    next();
});
app.use(require('./routes'))

app.use(require('./middlewares/errorHandler'));

server.listen(PORT, () => console.log(`Server started on ${PORT}`))

Io.on('connection', socket => {
    socket.on(`disconnect`, () => {})
})