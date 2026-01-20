const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const ejs = require("ejs");
const path = require("path");

const JatekMotor = require("./classes/jatekmotor");
const Gyalog = require("./classes/gyalog");
const Bastya = require("./classes/bastya");
const Futo = require("./classes/futo");
const Huszar = require("./classes/huszar");
const Kiraly = require("./classes/kiraly");
const Vezer = require("./classes/vezer");

const ALL_ROOMS = [];

const createRoom = (roomId, creator) => {
  const room = {
    id: roomId,
    label: roomId,
    players: [creator],
    messages: [],
    maxPlayers: 2,
    playerColors: {}, // nickname -> "white"|"black"
    game: null, // JatekMotor példány
  };
  room.playerColors[creator] = "white";
  room.game = new JatekMotor({
    pieceClasses: { Gyalog, Bastya, Futo, Huszar, Kiraly, Vezer },
  });
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
    if (!foundRoom) {
      socket.emit("room-not-found");
      return;
    }

    if (foundRoom.players.length >= foundRoom.maxPlayers) {
      socket.emit("room-full");
      return;
    }

    if (!foundRoom.players.includes(nickname)) {
      foundRoom.players.push(nickname);
    }

    // Szín kiosztás: első játékos fehér (már a createRoom beállítja), második fekete
    if (!foundRoom.playerColors[nickname]) {
      const taken = new Set(Object.values(foundRoom.playerColors));
      foundRoom.playerColors[nickname] = taken.has("white") ? "black" : "white";
    }

    socket.join(room);
    socket.data.nickname = nickname;
    socket.data.room = room;

    socket
      .to(room)
      .emit("system-message", `${nickname} csatlakozott a beszélgetéshez.`);

    socket.emit("room-joined", {
      ...foundRoom,
      playerColor: foundRoom.playerColors[nickname],
      gameState: foundRoom.game ? foundRoom.game.getGameState() : null,
    });

    // Ha megvan a 2 játékos, indul a játék
    if (foundRoom.players.length === foundRoom.maxPlayers && foundRoom.game) {
      const gameState = foundRoom.game.initClassicSetup();
      io.to(room).emit("game-start", { gameState });
    }
  });

  socket.on("send-message", ({ room, nickname, message }) => {
    const foundRoom = getRoomById(room);
    if (foundRoom) {
      const msg = { sender: nickname, text: message };
      foundRoom.messages.push(msg);
      io.to(room).emit("new-message", msg);
    }
  });

  socket.on("player-move", ({ room, nickname, from, to, promotionChoice }) => {
    const foundRoom = getRoomById(room);
    if (!foundRoom || !foundRoom.game) return;

    const expectedColor = foundRoom.playerColors?.[nickname];
    if (!expectedColor) return;
    if (foundRoom.game.currentTurn !== expectedColor) {
      socket.emit("system-message", "Nem te jössz.");
      return;
    }

    const result = foundRoom.game.makeMove(from, to, promotionChoice);
    if (!result.ok) {
      socket.emit("system-message", result.error || "Hibás lépés.");
      return;
    }

    io.to(room).emit("player-move", {
      nickname,
      from,
      to,
      move: result.move,
      gameState: result.gameState,
    });
  });

  socket.on("leave-room", ({ nickname, room }) => {
    const foundRoom = getRoomById(room);
    if (foundRoom) {
      foundRoom.players = foundRoom.players.filter((n) => n !== nickname);
      if (foundRoom.playerColors) delete foundRoom.playerColors[nickname];
    }
    socket
      .to(room)
      .emit("system-message", `${nickname} kilépett a beszélgetésből.`);
    socket.leave(room);
    io.to(room).emit("player-left");
    io.emit("rooms-updated", ALL_ROOMS);
  });

  socket.on("disconnect", () => {
    const { nickname, room } = socket.data || {};
    if (!nickname || !room) return;
    const foundRoom = getRoomById(room);
    if (!foundRoom) return;

    foundRoom.players = foundRoom.players.filter((n) => n !== nickname);
    if (foundRoom.playerColors) delete foundRoom.playerColors[nickname];

    socket.to(room).emit("opponent-disconnected");
    io.emit("rooms-updated", ALL_ROOMS);
  });
});

server.listen(3000, () => {
  console.log(`http://localhost:3000`);
});
