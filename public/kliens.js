class ChessGameClient {
  constructor() {
    this.socket = io();
    this.username = null;
    this.roomName = null;
    this.playerColor = null;
    this.gameType = null;
    this.gameState = null;
    this.selectedFrom = null;
    this.possibleTargets = null;
    this.highlighted = new Set();
    this.markers = new Set();
    this.setupSocketListeners();
    this.setupBoardListeners();
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
        this.gameType = data.gameType;
        this.updatePlayerInfo();
      }
      if (data && data.gameState) {
        this.gameState = data.gameState;
        this.renderGameState();
      }
    });

    this.socket.on("room-full", () => {
      alert("A szoba megtelt! Maximum 2 játékos lehet egy szobában.");
      window.location.href = "/";
    });

    this.socket.on("game-start", (data) => {
      this.gameState = data.gameState;
      this.showNotification("A játék elkezdődött!");
      this.renderGameState();
    });

    this.socket.on("player-move", (data) => {
      this.handleServerMove(data);
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

    this.socket.on("moves-for", (data) => {
      if (!data || !data.from) return;

      // Frissítjük a kör infót, ha küldi a szerver
      if (this.gameState && data.currentTurn) {
        this.gameState.currentTurn = data.currentTurn;
        this.updateTurnInfo();
      }

      if (!data.ok) {
        console.log("moves-for hiba:", data);
        if (data.error) this.showNotification(data.error);
        return;
      }

      console.log("moves-for ok:", data);

      if (
        !this.selectedFrom ||
        data.from.x !== this.selectedFrom.x ||
        data.from.y !== this.selectedFrom.y
      ) {
        console.log("moves-for nem egyezik a kiválasztással:", {
          selectedFrom: this.selectedFrom,
          from: data.from,
        });
        return;
      }

      this.possibleTargets = data.possible || {
        moves: [],
        attacks: [],
        enPassant: [],
      };
      this.highlightTargets();
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
      now.getMinutes(),
    ).padStart(2, "0")}`;
  }

  updatePlayerInfo() {
    const roomInfo = document.getElementById("room-info");
    if (roomInfo) {
      const gameTypeText =
        this.gameType === "fun" ? "Vicces sakk" : "Normál sakk";
      roomInfo.textContent = `${this.username} - ${this.roomName} (${
        this.playerColor === "white" ? "Fehér" : "Fekete"
      }) - ${gameTypeText}`;
    }
    this.updateTurnInfo();
  }

  updateTurnInfo() {
    const turnInfo = document.getElementById("turn-info");
    if (!turnInfo) return;

    if (!this.gameState || !this.playerColor || !this.gameState.currentTurn) {
      turnInfo.textContent = "";
      return;
    }

    turnInfo.textContent =
      this.gameState.currentTurn === this.playerColor
        ? "Te következel."
        : "Az ellenfeled következik.";
  }

  handleServerMove(data) {
    // A szerver minden lépést broadcastol a szobában (saját + ellenfél).
    if (data && data.gameState) {
      this.gameState = data.gameState;
      this.clearSelection();
      this.renderGameState();
      return;
    }
    console.log("Lépés adat:", data);
  }

  renderGameState() {
    if (!this.gameState) return;

    // Ürítjük a mezőket
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.getElementById(`${col}${row}`);
        if (square) square.innerHTML = "";
      }
    }

    // Bábuk kirajzolása Font Awesome ikonokkal
    const pieces = this.gameState.pieces || [];
    for (const p of pieces) {
      const x = p?.position?.x;
      const y = p?.position?.y;
      if (typeof x !== "number" || typeof y !== "number") continue;

      const square = document.getElementById(`${x}${y}`);
      if (!square) continue;

      const icon = document.createElement("i");
      icon.className = p.faIcon || "";
      // Fehér ikon világos, fekete ikon sötét
      icon.style.color = p.color === "white" ? "#f8fafc" : "#0f172a";
      icon.style.textShadow =
        p.color === "white"
          ? "0 1px 2px rgba(0,0,0,.5)"
          : "0 1px 2px rgba(255,255,255,.25)";

      square.appendChild(icon);
    }

    this.updateTurnInfo();
  }

  setupBoardListeners() {
    const board = document.getElementById("chess-board");
    if (!board) {
      window.addEventListener("load", () => this.setupBoardListeners(), {
        once: true,
      });
      return;
    }
    if (board.dataset.listenersAttached === "1") return;
    board.dataset.listenersAttached = "1";

    board.addEventListener("click", (e) => {
      const el = e.target;
      if (!el) return;
      const square = el.closest ? el.closest("div[id][data-x][data-y]") : null;
      if (!square) return;

      const x = Number(square.dataset.x);
      const y = Number(square.dataset.y);
      if (Number.isNaN(x) || Number.isNaN(y)) return;

      this.onSquareClick({ x, y });
    });
  }

  getPieceAtClient(pos) {
    const pieces = this.gameState?.pieces || [];
    return (
      pieces.find(
        (p) => p?.position?.x === pos.x && p?.position?.y === pos.y,
      ) || null
    );
  }

  onSquareClick(pos) {
    if (!this.gameState || !this.playerColor) return;

    // Kiválasztás
    if (!this.selectedFrom) {
      if (this.gameState.currentTurn !== this.playerColor) return;

      const piece = this.getPieceAtClient(pos);
      if (!piece || piece.color !== this.playerColor) return;

      this.selectedFrom = { x: pos.x, y: pos.y };
      this.possibleTargets = null;
      this.highlightSelection();

      this.socket.emit(
        "get-moves",
        {
          room: this.roomName,
          nickname: this.username,
          from: this.selectedFrom,
        },
        (data) => {
          // Ack válasz (biztosan megjön, ha a szerver kezeli)
          if (!data) return;
          console.log("get-moves ack:", data);

          // ugyanaz a feldolgozás, mint a moves-for eventnél
          if (this.gameState && data.currentTurn) {
            this.gameState.currentTurn = data.currentTurn;
            this.updateTurnInfo();
          }
          if (!data.ok) {
            if (data.error) this.showNotification(data.error);
            return;
          }
          if (
            this.selectedFrom &&
            data.from &&
            data.from.x === this.selectedFrom.x &&
            data.from.y === this.selectedFrom.y
          ) {
            this.possibleTargets = data.possible || {
              moves: [],
              attacks: [],
              enPassant: [],
            };
            this.highlightTargets();
          }
        },
      );
      console.log("get-moves elküldve:", {
        room: this.roomName,
        nickname: this.username,
        from: this.selectedFrom,
        playerColor: this.playerColor,
        currentTurn: this.gameState.currentTurn,
      });
      return;
    }

    // Kiválasztás törlése
    if (pos.x === this.selectedFrom.x && pos.y === this.selectedFrom.y) {
      this.clearSelection();
      this.renderGameState();
      return;
    }

    const canGo =
      (this.possibleTargets?.moves || []).some(
        (m) => m.x === pos.x && m.y === pos.y,
      ) ||
      (this.possibleTargets?.attacks || []).some(
        (a) => a.x === pos.x && a.y === pos.y,
      ) ||
      (this.possibleTargets?.enPassant || []).some(
        (ep) => ep.x === pos.x && ep.y === pos.y,
      );

    if (canGo) {
      this.makeMove(this.selectedFrom, pos);
      return;
    }

    // Átváltás másik saját bábura
    if (this.gameState.currentTurn === this.playerColor) {
      const piece = this.getPieceAtClient(pos);
      if (piece && piece.color === this.playerColor) {
        this.clearSelection();
        this.selectedFrom = { x: pos.x, y: pos.y };
        this.highlightSelection();
        this.socket.emit("get-moves", {
          room: this.roomName,
          nickname: this.username,
          from: this.selectedFrom,
        });
      }
    }
  }

  clearSelection() {
    this.selectedFrom = null;
    this.possibleTargets = null;
    this.clearHighlights();
  }

  clearHighlights() {
    for (const id of this.highlighted) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.style.outline = "";
      el.style.outlineOffset = "";
    }
    this.highlighted.clear();

    // Pöttyök eltávolítása
    for (const id of this.markers) {
      const el = document.getElementById(id);
      if (!el) continue;
      const marker = el.querySelector(".move-marker");
      if (marker) marker.remove();
    }
    this.markers.clear();
  }

  highlightSelection() {
    this.clearHighlights();
    if (!this.selectedFrom) return;
    const id = `${this.selectedFrom.x}${this.selectedFrom.y}`;
    const el = document.getElementById(id);
    if (!el) return;
    el.style.outline = "4px solid #facc15"; // sárga
    el.style.outlineOffset = "-4px";
    this.highlighted.add(id);
  }

  highlightTargets() {
    this.highlightSelection();

    const addOutline = (pos, color) => {
      const id = `${pos.x}${pos.y}`;
      const el = document.getElementById(id);
      if (!el) return;
      el.style.outline = `4px solid ${color}`;
      el.style.outlineOffset = "-4px";
      this.highlighted.add(id);
    };

    const addMarker = (pos, color) => {
      const id = `${pos.x}${pos.y}`;
      const el = document.getElementById(id);
      if (!el) return;

      // kör jelölő (spec: szürke pötty a léphető mezőkön)
      const marker = document.createElement("div");
      marker.className = "move-marker";
      marker.style.width = "14px";
      marker.style.height = "14px";
      marker.style.borderRadius = "9999px";
      marker.style.background = color;
      marker.style.opacity = "0.85";
      marker.style.boxShadow = "0 1px 2px rgba(0,0,0,.35)";
      marker.style.pointerEvents = "none";
      el.appendChild(marker);
      this.markers.add(id);
    };

    // Léphető mezők: szürke pötty + zöld keret
    for (const m of this.possibleTargets?.moves || []) {
      addOutline(m, "#22c55e");
      addMarker(m, "#94a3b8"); // szürke
    }

    // Ütések (és en passant): piros keret + piros pötty
    for (const a of this.possibleTargets?.attacks || []) {
      addOutline(a, "#ef4444");
      addMarker(a, "#ef4444");
    }
    for (const ep of this.possibleTargets?.enPassant || []) {
      addOutline(ep, "#ef4444");
      addMarker(ep, "#ef4444");
    }
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
        <div class="text-6xl mb-4">${isWinner ? ":)" : ":("}</div>
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
