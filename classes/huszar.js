/*Ide jön a huszár osztály, lépések, ütések, stb. */

class Huszar {
    canMoveInLShape = true; // Can move in an L-shape
    canAttack = true; // Can attack on the L-shape squares
    isBlocked = false; // If the huszár is blocked by another piece
    color = "white" | "black";
    faIcon = "fa-regular fa-chess-knight" | "fa-solid fa-chess-knight"; // Font Awesome icon for the huszár, white and black

    position = {
        x: 0,
        y: 0,
    };

    constructor(color, position) {
        this.color = color;
        this.position = position;
    }
}