(function() {

    // Update to full mixcrate.com path when pushed.
    var EMBED_URL = 'http://embed.mixcrate.com/js/mc.js';

    function MCPlayer() {
        this.init.apply(this, arguments);
    };

    MCPlayer.init = function() {
        var win = window,
            frame = win.MCPlayer._frame,
            data = win.MCPlayer._data;

        win.soundManager.setup({
            url: 'swf',
            flashVersion: 8,
            preferFlash: false,
            useHTML5Audio: true,

            onready: function() {
                var player = new win.MCPlayer({
                    title: data.title,
                    mixId: frame.getMixId(),
                    trackUrl: data.mp3_url,
                    artist: data.artist,
                    duration: data.duration.in_seconds,
                    infoUrl: data.info_url,
                    readableDuration: data.duration.in_readable//,
                    //skinUrl: skinUrl
                });

                player._soundBridge = win.soundManager.createSound({
                    id: player.options.id,
                    url: player.options.trackUrl,

                    onfinish: function() {
                        player.stop();
                    },

                    whileloading: function() {
                        player._whileLoading();
                    },

                    whileplaying: function() {
                        player._syncCurrent();
                    },

                    onload: function() {
                        player._onload();
                    },
                    // TODO: Flash autoLoad triggers autoPlay from remote source in Chrome.
                    //       Not preferring Flash works around.
                    autoLoad: true
                });

                player._ready();
                frame.syncHeight();
            }
        });
    };

    MCPlayer.prototype = {
        constructor: MCPlayer,

        _domIds: [
            'player',
            'artist',
            'panel',
            'title',
            'current',
            'duration',
            'total',
            'toggle',
            'progress',
            'seek',
            'buy',
            'share',
            'favorite',
            'shareClose'
        ],

        defaults: {
            artist: 'Unknown',
            mixId: null,
            title: 'Unknown',

            duration: 0,
            readableDuration: '0:00',

            id: function() {
                return 'mcsm' + parseInt(Math.random() * 1000000, 10);
            },

            container: function() {
                return document.getElementById(this.options.id) || document.body;
            },

            classPrefix: 'mc-',

            trackUrl: '',
            infoUrl: '',
            skinUrl: ''
        },

        _renderTemplate: function(template, data) {
            var regex = /\{\s*([^|}]+?)\s*(?:\|([^}]*))?\s*\}/g;
            return template.replace(regex, function (match, key) {
                return (typeof data[key] === 'undefined') ? match : data[key];
            });
        },

        _playing: false,

        _playerHTML: '<div class="{classPrefix}player {classPrefix}pause" id="{playerId}">' +
                        '<div class="{classPrefix}toggle" title="Play">' +
                            '<div class="{classPrefix}toggle-button" id="{toggleId}">' +
                                '<div class="{classPrefix}icon-play">&#xf04c;</div>' +
                                '<div class="{classPrefix}icon-pause">&#xf0da;</div>' +
                                '<div class="{classPrefix}play-marker"></div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="{classPrefix}panel" id="{panelId}">' +
                            '<div class="{classPrefix}panel-bg"></div>' +
                            '<div class="{classPrefix}heading">' +
                                '<h1 class="{classPrefix}title" id="{titleId}">{title}</h1>' +
                                '<cite class="{classPrefix}artist" id="{artistId}">{artist}</cite>' +
                            '</div>' +
                            '<div class="{classPrefix}panel-footer">' +
                                '<span class="{classPrefix}current" id="{currentId}">00:00</span>' +
                                '<div class="{classPrefix}scrubber">' +
                                    '<span class="{classPrefix}seek" id="{seekId}"></span>' +
                                    '<span class="{classPrefix}progress" id="{progressId}"></span>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="{classPrefix}footer">' +
                            '<div class="{classPrefix}duration" id="{durationId}"></div>' +
                            '<div class="{classPrefix}buttons">' +
                                '<a class="{classPrefix}share {classPrefix}button" id="{shareId}" title="Share"><span>&#xf045;</span></a>' +
                                '<a href="{infoUrl}" onclick="window.parent.location.href=this.href" class="{classPrefix}logo {classPrefix}button" id="{logoId}" title="mixcrate.com"><span></span></a>' +
                            '</div>' +
                        '</div>' +
                        '<div class="{classPrefix}share-panel">' +
                            '<h1>Share</h1>' +
                            '<em id="{shareCloseId}" class="{classPrefix}share-close" title="Close share panel">CLOSE <span class="{classPrefix}icon-close">&#xf00d;</span></em>' +
                            '<h2>EMBED CODE</h2>' +
                            '<textarea cols="30" rows="3"><script src="' + EMBED_URL +
                                '" id="mc-{mixId}"></script></textarea>' +
                            '<h2>SHARE LINKS</h2>' +
                            '<div class="{classPrefix}share-link"><iframe src="https://www.facebook.com/plugins/like.php?href={infoUrl}&amp;width=120&amp;layout=button_count&amp;action=like&amp;show_faces=false&amp;share=true&amp;height=21" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:120px; height:21px;" allowTransparency="true"></iframe></div>' +
                            '<div class="{classPrefix}share-link"><a href="https://twitter.com/share" class="twitter-share-button" data-text="I\'m listening to {title} by {artist} on Mixcrate" data-url="{infoUrl}" data-via="mixcrate" data-lang="en">Tweet</a></div>' +
                            '<div class="{classPrefix}share-link"><g:plusone size="medium"></g:plusone></div>' +
                        '</div>' +
                    '</div>',

        init: function(options) {
            this.initOptions(options);
            this._initDOMOptions();
        },

        initOptions: function(options) {
            var defaults = this.defaults,
                fixHours = false, // TODO: Fix mixcrate API to always return seconds.
                val;

            this.options = {};

            for (var option in defaults) {
                this.options[option] = (typeof options[option] !== 'undefined')
                                        ? options[option]
                                        : (typeof defaults[option] === 'function')
                                            ? defaults[option].call(this)
                                            : defaults[option];
            }

            fixHours = this.options.readableDuration.match(/:+/g);

            if ( fixHours && fixHours.length > 1) {
                this.options.duration = this.options.duration * 60;
            }
        },

        _initDOMOptions: function() {
            var ids = this._domIds;

            for (i = 0; i < ids.length; i++) {
                this.options[ids[i] + 'Id'] = ids[i] + '-' + this.options.id;
            }
        },

        _onSeek: function(e) {
            e = e || window.event;
            var position = (e.layerX - e.currentTarget.offsetLeft) /
                    this._player.offsetWidth * this.options.duration * 1000;

            this.seekTo(position);
            this._syncCurrent();
        },

        _onShare: function() {
            this.addClass(this._player, this.options.classPrefix + 'sharing');
        },

        _onShareClose: function() {
            this.removeClass(this._player, this.options.classPrefix + 'sharing');
        },

        initEvents: function() {
            var player = this;

            player._toggle.onclick = player._toggle.ontouchstart = function(e) {
                player.toggle();
                return false;
            };

            player._seek.ontouchstart = player._progress.ontouchstart =
                    player._seek.onclick = player._progress.onclick = function(e) {
                player._onSeek(e);
            };

            player._share.onclick = function(e) {
                player._onShare(e);
            };

            player._shareClose.onclick = function(e) {
                player._onShareClose(e);
            };
        },

        seekTo: function(time) {
            this._soundBridge.setPosition(parseInt(time));
        },

        isPlaying: function() {
            return this._playing;
        },

        _play: function() {
            this._soundBridge.play();
        },

        _pause: function() {
            this._soundBridge.pause();
        },

        _stop: function() {
            this._soundBridge.stop();
        },

        addClass: function(node, className) {
            if (!this.hasClass(node, className)) { // skip if already present
                node.className = [node.className, className].join(' ');
            }
        },

        hasClass: function(node, className) {
            var re =new RegExp('(?:^|\\s+)' + className + '(?:\\s+|$)');
            return re.test(node.className);
        },

        removeClass: function(node, className) {
            if (className && this.hasClass(node, className)) {
                node.className = node.className.replace(new RegExp('(?:^|\\s+)' +
                                className + '(?:\\s+|$)'), ' ');

                if (this.hasClass(node, className)) {
                    this.removeClass(node, className);
                }
            }
        },

        play: function() {
            var node = this._player;
            this.addClass(node, this.options.classPrefix + 'play');
            this.removeClass(node, this.options.classPrefix + 'pause');
            //node.classList.add(this.options.classPrefix + 'play');
            //node.classList.remove(this.options.classPrefix + 'pause');
            node.title = 'Pause';
            this._playing = true;
            this._play();
        },

        pause: function() {
            var node = this._player;
            this.addClass(node, this.options.classPrefix + 'pause');
            this.removeClass(node, this.options.classPrefix + 'play');
            //node.classList.add(this.options.classPrefix + 'pause');
            //node.classList.remove(this.options.classPrefix + 'play');
            node.title = 'Play';
            this._playing = false;
            this._pause();
        },

        stop: function() {
            this.pause();
            this._stop();
            this.seekTo(0);
            this._syncCurrent();
        },

        toggle: function() {
            if (this.isPlaying()) {
                this.pause();
            } else {
                this.play();
            }
        },

        setBgImg: function() {
            var mixId = this.options.mixId,
                url = 'url(http://www.mixcrate.com/img/ugc/covers/' +
                    mixId.charAt(0) + '/' + mixId.charAt(1) + '/' +
                    mixId + '_l.jpg)';
            this._player.style.backgroundImage = url;
        },

        render: function() {
            var node = document.createElement('div');
            this.options.container.innerHTML = this._renderTemplate(this._playerHTML, this.options);
            this._initDOMNodes();
            this.setBgImg();
            this.initEvents();
        },

        _initDOMNodes: function() {
            var ids = this._domIds;

            for (i = 0; i < ids.length; i++) {
                this['_' + ids[i]] = document.getElementById(this.options[ids[i] + 'Id']);
            }
        },

        _syncCurrent: function() {
            var sound = this._soundBridge,
                width = sound.position / (this.options.duration * 10);

            this._seek.style.width =  width + '%';
            this._current.innerHTML = this._formatTime(sound.position, true);
        },

        _onload: function() {
            var sound = this._soundBridge;
            //this._total.innerHTML = this._formatTime(sound.duration);
        },

        _whileLoading: function() {
            var sound = this._soundBridge,
                width = sound.bytesLoaded / sound.bytesTotal * 100;

            this._progress.style.width =  width + '%';
            this._duration.innerHTML = this.options.readableDuration;
        },

        _ready: function() {
            this.render();
            this._soundBridge.load();
        },

        _formatTime: function(time, padMin) {
            if (!time) {
                return '00:00';
            }

            var date = new Date(time),

                // Coerce numbers to strings to concat rather than add.
                s = '' + date.getSeconds(),
                m = '' + date.getMinutes() + ':',

                // Second colon is needed only when time > 1 hour.
                h = (time > 3600000) ? '' + parseInt(time / 3600000) + ':' : '';

            // Pad with leading zeros if needed.
            if (s.length < 2) {
                s= '0' + s;
            }

            // Pad minutes if needed.  Checking length < 3 because
            // it includes a colon at this point.
            if (padMin && m.length < 3) {
                m= '0' + m;
            }

            return h + m + s;
        }
    };

    window.MCPlayer = MCPlayer;
}());
