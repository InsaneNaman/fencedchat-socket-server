require("dotenv").config();
var server = require("express")();
var http = require("http").createServer(server);
const bodyParser = require("body-parser");
const cors = require("cors");
const hashjs = require("hash.js");
//server
var io = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});

//database
const db = require("monk")(process.env.MONGO_DB_URL);

const roomCollection = db.get(process.env.MONGO_DB_COLLECTION_NAME);

server.use(bodyParser.json());
server.use(cors());

server.get("/", (req, res) => {
  res.send("Server is running ");
});

server.post("/validateroom", (req, res) => {
  const { roomId, password } = req.body;
  const hashPass = hashjs.sha256().update(password).digest("hex");

  roomCollection.findOne({ room: roomId }).then((doc) => {
    console.log(doc);
    if (doc !== null && doc.secKey === hashPass) {
      res.send({
        status: "success",
        msg: "room-found",
      });
    } else {
      res.send({
        status: "error",
        msg: "room-notfound",
      });
    }
  });
});

server.post("/createroom", (req, res) => {
  const { roomId, password } = req.body;
  const hashPass = hashjs.sha256().update(password).digest("hex");
  roomCollection
    .insert({
      room: roomId,
      secKey: hashPass,
    })
    .then(() => {
      res.json({
        status: "success",
        msg: "room-created",
      });
    });
});

io.on("connection", (socket) => {
  socket.on("join_room", (data) => {
    const { roomId, password } = data;
    const hashPass = hashjs.sha256().update(password).digest("hex");
    roomCollection.findOne({ room: roomId }).then((doc) => {
      if (doc.secKey === hashPass) {
        socket.join(roomId);
        socket.emit("new_client", "New Person Joined");
      }
    });
  });

  socket.on("broadcastMsgToRoom", (data) => {
    const { roomId, message } = data;
    socket.to(roomId).emit("new_message", message);
  });
});

http.listen(process.env.PORT || 8081, function () {
  console.log("Server has been initialised");
});
