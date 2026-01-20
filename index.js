const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const ejs = require("ejs");
const path = require("path");

const ALL_ROOMS = [];

const createRoom = (roomId) => {
  const room = {
    id: roomId,
    players: [],
  };
  ALL_ROOMS.push(room);
};

const ERRORS = {
  missingFields: "Hiányzó belépési adatok!",
};

const getRoomById = (roomId) => {
  return ALL_ROOMS.find((room) => room.id === roomId);
};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  const { error = "", nickname = "", room = "" } = req.query;
  res.render("index", {
    rooms: ALL_ROOMS,
    error: ERRORS[error],
    nickname,
    room,
  });
});

app.get("/main", (req, res) => {
  const { nickname, room } = req.query;

  if (!nickname || !room) {
    return res.redirect(
      `/?error=missingFileds&nickname=${nickname}&room=${room}`
    );
  }

  const chatConfig = {
    nickname,
    roomId: room,
    roomLabel: getRoomById(room).label,
  };

  res.render("main", { chatConfig });
});

io.on("connection", (socket) => {
  console.log(`Új felhasználó csatlakozott: ${socket.id}`);

  socket.on("join-room", ({ nickname, room }) => {
    socket.join(room);
    socket
      .to(room)
      .emit("system-message", `${nickname} csatlakozott a beszélgetéshez.`);
  });

  socket.on("leave-room", ({ nickname, room }) => {
    socket
      .to(room)
      .emit("system-message", `${nickname} kilépett a beszélgetésből.`);
    socket.disconnect();
  });
});

server.listen(3000, () => {
  console.log(`http://localhost:3000`);
});
