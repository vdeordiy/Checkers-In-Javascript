$(function () {
  const Constants = Object.freeze({
    boardWidth: 330,
    boardHeight: 330,
    boardLength: 8,
    boardOffset: 16,
    boardBlockSize: 36.9,

    normalPiece1: 0,
    kingPiece1: 1,
    normalPiece2: 2,
    kingPiece2: 3,

    pieceSize: 23,

    player1: "Player 1",
    player2: "Player 2",
    wait: "wait",
    player1Wins: "Player 1 wins! Yay!",
    player2Wins: "Player 2 wins! Woohoo!",

    player1PrimaryColor: "#E2D5A1",
    player1SecondaryColor: "#98645B",
    player2PrimaryColor: "#98645B",
    player2SecondaryColor: "#544247",

    leftAttack: "leftAttack",
    rightAttack: "rightAttack",
  });

  const canvas = document.querySelector("canvas");
  canvas.width = Constants.boardWidth;
  canvas.height = Constants.boardHeight;
  const ctx = canvas.getContext("2d");

  const topMessage = document.getElementById("top-message");

  class Tween {
    constructor(xFrom, yFrom, xTo, yTo, onComplete, frames = 9) {
      this.xFrom = xFrom;
      this.yFrom = yFrom;
      this.xTo = xTo;
      this.yTo = yTo;
      this.frames = frames;
      this.frame = 0;
      this.done = false;
      this.onComplete = onComplete;
    }

    getX() {
      let distance = this.xTo - this.xFrom;
      let steps = this.frames;
      let progress = this.frame;

      return (distance / steps) * progress;
    }

    getY() {
      let distance = this.yTo - this.yFrom;
      let steps = this.frames;
      let progress = this.frame;

      return (distance / steps) * progress;
    }

    step() {
      this.frame += 1;

      if (this.frame > this.frames) {
        this.done = true;
        this.onComplete();
      }
    }
  }

  class Piece {
    constructor(pieceType, x, y) {
      this.pieceType = pieceType;
      this.x = x;
      this.y = y;
      this.moveTween = null;
      this.isKing = false;

      if (this.pieceType == 0 || this.pieceType == 1) {
        this.player = Constants.player1;
        this.forwardVectorY = -1;
      } else {
        this.player = Constants.player2;
        this.forwardVectorY = 1;
      }
    }

    draw(piecesImage) {
      const normalizedX =
        this.x * Constants.boardBlockSize + Constants.boardOffset;
      const normalizedY =
        this.y * Constants.boardBlockSize + Constants.boardOffset;

      ctx.drawImage(
        piecesImage,
        (piecesImage.width / 4) * this.pieceType,
        0,
        piecesImage.width / 4,
        piecesImage.height,
        normalizedX,
        normalizedY,
        piecesImage.width / 4 + Constants.pieceSize,
        piecesImage.height + Constants.pieceSize
      );
    }

    static pointInsideBoundaries(x, y) {
      if (x % 2 == 0 && y % 2 == 0) return false;
      if (x % 2 != 0 && y % 2 != 0) return false;

      if (x < 0 || y < 0) return false;
      if (x >= Constants.boardLength || y >= Constants.boardLength)
        return false;

      return true;
    }

    canAttack(pieceList) {
      const rightPiece = Piece.bulkCheckCollision(
        pieceList,
        this.x + 1,
        this.y + this.forwardVectorY
      );
      if (rightPiece != -1 && rightPiece.player != this.player) {
        if (
          Piece.bulkCheckCollision(
            pieceList,
            this.x + 2,
            this.y + this.forwardVectorY * 2
          ) == -1
        ) {
          if (
            Piece.pointInsideBoundaries(
              this.x + 2,
              this.y + this.forwardVectorY * 2
            )
          ) {
            return true;
          }
        }
      }

      const leftPiece = Piece.bulkCheckCollision(
        pieceList,
        this.x - 1,
        this.y + this.forwardVectorY
      );
      if (leftPiece != -1 && leftPiece.player != this.player) {
        if (
          Piece.bulkCheckCollision(
            pieceList,
            this.x - 2,
            this.y + this.forwardVectorY * 2
          ) == -1
        ) {
          if (
            Piece.pointInsideBoundaries(
              this.x - 2,
              this.y + this.forwardVectorY * 2
            )
          ) {
            return true;
          }
        }
      }

      if (this.isKing) {
        const rightPiece = Piece.bulkCheckCollision(
          pieceList,
          this.x + 1,
          this.y + -this.forwardVectorY
        );
        if (rightPiece != -1 && rightPiece.player != this.player) {
          if (
            Piece.bulkCheckCollision(
              pieceList,
              this.x + 2,
              this.y + -this.forwardVectorY * 2
            ) == -1
          ) {
            if (
              Piece.pointInsideBoundaries(
                this.x + 2,
                this.y + -this.forwardVectorY * 2
              )
            ) {
              return true;
            }
          }
        }

        const leftPiece = Piece.bulkCheckCollision(
          pieceList,
          this.x - 1,
          this.y + -this.forwardVectorY
        );
        if (leftPiece != -1 && leftPiece.player != this.player) {
          if (
            Piece.bulkCheckCollision(
              pieceList,
              this.x - 2,
              this.y + -this.forwardVectorY * 2
            ) == -1
          ) {
            if (
              Piece.pointInsideBoundaries(
                this.x - 2,
                this.y + -this.forwardVectorY * 2
              )
            ) {
              return true;
            }
          }
        }
      }

      return false;
    }

    static canPlayerAttack(pieceList, player) {
      for (let piece of pieceList) {
        if (piece.player == player && piece.canAttack(pieceList)) {
          return true;
        }
      }
      return false;
    }

    static deletePiece(pieceList, piece) {
      pieceList.splice(pieceList.indexOf(piece), 1);
    }

    moveTo(pieceList, x, y, onComplete) {
      // Constraints
      if (!Piece.pointInsideBoundaries(x, y)) return;

      if (Piece.bulkCheckCollision(pieceList, x, y) != -1) return;

      // Normal move
      if (this.y + this.forwardVectorY == y) {
        if (x == this.x + 1 || x == this.x - 1) {
          this.moveTween = new Tween(this.x, this.y, x, y, onComplete);
        }
      }

      // Attack move
      if (this.y + this.forwardVectorY * 2 == y) {
        const rightPiece = Piece.bulkCheckCollision(
          pieceList,
          this.x + 1,
          this.y + this.forwardVectorY
        );
        if (x == this.x + 2 && rightPiece != -1) {
          this.moveTween = new Tween(this.x, this.y, x, y, onComplete);
          Piece.deletePiece(pieceList, rightPiece);
        }

        const leftPiece = Piece.bulkCheckCollision(
          pieceList,
          this.x - 1,
          this.y + this.forwardVectorY
        );
        if (x == this.x - 2 && leftPiece != -1) {
          this.moveTween = new Tween(this.x, this.y, x, y, onComplete);
          Piece.deletePiece(pieceList, leftPiece);
        }
      }

      if (this.isKing) {
        // King normal move
        if (this.y + -this.forwardVectorY == y) {
          if (x == this.x + 1 || x == this.x - 1) {
            this.moveTween = new Tween(this.x, this.y, x, y, onComplete);
          }
        }

        // King attack move
        if (this.y + -this.forwardVectorY * 2 == y) {
          const rightPiece = Piece.bulkCheckCollision(
            pieceList,
            this.x + 1,
            this.y + -this.forwardVectorY
          );
          if (x == this.x + 2 && rightPiece != -1) {
            this.moveTween = new Tween(this.x, this.y, x, y, onComplete);
            Piece.deletePiece(pieceList, rightPiece);
          }

          const leftPiece = Piece.bulkCheckCollision(
            pieceList,
            this.x - 1,
            this.y + -this.forwardVectorY
          );
          if (x == this.x - 2 && leftPiece != -1) {
            this.moveTween = new Tween(this.x, this.y, x, y, onComplete);
            Piece.deletePiece(pieceList, leftPiece);
          }
        }
      }
    }

    static bulkDraw(piecesImage, pieceList) {
      for (let piece of pieceList) {
        // Tween
        if (piece.moveTween) {
          piece.moveTween.step();

          if (piece.moveTween.done) {
            piece.moveTween = null;

            // Round just in case
            piece.x = Math.round(piece.x);
            piece.y = Math.round(piece.y);
          } else {
            piece.x = piece.moveTween.getX() + piece.moveTween.xFrom;
            piece.y = piece.moveTween.getY() + piece.moveTween.yFrom;
          }
        }

        piece.draw(piecesImage);
      }
    }

    static bulkCheckCollision(pieceList, x, y) {
      for (let piece of pieceList) {
        if (piece.x == x && piece.y == y) {
          return piece;
        }
      }

      return -1;
    }

    static bulkCheckForKing(pieceList) {
      for (let piece of pieceList) {
        if (piece.player == Constants.player1) {
          if (piece.y == 0) {
            piece.pieceType = Constants.kingPiece1;
            piece.isKing = true;
          }
        } else {
          if (piece.y >= 7) {
            piece.pieceType = Constants.kingPiece2;
            piece.isKing = true;
          }
        }
      }
    }

    static counterPieces(pieceList, player) {
      let total = 0;

      for (let piece of pieceList) {
        if (piece.player == player) total += 1;
      }

      return total;
    }
  }

  const Logic = {
    initiate() {
      this.loadPiecesImage();
      this.loadBoardImage();

      this.setDefaultTemplate();
    },

    setDefaultTemplate() {
      this.pieceList = [];
      this.turn = Constants.player1;
      this.selectedPiece = null;
      this.playerHasInitialAttack = false;

      for (let i = 0; i < Constants.boardLength; i++) {
        for (let j = 0; j < Constants.boardLength; j++) {
          const pieceType = j >= 4 ? 0 : 2;

          // Constraints
          if (i % 2 == 0 && j % 2 == 0) continue;
          if (i % 2 != 0 && j % 2 != 0) continue;
          if (3 <= j && j <= 4) continue;

          const piece = new Piece(pieceType, i, j);
          this.pieceList.push(piece);
        }
      }

      this.drawWhoseTurnMessage();
    },

    loadBoardImage() {
      const boardImage = document.getElementById("board-image");
      this.boardImage = boardImage;
    },

    loadPiecesImage() {
      const piecesImage = document.getElementById("pieces-image");
      this.piecesImage = piecesImage;
    },

    drawWhoseTurnMessage() {
      if (this.turn == Constants.wait) {
        topMessage.innerHTML = "...";
      } else {
        topMessage.innerHTML = `${this.turn} Turn`;
      }

      topMessage.style.webkitTextFillColor =
        this.turn == Constants.player1
          ? Constants.player1PrimaryColor
          : Constants.player2PrimaryColor;
      topMessage.style.webkitTextStrokeColor =
        this.turn == Constants.player1
          ? Constants.player1SecondaryColor
          : Constants.player2SecondaryColor;
    },

    draw(timestamp) {
      ctx.drawImage(this.boardImage, 0, 0, canvas.width, canvas.height);

      Piece.bulkDraw(this.piecesImage, this.pieceList);
      Piece.bulkCheckForKing(this.pieceList);

      window.requestAnimationFrame(Logic.draw.bind(Logic));
    },

    handleClick(e, allowMoves = true) {
      const normalizedX = this.lastMouseX;
      const normalizedY = this.lastMouseY;

      const piece = Piece.bulkCheckCollision(
        this.pieceList,
        normalizedX,
        normalizedY
      );

      if (piece != -1) {
        if (piece.player == this.turn) {
          // Prevent double selection
          if (piece == this.selectedPiece) return;

          // Force an attack
          if (
            Piece.canPlayerAttack(this.pieceList, this.turn) &&
            !piece.canAttack(this.pieceList)
          )
            return;

          this.selectedPiece = piece;
        }
      }

      if (!allowMoves) return;

      if (this.selectedPiece) {
        this.selectedPiece.moveTo(
          this.pieceList,
          normalizedX,
          normalizedY,
          () => {
            // Determine whose turn
            if (
              Piece.canPlayerAttack(
                this.pieceList,
                this.selectedPiece.player
              ) &&
              this.playerHasInitialAttack
            ) {
              this.turn = this.selectedPiece.player;
            } else {
              this.turn =
                this.selectedPiece.player == Constants.player1
                  ? Constants.player2
                  : Constants.player1;

              // Track if player can carry multiple attacks
              this.playerHasInitialAttack = Piece.canPlayerAttack(
                this.pieceList,
                this.turn
              );

              this.selectedPiece = null;
            }

            // check for winners
            if (Piece.counterPieces(this.pieceList, this.turn) == 0) {
              if (this.turn == Constants.player1) {
                this.turn = Constants.player2Wins;
                topMessage.style.webkitTextFillColor =
                  Constants.player2PrimaryColor;
                topMessage.style.webkitTextStrokeColor =
                  Constants.player2SecondaryColor;
              } else {
                this.turn = Constants.player1Wins;
                topMessage.style.webkitTextFillColor =
                  Constants.player1PrimaryColor;
                topMessage.style.webkitTextStrokeColor =
                  Constants.player1SecondaryColor;
              }
              topMessage.innerText = this.turn;

              setTimeout(Logic.setDefaultTemplate.bind(Logic), 5000);
            } else {
              this.drawWhoseTurnMessage();
            }
          }
        );

        if (this.selectedPiece.moveTween) {
          this.turn = Constants.wait;
          this.drawWhoseTurnMessage();
        }
      }
    },

    handleResize() {
      const width = $(window).width();
      const height = $(window).height();

      let size = width > height ? height : width;
      size *= 0.78;

      $(canvas).width(size);
      $(canvas).height(size);
    },

    handleMouseMove(e) {
      // Keep track last mouse position
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.x;
      const y = e.clientY - rect.y;

      let normalizedX = x * (Constants.boardWidth / $(canvas).width());
      let normalizedY = y * (Constants.boardHeight / $(canvas).height());

      const widthSlice = Constants.boardWidth / Constants.boardLength;
      const heightSlice = Constants.boardHeight / Constants.boardLength;

      normalizedX = Math.floor(normalizedX / widthSlice);
      normalizedY = Math.floor(normalizedY / heightSlice);

      this.lastMouseX = normalizedX;
      this.lastMouseY = normalizedY;

      // Skip clicking for selecting pieces
      this.handleClick(e, (allowMoves = false));
    },
  };

  Logic.initiate();
  Logic.handleResize();

  window.addEventListener("resize", Logic.handleResize);
  canvas.addEventListener("click", Logic.handleClick.bind(Logic));
  canvas.addEventListener("dblclick", Logic.handleClick.bind(Logic));
  canvas.addEventListener("mousemove", Logic.handleMouseMove.bind(Logic));

  window.requestAnimationFrame(Logic.draw.bind(Logic));
});
