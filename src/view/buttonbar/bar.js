chess.view.buttonbar.Bar = new Class({

    Extends: ludo.View,
    type: 'chess.view.buttonbar.Bar',
    module: 'chess',
    submodule: 'buttonbar.bar',

    buttons: ['start', 'previous', 'play', 'next', 'end', 'flip'],

    styles: undefined,

    orientation: undefined,

    borderRadius: '8%',
    // Percent spacing of button size
    spacing: 10,

    background: undefined,


    activeButton: undefined,
    buttonDown: undefined,

    disabledButtons: undefined,

    isAtEndOfBranch: false,

    defaultStyles: undefined,

    overlay: undefined,

    anchor: undefined,

    pr: undefined,

    comp: false,

    __construct: function (config) {

        this.pr = String.uniqueID();


        this.parent(config);
        this.anchor = [0.5, 0];
        this.__params(config, ['buttonSize', 'background', 'buttons', 'styles',
            'spacing', 'anchor', 'imageStyles', 'imageStylesDown', 'imageStylesDisabled', 'imageStylesOver', 'borderRadius']);

        this.disabledButtons = [];
        this.defaultStyles = {
            button: {
                'stroke': '#888',
                'fill': '#aeb0b0',
                'stroke-width': 1,
                "fill-opacity": 1
            },
            image: {fill: '#444'},


            buttonOver: {
                'stroke': '#777',
                'fill': '#aeb0b0',
                'stroke-width': 1
            },
            imageOver: {fill: '#222'},

            buttonDown: {
                'stroke': '#555',
                'fill': '#999',
                'stroke-width': 1
            },
            imageDown: {fill: '#222'},


            buttonDisabled: {
                'stroke': '#888',
                'fill': '#aeb0b0',
                'stroke-width': 1
            },
            imageDisabled: {
                fill: '#444',
                'fill-opacity': 0.4,
                'stroke-opacity': 0.2
            },


            buttonPlay: {
                'stroke': '#C8E6C9',
                'fill': '#388E3C',
                'stroke-width': 1
            },
            imagePlay: {fill: '#C8E6C9'},
            imageComp: {fill: '#388E3C'},
            overlay: {
                'fill-opacity': 0,
                'fill': '#000'
            }
        };

        this.styles = this.styles || {};
        var s = this.styles;
        var df = this.defaultStyles;

        s.button = Object.merge(df.button, s.button || {});
        s.buttonOver = Object.merge(df.buttonOver, s.buttonOver || {});
        s.buttonDown = Object.merge(df.buttonDown, s.buttonDown || {});
        s.buttonDisabled = Object.merge(df.buttonDisabled, s.buttonDisabled || {});

        s.buttonPlay = Object.merge(df.buttonPlay, s.buttonPlay || {});
        s.buttonComp = Object.merge(df.button, s.button || {});

        s.image = Object.merge(df.image, s.image || {});
        s.imageOver = Object.merge(df.imageOver, s.imageOver || {});
        s.imageDown = Object.merge(df.imageDown, s.imageDown || {});
        s.imageDisabled = Object.merge(df.imageDisabled, s.imageDisabled || {});
        s.imagePlay = Object.merge(df.imagePlay, s.imagePlay || {});
        s.imageComp = Object.merge(df.imageComp, s.imageComp || {});

        s.overlay = Object.merge(this.defaultStyles.overlay, s.overlay || {});

        jQuery(document.documentElement).on('mouseup', this.onMouseUp.bind(this));
    },

    __rendered: function () {
        this.parent();

        this.$b().css('overflow', 'hidden');
        this.createStylesheets();

        this.$b().on('mousedown', function () {
            return false;
        });

        if (this.background) {
            this.bg = new chess.view.board.Background(
                Object.merge({
                    view: this,
                    square: false
                }, this.background)
            )
        }

        this.els.buttons = {};
        this.els.buttonRects = {};
        this.els.buttonPaths = {};
        this.els.overlays = {};
        this.els.clipRects = {};

        jQuery.each(this.buttons, function (i, btn) {
            if (btn != 'pause') {
                this.createButton(btn);
                if (btn != 'flip' && btn != 'comp') this.disableButton(btn);
            }
        }.bind(this));
    },

    createStylesheets: function () {
        var s = this.svg();
        jQuery.each(this.styles, function (name, styles) {
            s.addStyleSheet(this.pr + 'dc-' + name, styles);
        }.bind(this));
    },

    createButton: function (name) {
        var s = this.svg();

        var cp = s.$('clipPath');
        var cr = s.$('rect');
        cp.append(cr);
        s.appendDef(cp);
        this.els.clipRects[name] = cr;

        var g = s.$('g');
        g.attr('data-name', name);

        g.attr('aria-label', name);
        g.attr('title', name);
        g.css('cursor', 'pointer');
        g.set('x', 0);
        g.set('y', 0);
        s.append(g);
        this.els.buttons[name] = g;
        var rect = s.$('rect');
        rect.addClass(this.pr + 'dc-button');
        this.els.buttonRects[name] = rect;
        g.append(rect);

        var o = s.$('path');
        o.css(this.styles.overlay);
        o.clip(cp);
        this.els.overlays[name] = o;
        g.append(o);

        var p = s.$('path');
        p.set('line-join', 'round');
        p.set('line-cap', 'round');
        p.set('fill-rule', 'even-odd');
        this.els.buttonPaths[name] = p;
        p.addClass(this.pr + 'dc-image');
        g.append(p);

        g.on('mouseenter', this.fn('enterButton', name));
        g.on('mouseleave', this.fn('leaveButton', name));
        g.on('mousedown', this.fn('downButton', name));
        g.on('click', this.fn('clickButton', name));

    },


    fn: function (fnName, btnName) {
        var that = this;
        return function () {
            that[fnName].call(that, btnName);
        }
    },

    enterButton: function (btnName) {
        if (!this.isDisabled(btnName)) {
            this.cssButton(btnName, 'Over');
        }
    },

    leaveButton: function (btnName) {
        if (!this.isDisabled(btnName)) {
            this.cssButton(btnName, '');
        }
    },

    downButton: function (btnName) {
        if (!this.isDisabled(btnName)) {
            this.cssButton(btnName, 'Down');
            this.buttonDown = btnName;
        }
    },

    isDisabled: function (btn) {
        return this.disabledButtons.indexOf(btn) >= 0;
    },

    onMouseUp: function () {
        if (this.buttonDown) {
            var n = this.buttonDown;
            this.els.buttonRects[n].removeClass(this.pr + 'dc-buttonDown');
            this.els.buttonPaths[n].removeClass(this.pr + 'dc-imageDown');
            this.buttonDown = undefined;
        }
    },


    clickButton: function (btnName) {
        if (!this.isDisabled(btnName)) {
            this.cssButton(btnName, '');
            if (btnName === 'play' && this.autoPlayMode) btnName = 'pause';
            this.fireEvent(btnName);
            if (btnName === 'comp') {
                this.comp = !this.comp;
                this.cssButton('comp', 'Comp');
            }
            return false;
        }
        return false;
    },

    toggleButtonVisibility:function(){
        var o = this.controller.compMode ? 0 : 1;

        jQuery.each(this.buttons, function(i, name){
            if(name !== 'comp' && name !== 'flip')this.els.buttons[name].css({
                opacity : o

            });

        }.bind(this));
    },

    cssButton: function (name, className) {

        if (this.buttons.indexOf(name) === -1)return;

        if (name === 'play' && this.autoPlayMode) className = 'Play';
        if (name === 'comp' && this.controller.compMode) className = 'Comp';

        if (this.isDisabled(name)) {
            className = 'Disabled';
        }

        var r = this.els.buttonRects[name];
        var p = this.els.buttonPaths[name];

        r.removeAllClasses();
        p.removeAllClasses();

        r.addClass(this.pr + 'dc-button' + className);
        p.addClass(this.pr + 'dc-image' + className);
    },

    resize: function (size) {
        this.parent(size);
        this.resizeBar();

        this.fireEvent('boardResized', {
            left: 0, top: 0, width: this.svg().width, height: this.svg().height
        });

    },

    btnSize: undefined,

    resizeBar: function () {
        var s = this.svg();
        this.orientation = s.width > s.height ? 'horizontal' : 'vertical';
        this.size = Math.min(s.width, s.height);

        if (this.orientation === 'horizontal') {
            this.resizeHorizontal();
        } else {
            this.resizeVertical();
        }

        var r = this.getButtonRadius();

        jQuery.each(this.els.buttonRects, function (name, rect) {
            rect.css({
                rx: r, ry: r
            });
        });
    },

    overlayPath: function (c) {
        var cy = c.y + (c.height * 0.55);
        var b = c.y + c.height;
        var r = c.x + c.width;
        var ry = c.height * 0.05;
        return ['M',
            c.x, cy,
            'a', c.width, c.height, 90, 0, 1, c.width / 2, -ry,
            'a', c.width, c.height, 90, 0, 1, c.width / 2, ry,
            'L', r, b, c.x, b,
            'Z'
        ].join(' ');
    },

    getButtonRadius: function () {
        var r = this.borderRadius;
        if (isNaN(r)) {
            var r = parseFloat(r);
            r = Math.min(50, r);
            return this.btnSize * r / 100;
        }
        return Math.min(this.btnSize / 2, r);

    },

    resizeHorizontal: function () {
        var s = this.svg();
        this.btnSize = this.buttonSize(s.height);
        var width = this.totalSize();
        var left = (s.width - width) * this.anchor[0];
        var top = (s.height - this.btnSize) * this.anchor[1];
        var change = this.btnSize + this.getSpacing();
        var props = {
            x: 0, y: 0, width: this.btnSize, height: this.btnSize

        };

        var overlayPath = this.overlayPath(props);
        jQuery.each(this.els.buttons, function (name, g) {
            g.setTranslate(left, top);
            this.els.buttonRects[name].setAttributes(props);
            this.els.clipRects[name].setAttributes(props);
            this.els.overlays[name].set('d', overlayPath);
            this.els.buttonPaths[name].set('d', this.getPath(name).join(' '));
            this.els.buttonRects[name].set('title', 'Testing');
            left += change;

        }.bind(this));
    },

    toPath: function (points) {
        var s = this.btnSize;
        var innerWidth = s * 0.65;
        var innerHeight = s * 0.55;
        var innerX = (s - innerWidth) / 2;
        var innerY = (s - innerHeight) / 2;

        var x = function (x) {
            return innerX + (innerWidth * x / 10)
        };
        var y = function (y) {
            return innerY + (innerHeight * y / 10);
        };
        var ind = 0;
        jQuery.each(points, function (i, p) {
            if (!isNaN(p)) {
                points[i] = ind % 2 == 0 ? x(p) : y(p);
                ind++;
            } else {
                ind = 0;
            }
        });

        return points;
    },


    getPath: function (btnName) {


        switch (btnName) {
            case 'start':
                return this.toPath(['M',
                    0, 0,
                    'L', 0, 10,
                    2, 10,
                    2, 0, 'Z',
                    'M', 2.5, 5,
                    'L', 6, 1.5,
                    6, 3.5,
                    10, 3.5,
                    10, 6.5,
                    6, 6.5,
                    6, 8.5,
                    2.5, 5,
                    'Z'
                ]);

            case 'pause':
                return this.toPath([
                    'M', 2, 1,
                    'L', 2, 9,
                    4, 9,
                    4, 1, 'Z',
                    'M', 6, 1,
                    'L', 6, 9,
                    8, 9,
                    8, 1, 'Z'
                ]);

            case 'previous':
                return this.toPath(['M', 0, 5,
                    'L', 4, 1,
                    4, 3,
                    9, 3,
                    9, 7,
                    4, 7,
                    4, 9,
                    'Z'
                ]);
            case 'play':
                return this.toPath(['M',
                    3, 1, 'L', 8, 5, 3, 9, 'Z'
                ]);
            case 'next':
                return this.toPath(['M', 1, 3, 'L', 5, 3, 5, 1, 9, 5, 5, 9, 5, 7, 1, 7, 'Z']);

            case 'end':
                return this.toPath(['M', 0, 3.5,
                    'L', 4, 3.5, 4, 1.5,
                    7, 5,
                    4, 8.5,
                    4, 6.5, 0, 6.5, 'Z',

                    'M', 7.8, 0.5, 'L',
                    9.8, 0.5,
                    9.9, 9.5,
                    7.9, 9.5]);

            case 'flip':
                return this.toPath([
                    'M', 2.75, 0,
                    'L',
                    0.5, 3.5, 2, 3.5,
                    2, 9.5,
                    3.5, 9.5,
                    3.5, 3.5,
                    5, 3.5, 'Z',
                    'M',
                    6, 0, 'L',
                    6, 6,
                    4.5, 6,
                    6.75, 9.5,
                    9, 6,
                    7.5, 6,
                    7.5, 0, 'Z'

                ]);

            case 'comp':
                return this.toPath([
                    'M', 1, 1, 'L',
                    9, 1,
                    9, 7,
                    1, 7,
                    'M', 4, 7,
                    'L', 6, 7, 6, 8, 4, 8, 4, 7,
                    'M', 1, 8,
                    'L', 9, 8, 9, 9, 1, 9, 1, 8
                ]);

            default:
                return this.toPath(['M', 0, 0, 'L', 10, 0, 10, 10, 0, 10, 'Z'])

        }
    },

    resizeVertical: function () {

    },

    totalSize: function () {
        return (this.btnSize * this.buttons.length) + (this.getSpacing() * (this.buttons.length - 1));
    },

    getSpacing: function () {
        return this.btnSize * this.spacing / 100;
    },


    setController: function (controller) {
        this.parent(controller);

        this.controller.addEvents({
            startOfGame: this.startOfGame.bind(this),
            notStartOfGame: this.notStartOfBranch.bind(this),
            endOfBranch: this.endOfBranch.bind(this),
            notEndOfBranch: this.notEndOfBranch.bind(this),
            startAutoplay: this.startAutoPlay.bind(this),
            stopAutoplay: this.stopAutoPlay.bind(this),
            newGame: this.newGame.bind(this),
            comp : this.toggleButtonVisibility.bind(this)
        });
    },


    startOfGame: function () {
        if(this.controller.compMode)return;
        this.disButtons(['start', 'previous']);

    },

    notStartOfBranch: function () {
        if(this.controller.compMode)return;
        this.enButtons(['start', 'previous', 'play']);
    },
    endOfBranch: function () {
        if(this.controller.compMode)return;
        this.disButtons(['end', 'next', 'play'])
        this.isAtEndOfBranch = true;
        this.autoPlayMode = false;
    },

    disButtons: function (buttons) {
        jQuery.each(buttons, function (i, btn) {
            this.disableButton(btn);
        }.bind(this))
    },
    enButtons: function (buttons) {
        jQuery.each(buttons, function (i, btn) {
            this.enableButton(btn);
        }.bind(this))
    },

    notEndOfBranch: function (model) {
        this.isAtEndOfBranch = false;
        this.enButtons(['end', 'next']);
        if (model && !model.isInAutoPlayMode()) {
            this.stopAutoPlay();
            this.enableButton('play');
        }

    },

    autoPlayMode: false,
    startAutoPlay: function () {
        if (this.els.buttonPaths['play']) this.els.buttonPaths['play'].set('d', this.getPath('pause').join(' '));

        this.enableButton('play');
        this.cssButton('play', 'Play');
        this.autoPlayMode = true;

    },

    stopAutoPlay: function () {
        if (!this.hasButton('play'))return;
        this.els.buttonPaths['play'].set('d', this.getPath('play').join(' '));
        if (!this.autoPlayMode)return;
        this.autoPlayMode = false;
        this.cssButton('play', '');

        if (this.isAtEndOfBranch) {
            this.disableButton('play');
        }

    },

    hasButton: function (name) {
        return this.buttons.indexOf(name) != -1;
    },

    newGame: function () {

    },

    disableButton: function (name) {
        if (!this.hasButton(name))return;
        if (!this.isDisabled(name)) {
            this.disabledButtons.push(name);
            this.cssButton(name, 'Disabled');
            this.els.overlays[name].hide();
        }
    },

    enableButton: function (name) {
        if (!this.hasButton(name))return;
        if (this.isDisabled(name)) {
            var ind = this.disabledButtons.indexOf(name);
            this.disabledButtons.splice(ind, 1);
            this.cssButton(name, '');
            this.els.overlays[name].show();
        }
    },

    buttonSize: function (availSize) {
        return availSize * 0.9;
    }
});