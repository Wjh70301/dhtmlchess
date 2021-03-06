/**
 * Javascript Class for Chess Board and Pieces on the board
 * JSON config type: chess.view.board.Board
 * @submodule Board
 * @namespace chess.view.board
 * @class Board
 * @augments chess.view.board.GUI
 * @param {Object} config
 * @param {Object} config.paddings - Percentage(of board size) or numeric values, example: { l: '3%', t:'1%', 'b' : '3%', r: '1%' } where
 * l is left, t is top, r is right and b is bottom, default: 3% for all sides. If you have labels, the labels will be resized
 * according to padding.
 * @param {String} pieceLayout name of pieces to use. Default: svg_alpha_bw.  Possible values:
 * svg_alpha_bw, svg_alpha_egg, svg_egg, svg, svg_egg, svg-chess7, svg_chessole, merida, meridapale, traveler, svg_bluegrey, smart,
 * motif, leipzig. The ones with prefix "svg_" uses svg vector graphics which are small in size and without any quality loss. The other
 * layouts are pixel based bitmaps.
 * @param {Number} animationDuration Animation duration in secons, default: 0.35
 *
 */
chess.view.board.Board = new Class({
    Extends: chess.view.board.GUI,
    type: 'chess.view.board.Board',
    pieces: [],
    pieceMap: {},
    instructorMode: false,

    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    /**
     * Duration of piece animations in seconds.
     * @config float animationDuration
     * @default 0.35
     */
    animationDuration: .20,
    /**
     * Layout of pieces, examples: "alphapale", "alpha", "merida", "kingdom"
     * @config string pieceLayout
     * @default alphapale
     */
    pieceLayout: 'svg_bw',
    /**
     * Layout of board. The name correspondes to the suffix of the CSS class
     * dhtml-chess-board-container-wood. (In this example wood). If you want to create your own
     * board layout. You can specify a custom value for boardLayout, create your own graphic and
     * implement your own CSS rules. Take a look at css/board/board.css for more info
     * @config string boardLayout
     * @default wood
     */
    boardLayout: undefined,
    positionParser: undefined,
    currentValidMoves: undefined,
    ddEnabled: false,
    plugins: [],

    currentAnimation: {
        index: 0,
        moves: [],
        duration: .5,
        isBusy: false
    },
    __construct: function (config) {
        this.parent(config);
        this.pieces = [];
        this.__params(config, ['fen', 'pieceLayout', 'animationDuration', 'plugins']);

        if (this.plugins && Browser.ie && Browser.version < 9) {
            for (var i = 0; i < this.plugins.length; i++) {
                if (this.plugins[i].type === 'chess.view.highlight.Arrow') {
                    this.plugins[i].type = 'chess.view.highlight.Square';
                }
            }
        }


        this.positionParser = new chess.parser.FenParser0x88();
    },

    inAltMode: false,
    posOnDown: undefined,

    __rendered: function () {
        this.createPieces();
        this.showFen(this.fen);
        this.parent();


        var el = this.getEl();
        var doc = jQuery(document.documentElement);

        el.on("click", function (evt) {
            var pos = evt.pageX + evt.pageY;
            if (Math.abs(pos - this.posOnDown) <= 2) {
                this.fireDomEvent("clickSquare", evt);
            }
        }.bind(this));

        el.on("mousedown", this.onDown.bind(this));

        doc.on("mouseup", function (evt) {
            if (this.inAltMode) {
                this.fireDomEvent("arrowEnd", evt);
                this.inAltMode = false;
            }
        }.bind(this));

        doc.on("mousemove", function (evt) {
            if (this.inAltMode) {
                this.fireDomEvent("arrowMove", evt);
            }
        }.bind(this));
    },

    onDown: function (evt) {
        this.posOnDown = evt.pageX + evt.pageY;
        if (evt.altKey) {
            this.inAltMode = true;
            this.fireDomEvent("arrowStart", evt);
        }
    },

    fireDomEvent: function (eventeName, evt) {
        var b = this.getBoard();
        var p = b.offset();
        var w = b.width() / 8;
        var x = evt.pageX - p.left;
        var y = evt.pageY - p.top;
        x = Math.floor(x / w);
        y = Math.floor(y / w);

        if (x > 7 || x < 0 || y > 7 || y < 0) return;

        var files = 'abcdefgh';
        var ranks = '87654321';

        if (this.flipped) {
            x = 7 - x;
            y = 7 - y;
        }
        var square = files.charAt(x) + ranks.charAt(y);

        this.fireEvent(eventeName, [square, evt]);
    },


    createPieces: function () {
        var flipped = this.isFlipped();

        for (var i = 0; i < 32; i++) {
            var config = {
                square: 0,
                color: 'white',
                pieceType: 'p',
                pieceLayout: this.pieceLayout,
                squareSize: 30,
                flipped: flipped,
                aniDuration: this.animationDuration,
                board: this
            };
            var piece = new chess.view.board.Piece(config);
            piece.on('animationComplete', this.pieceMoveFinished.bind(this));
            piece.on('move', this.makeMove.bind(this));
            piece.on('initdrag', this.startPieceDrag.bind(this));
            this.pieces.push(piece);
            this.getBoard().append(piece.getEl());
        }
        this.resizePieces();
        this.addPieceDragEvents();
    },

    setPieceLayout: function (layout) {
        jQuery.each(this.pieces, function (i, piece) {
            piece.setPieceLayout(layout);
        });
    },

    addPieceDragEvents: function () {
        this.getEventEl().on(ludo.util.getDragMoveEvent(), this.dragPiece.bind(this));
        this.getEventEl().on(ludo.util.getDragEndEvent(), this.stopDragPiece.bind(this));
    },

    draggedPiece: undefined,
    startPieceDrag: function (piece) {
        this.draggedPiece = piece;
    },

    dragPiece: function (e) {
        if (this.draggedPiece) {
            this.draggedPiece.dragPiece(e);
        }
    },

    stopDragPiece: function (e) {

        if (this.draggedPiece) {
            this.draggedPiece.stopDragPiece(e);
            this.draggedPiece = undefined;
        }
    },

    /**
     * All DHTML Chess 3 views are using the setController method. It is used to
     * control behaviour of the view. So if you want to create your own Chess View component, you
     * should take a look at setController. Example method:<br><br>
     *     setController : function(controller){<br>
     *         this.parent(controller); // always call supperclass
     *         controller.addEvent('newGame', this.doSomethingOnNewGame.bind(this));
     *     }
     * Here, the method doSomethingOnNewGame will be executed every time the controller loads a new game
     * @method setController
     * @param {Object} controller
     */
    setController: function (controller) {
        this.parent(controller);
        controller.on('newGame', this.showStartBoard.bind(this));
        controller.on('newMove', this.clearHighlightedSquares.bind(this));
        controller.on('newMove', this.playChainOfMoves.bind(this));
        controller.on('setPosition', this.showMove.bind(this));
        controller.on('nextmove', this.playChainOfMoves.bind(this));
        controller.on('startOfGame', this.clearHighlightedSquares.bind(this));
        controller.on('newGame', this.clearHighlightedSquares.bind(this));
        controller.on('flip', this.flip.bind(this));
        controller.on('beforeLoad', this.beforeLoad.bind(this));
        controller.on('afterLoad', this.afterLoad.bind(this));
    },


    beforeLoad: function () {
        this.shim().show(chess.__('Loading game'));
    },

    afterLoad: function () {
        this.shim().hide();
    },

    clearHighlightedSquares: function () {
        this.fireEvent('clearHighlight', this);
    },

    enableInstructorMode: function () {
        this.instructorMode = true;
        this.ddEnabled = true;
        this.currentValidMoves = this.positionParser.getFullSquareMap();
        this.pieces.forEach(function (piece) {
            piece.enableDragAndDrop()
        });
    },

    /**
     * Enable drag and drop feature of the board. It expects a game model as first argument.
     * When connected to a controller event, the controller always sends current game model as
     * first argument when it fire events.
     * @method enableDragAndDrop
     * @param model
     * @return void
     */
    enableDragAndDrop: function (model) {
        if (this.currentAnimation.isBusy) {
            this.enableDragAndDrop.delay(200, this, model);
            return;
        }
        this.ddEnabled = true;
        var pos = model.getCurrentPosition();

        this.positionParser.setFen(pos);
        // 6k1/5ppp/8/8/8/8/5PPP/3R2K1 w KQkq - 0 0
        this.currentValidMoves = this.positionParser.getValidMovesAndResult().moves;
        this.resetPieceDragAndDrop();
        for (var square in this.currentValidMoves) {
            if (this.currentValidMoves.hasOwnProperty(square)) {
                this.pieceMap[square].enableDragAndDrop();
            }
        }
    },
    /**
     * Disable drag and drop feature of the board
     * @method disableDragAndDrop
     * @return void
     */
    disableDragAndDrop: function () {
        this.ddEnabled = false;
        this.resetPieceDragAndDrop();
    },
    resetPieceDragAndDrop: function () {
        for (var i = 0; i < this.pieces.length; i++) {
            this.pieces[i].disableDragAndDrop();
        }
    },
    /**
     Animate/Play the "movements" involved in a move, example: O-O involves two moves,
     moving the king and moving the rook. By default, this method will be executed when the
     controller fires newMove or nextmove event.
     @method playChainOfMoves
     @param {game.model.Game} model
     @param {Object} move
     @example
     { m: 'O-O', moves : [{ from: 'e1', to: 'g1' },{ from:'h1', to: 'f1'}] }
     */
    playChainOfMoves: function (model, move) {

        var ca = this.currentAnimation;
        if (this.animationDuration === 0) {
            this.showMove(model, move);
            return;
        }

        if (ca.isBusy) {
            this.playChainOfMoves.delay(200, this, [model, move]);
            return;
        }

        this.fireEvent('animationStart');

        var moves = move.moves;

        ca.duration = this.getDurationPerMovedPiece(move);
        ca.index = 0;
        ca.moves = moves;
        ca.isBusy = true;
        this.animateAMove();
    },

    animateAMove: function () {
        var move = this.currentAnimation.moves[this.currentAnimation.index];

        if (move.capture) {

            var sq = Board0x88Config.mapping[move.capture];
            if (sq !== move.to) {
                this.pieceMap[sq].hide();
                this.pieceMap[sq] = null;
            }
            this.pieceMoveFinished(move);
        }
        else if (move.promoteTo) {
            this.getPieceOnSquare(move.square).promote(move.promoteTo);
            this.currentAnimation.isBusy = false;
            this.fireEvent('animationComplete');
        } else if (move.from) {
            var piece = this.getPieceOnSquare(move.from);
            if (piece) piece.playMove(move.to, this.currentAnimation.duration);
        }
    },

    pieceMoveFinished: function (move) {
        this.currentAnimation.index++;
        var map = this.pieceMap;
        if (map[move.to]) {
            map[move.to].hide();
        }
        map[move.to] = map[move.from];
        map[move.from] = null;

        if (this.currentAnimation.index < this.currentAnimation.moves.length) {
            this.animateAMove();
        } else {
            this.fireEvent('highlight', this.currentAnimation.moves[0]);
            this.fireEvent('animationComplete');

            this.currentAnimation.isBusy = false;
        }
    },

    getDurationPerMovedPiece: function (move) {
        var count = 0;
        for (var i = 0; i < move.moves.length; i++) {
            if (move.moves[i].from) {
                count++;
            }
        }
        return (this.animationDuration / count) * 1000;
    },

    showMove: function (model, move, pos) {
        if (this.currentAnimation.isBusy) {
            pos = model.getCurrentPosition();
            this.showMove.delay(200, this, [model, move, pos]);
            return;
        }
        pos = pos || model.getCurrentPosition();
        this.showFen(pos);

        if (move = model.getCurrentMove()) {
            this.highlightMove(move);
        }
    },
    highlightMove: function (move) {
        if (!move) {
            return;
        }
        if (move.from && move.to) {
            this.fireEvent('highlight', move);
        }
    },
    /**
     * Show start position of game
     * @method showStartBoard
     * @param {game.model.Game} model
     * @return void
     */
    showStartBoard: function (model) {
        this.showFen(model.getCurrentPosition());
    },
    /**
     * Show a specific FEN position on the board
     * @method showFen
     * @param {String} fen
     * @return undefined
     */
    showFen: function (fen) {

        this.positionParser.setFen(fen);
        var pieces = this.positionParser.getPieces();
        this.pieceMap = {};
        for (var i = 0, count = pieces.length; i < count; i++) {
            var color = (pieces[i].t & 0x8) ? 'black' : 'white';
            var type = Board0x88Config.typeMapping[pieces[i].t];

            var p = this.pieces[i];
            p.square = pieces[i].s;
            p.color = color;
            p.pieceType = type;
            p.position();
            p.updateBackgroundImage();
            p.show();

            this.pieceMap[pieces[i].s] = p;
        }

        for (var j = i; j < this.pieces.length; j++) {
            this.pieces[j].hide();
        }

        this.fireEvent("fen", fen);
    },
    /**
     * Return number of visible pieces on the board
     * @method getCountPiecesOnBoard
     * @return int
     */
    getCountPiecesOnBoard: function () {
        var ret = 32;
        for (var i = this.pieces.length - 1; i >= 0; i--) {
            if (!this.pieces[i].isVisible()) {
                ret--;
            }
        }
        return ret;
    },

    hidePiece: function (piece) {
        if (piece) {
            delete this.pieceMap[piece.square];
            piece.hide();
        }
    },

    /**
     * This method resets the board to the standard position at start of games
     * @method resetBoard
     * @return void
     */
    resetBoard: function () {
        this.showFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        /**
         * Event fired when board is reset to standard start position,
         * i.e. fen: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
         * @event resetboard
         * @param Component this
         */
        this.fireEvent('resetboard', this);
    },
    /**
     * Remove all pieces from the board
     * @method clearBoard
     * @return void
     */
    clearBoard: function () {
        for (var i = 0; i < this.pieces.length; i++) {
            this.pieces[i].hide();
            this.pieceMap = {};
        }
        /**
         * Event fired when all pieces are being removed from the board via the clearBoard() method
         * @event clearboard
         * @param Component this
         */
        this.fireEvent('clearboard', this);
    },

    makeMove: function (move, piece) {

        if (move.from === move.to) return;

        if (this.instructorMode) {

            var s = Board0x88Config.mapping[move.to];
            var f = Board0x88Config.mapping[move.from];
            var type = piece.pieceType;

            if (this.pieceMap[s] && this.pieceMap[s].pieceType === "k") {
                piece.position(f);
                return;
            }

            if(type === "p" && /[18]/.test(move.to)){
                piece.promote("q");
            }

            var p = this.getPieceOnSquare(move.to);
            if (p && p !== piece && p.pieceType !== "k") {
                p.hide();
            }

            this.pieceMap[f] = undefined;
            this.pieceMap[s] = piece;
            piece.square = Board0x88Config.mapping[move.to];
        }

        /**
         * Event fired when a piece is moved from one square to another
         * @event move
         * @param Object move, example: { from: "e2", to: "e4" }
         */

        this.fireEvent('move', [move, piece]);
    },

    buildFen: function () {
        var squares = Board0x88Config.fenSquaresNumeric;
        var emptyCounter = 0;
        var ret = "";
        for (var i = 0; i < squares.length; i++) {
            var square = squares[i];
            var p = this.pieceMap[square];

            if (i && i % 8 === 0) {
                if (emptyCounter) ret += emptyCounter;
                ret += "/";
                emptyCounter = 0;
            }

            if (p) {
                var t = p.getTypeCode();
                if (p.color === "white") t = t.toUpperCase();
                if (emptyCounter) ret += emptyCounter;
                ret += t;
                emptyCounter = 0;
            } else {

                emptyCounter++;
            }
        }
        return ret;
    },

    getValidMovesForPiece: function (piece) {
        return this.currentValidMoves[piece.square] || [];
    },

    /**
     Returns JSON object for a piece on a specific square or null if no piece is on the square
     @method getPieceOnSquare
     @param {String} square
     @example
     alert(board.getPieceOnSquare('e4');
     */
    getPieceOnSquare: function (square) {
        return this.pieceMap[Board0x88Config.mapping[square]];
    },

    currentPieceSize: undefined,

    squareSize: undefined,

    resizePieces: function () {
        this.squareSize = this.getSquareSize();
        var ps = this.pieces;
        if (!ps[0].svg) {
            for (var i = 0; i < ps.length; i++) {
                ps[i].resize(this.squareSize)
            }
        }
    },
    /**
     * Flip board
     * @method flip
     * @return void
     */
    flip: function () {
        this.parent();
        for (var i = 0, count = this.pieces.length; i < count; i++) {
            this.pieces[i].flip();
        }
    },

    flipTo: function (color) {
        if (color == 'white') this.flipToWhite(); else this.flipToBlack();
    },
    /**
     * Show whites pieces at the bottom. If white is allready on the bottom, this method will do nothing.
     * @method flipToWhite
     */
    flipToWhite: function () {
        if (this.flipped) {
            this.flip();
        }
    },
    /**
     * Show blacks pieces at the bottom. If black is allready on the bottom, this method will do nothing.
     * @method flipToBlack
     */
    flipToBlack: function () {
        if (!this.flipped) {
            this.flip();
        }
    },

    showSolution: function (move) {
        this.fireEvent('showSolution', move);
    },

    showHint: function (move) {
        this.fireEvent('showHint', move);
    }
});