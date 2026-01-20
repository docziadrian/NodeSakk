const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const ejs = require("ejs");
const path = require("path");

const ALL_ROOMS = [];

const createRoom = (roomId, creator) => {
  const room = {
    id: roomId,
    label: roomId,
    players: [creator],
    messages: [],
    maxPlayers: 2,
  };
  ALL_ROOMS.push(room);
  return room;
};

const ERRORS = {
  missingFields: "Hiányzó belépési adatok!",
};

const getRoomById = (roomId) => {
  return ALL_ROOMS.find((room) => room.id === roomId);
};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
// Serve images and other static files from /assets (used by footer logo, etc.)
app.use("/assets", express.static(path.join(__dirname, "assets")));

app.get("/", (req, res) => {
  const { error = "", nickname = "", room = "" } = req.query;
  res.render("index", {
    rooms: ALL_ROOMS,
    error: ERRORS[error],
    nickname,
    room,
  });
});

app.get("/room", (req, res) => {
  const { username, room } = req.query;
  if (!username || !room) {
    return res.redirect("/?error=missingFields");
  }
  const foundRoom = getRoomById(room);
  res.render("room", {
    username,
    room,
    players: foundRoom ? foundRoom.players : [],
  });
});

io.on("connection", (socket) => {
  console.log(`Új felhasználó csatlakozott: ${socket.id}`);

  socket.on("create-room", ({ name, creator }) => {
    if (!name || !creator) return;
    if (ALL_ROOMS.find((r) => r.id === name)) {
      socket.emit("room-exists", name);
      return;
    }
    const room = createRoom(name, creator);
    socket.join(name);
    socket.emit("room-created", room);
    io.emit("rooms-updated", ALL_ROOMS);
  });

  socket.on("join-room", ({ nickname, room }) => {
    const foundRoom = getRoomById(room);
    if (foundRoom && !foundRoom.players.includes(nickname)) {
      foundRoom.players.push(nickname);
    }
    socket.join(room);
    socket
      .to(room)
      .emit("system-message", `${nickname} csatlakozott a beszélgetéshez.`);
    socket.emit("room-joined", foundRoom);
  });

  socket.on("send-message", ({ room, nickname, message }) => {
    const foundRoom = getRoomById(room);
    if (foundRoom) {
      const msg = { sender: nickname, text: message };
      foundRoom.messages.push(msg);
      io.to(room).emit("new-message", msg);
    }
  });

  socket.on("leave-room", ({ nickname, room }) => {
    const foundRoom = getRoomById(room);
    if (foundRoom) {
      foundRoom.players = foundRoom.players.filter((n) => n !== nickname);
    }
    socket
      .to(room)
      .emit("system-message", `${nickname} kilépett a beszélgetésből.`);
    socket.leave(room);
  });
});

server.listen(3000, () => {
  console.log(`http://localhost:3000`);
});
