class ChessGameClient {
  constructor() {
    this.socket = io();
    this.username = null;
    this.roomName = null;
    this.playerColor = null;
    this.gameState = null;
    this.setupSocketListeners();
  }

  init(username, roomName) {
    this.username = username;
    this.roomName = roomName;
    this.socket.emit("join-room", { nickname: username, room: roomName });
  }

  setupSocketListeners() {
    this.socket.on("room-joined", (data) => {
      if (data && data.playerColor) {
        this.playerColor = data.playerColor;
        this.updatePlayerInfo();
      }
    });

    this.socket.on("room-full", () => {
      alert("A szoba megtelt! Maximum 2 játékos lehet egy szobában.");
      window.location.href = "/";
    });

    this.socket.on("game-start", (data) => {
      this.gameState = data.gameState;
      this.showNotification("A játék elkezdődött!");
    });

    this.socket.on("player-move", (data) => {
      this.handleOpponentMove(data);
    });

    this.socket.on("new-message", (msg) => {
      this.addChatMessage(msg.sender, msg.text);
    });

    this.socket.on("system-message", (msg) => {
      this.addChatMessage("", msg, true);
    });

    this.socket.on("opponent-disconnected", () => {
      this.showGameEndModal(true, "Az ellenfeled kilépett a játékból!");
    });

    this.socket.on("game-over", (data) => {
      this.showGameEndModal(data.winner === this.username, data.reason);
    });

    this.socket.on("player-left", () => {
      this.showGameEndModal(true, "Az ellenfeled elhagyta a játékot!");
    });
  }

  sendMessage(message) {
    if (message.trim()) {
      this.socket.emit("send-message", {
        room: this.roomName,
        nickname: this.username,
        message: message.trim(),
      });
    }
  }

  makeMove(from, to) {
    this.socket.emit("player-move", {
      room: this.roomName,
      nickname: this.username,
      from,
      to,
    });
  }

  leaveRoom() {
    this.socket.emit("leave-room", {
      nickname: this.username,
      room: this.roomName,
    });
  }

  addChatMessage(sender, message, isSystem = false) {
    const messagesDiv = document.getElementById("chat-messages");
    if (!messagesDiv) return;

    const messageDiv = document.createElement("div");

    if (isSystem) {
      messageDiv.className = "text-center text-gray-500 text-xs italic";
      messageDiv.textContent = message;
    } else {
      messageDiv.className = "text-sm";
      const time = this.formatTime();
      messageDiv.innerHTML = `
        <div class="bg-white rounded p-2 shadow-sm">
          <span class="text-gray-400 text-xs">${time}</span>
          <span class="font-semibold text-amber-600">${sender}</span>
          <span class="text-gray-700"> → ${message}</span>
        </div>
      `;
    }

    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  formatTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  }

  updatePlayerInfo() {
    const roomInfo = document.getElementById("room-info");
    if (roomInfo) {
      roomInfo.textContent = `${this.username} - ${this.roomName} (${
        this.playerColor === "white" ? "Fehér" : "Fekete"
      })`;
    }
  }

  handleOpponentMove(data) {
    console.log("Opponent move:", data);
  }

  showNotification(message) {
    const notification = document.createElement("div");
    notification.className =
      "fixed top-4 right-4 bg-amber-600 text-white px-6 py-3 rounded-lg shadow-lg z-50";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  showGameEndModal(isWinner, reason) {
    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    modal.innerHTML = `
      <div class="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl">
        <div class="text-6xl mb-4">${isWinner ? "🎉" : "😢"}</div>
        <h2 class="text-3xl font-bold mb-4 ${
          isWinner ? "text-green-600" : "text-red-600"
        }">
          ${isWinner ? "Gratulálunk!" : "Sajnáljuk!"}
        </h2>
        <p class="text-lg text-gray-700 mb-2">
          ${
            isWinner
              ? "Nyertél! Nagyszerű játék volt!"
              : "Vesztettél! Legközelebb jobban megy!"
          }
        </p>
        <p class="text-sm text-gray-500 mb-6">${reason || ""}</p>
        <button
          onclick="window.location.href='/'"
          class="px-8 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors"
        >
          Vissza a főoldalra
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ChessGameClient;
}
