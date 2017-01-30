chess.wordpress.PgnListView = new Class({
    Extends: ludo.ListView,
    swipable:true,
    submodule: 'wordpress.pgnlistview',

    emptyText:chess.getPhrase('No Databases found'),

    itemRenderer: function (record) {
        return '<div>'
            + '<div style="clear:both"><strong>' + record.pgn_name + ' (ID: ' + record.id + ')</strong></div>'
            + '<div style="text-align:left;font-size:0.8em;width:50%;">Updated: ' + record.updated + '</div>'
            + '<div style="text-align:right;font-size:0.8em;width:50%">Games: ' + record.count + '</div>'
            + '</div>';

    },

    /** Function returning back side when swiping to the left */
    backSideLeft:function(record){
        return '<div style="position:absolute;top:50%;margin-top:-10px;left:10px">' + chess.getPhrase('Archive Database') + '</div>';
    },

    /** Function returning UNDO html after swipe. If not set, the swipe event will be triggered immediately */
    backSideUndo:function(record){
        return '<div style="position:absolute;top:50%;margin-top:-10px;left:10px">'+ chess.getPhrase('Undo') + '</div>';
    },

    __construct: function (config) {
        this.dataSource = {
            type: 'chess.wordpress.PgnList',
            listeners: {
                'select': this.selectPgn.bind(this)
            }
        };
        this.parent(config);
        this.on('swipe', function(record){
            jQuery.ajax({
                url: ludo.config.getUrl(),
                method: 'post',
                dataType: 'json',
                cache: false,
                data:{
                    action:'archive_pgn',
                    pgn:record.id
                },
                complete:function(response, success){
                    if(success){
                        var json = response.responseJSON;
                        if(json.success){
                            this.getDataSource().remove(record);
                            this.controller.sendMessage(chess.getPhrase('PGN archived'));
                        }else{
                            this.controller.sendError('Unable to Archive: ' + json.response);
                            this.undoSwipe(record);
                        }
                    }else{
                        this.controller.sendError(response.responseText);
                        this.undoSwipe(record);
                    }
                }.bind(this)
            });

        }.bind(this));


    },

    setController: function (controller) {
        this.parent(controller);
        controller.on('publish', function () {
            this.getDataSource().load();
        }.bind(this));
        controller.on('new_pgn', function () {
            this.getDataSource().load();
        }.bind(this));
    },

    selectPgn: function (pgn) {
        this.fireEvent('selectpgn', pgn);
    }
});