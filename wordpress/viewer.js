/**
 * Usage:
 *
 * new chess.FileTactics({
            renderTo:'chessContainer',
            pgn:'sample'
    })
 *
 * where "chessContainer" is id of an html element and "sample" is the name
 * of a pgn file inside the pgn folder(sample.pgn)
 * @type {Class}
 */

window.chess.isWordPress = true;

chess.WPViewer = new Class({
    Extends: Events,

    renderTo: undefined,
    pgn: undefined,

    controller: undefined,

    showLabels: undefined,

    module: undefined,

    boardSize: undefined,

    initialize: function (config) {

        console.log(config);

        this.renderTo = config.renderTo;
        var r = jQuery(this.renderTo);
        var w = r.width();
        r.css('height', Math.round(w + 480));
        this.boardSize = w - 150;

        this.pgn = config.pgn;
        this.board = config.board || {};
        this.arrow = config.arrow || {};
        this.arrowSolution = config.arrowSolution || {};
        this.hint = config.hint || {};

        if (config.docRoot) {
            ludo.config.setDocumentRoot(config.docRoot);
        }

        this.module = String.uniqueID();

        this.showLabels = !ludo.isMobile;
        if (this.renderTo.substr && this.renderTo.substr(0, 1) != "#")this.renderTo = "#" + this.renderTo;
        jQuery(document).ready(this.render.bind(this));
    },

    render: function () {

        new chess.view.Chess({
            renderTo: jQuery(this.renderTo),
            layout: {
                type: 'fill',
                height: 'matchParent',
                width: 'matchParent'
            },
            children: [
                {
                    layout: {
                        type: 'linear', orientation: 'vertical'
                    },
                    
                    children: [
                        {
                            layout:{
                                height:35,
                                width:this.boardSize
                            },
                            module: this.module,
                            type: 'chess.view.metadata.Game',
                            tpl: '{white} - {black}',
                            cls: 'metadata',
                            css: {
                                'text-align': 'center',
                                'overflow-y': 'auto',
                                'font-size': '1.2em',
                                'font-weight': 'bold'
                            }
                        },

                        {
                            layout: {
                                type: 'linear', orientation: 'horizontal',
                                height: this.boardSize
                            },

                            children: [
                                Object.merge({
                                    boardLayout: undefined,
                                    id: 'tactics_board',
                                    type: 'chess.view.board.Board',
                                    module: this.module,
                                    overflow: 'hidden',
                                    pieceLayout: 'svg3',
                                    boardCss: {
                                        border: 0
                                    },
                                    labels: !ludo.isMobile, // show labels for ranks, A-H, 1-8
                                    labelPos: 'outside', // show labels inside board, default is 'outside'
                                    layout: {
                                        weight: 1,
                                        height: 'wrap'
                                    },
                                    plugins: [
                                        Object.merge({
                                            type: 'chess.view.highlight.Arrow'
                                        }, this.arrow)
                                    ]
                                }, this.board),
                                {
                                    id: this.module + '-panel',
                                    name: "notation-panel",
                                    type: 'chess.view.notation.Table',
                                    layout: {
                                        width: 150
                                    },
                                    elCss:{
                                        'margin-left' : '2px'
                                    },
                                    module: this.module
                                }
                            ]
                        },
                        {
                            type: 'chess.view.buttonbar.Bar',
                            layout: {
                                height: 40,
                                width:this.boardSize
                            },
                            module: this.module
                        },
                        {

                            name: "tablayout",
                            layout: {
                                height: 300,
                                type: 'tabs',
                                tabs: 'top'
                            },
                            elCss: {
                                border: '1px solid ' + chess.THEME.borderColor
                            },
                            children: [
                                {
                                    title: this.pgn.name,
                                    module: this.module,
                                    layout: {
                                        weight: 1
                                    },
                                    type: 'chess.WPGameGrid',
                                    css: {
                                        'overflow-y': 'auto'
                                    },
                                    cols: ['white', 'black', 'result'],
                                    dataSource: {
                                        id: 'gameList',
                                        "type": 'chess.wordpress.GameList',
                                        module: this.module,
                                        autoload: true,
                                        postData: {
                                            pgn: this.pgn.id
                                        },
                                        "listeners": {
                                            "select": function () {
                                                ludo.$(this.module + '-panel').show();
                                            }.bind(this),
                                            "load": function (data) {
                                                if (data.length) {
                                                    ludo.get('gameList').selectRecord(data[0]);
                                                }
                                            }
                                        },
                                        shim: {
                                            txt: ''
                                        }
                                    }
                                }

                            ]

                        }

                    ]
                }
            ]
        });

        this.controller = new chess.controller.Controller({
            applyTo: [this.module],
            pgn: this.pgn.id,
            listeners: {}
        });
    }
});