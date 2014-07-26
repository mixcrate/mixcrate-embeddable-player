(function() {
    function PlayerFrame(options) {
        this.init(options);
    }

    PlayerFrame.prototype = {
        constructor: PlayerFrame,

        src: 'mc.js',

        defaultSkin: 'css/mcplayer.css',
        
        cacheBust: Math.round(1 + ((999999999999 - 1) * Math.random())),

        html: '<iframe width="100%" height="350" class="mc-player" marginheight="0"' +
                'marginwidth="0" frameborder="no" scrolling="no" ALLOWTRANSPARENCY="true">' + 
              '</iframe>',

        init: function(options) {
            this._scriptNode = this.findScriptBySrc(this.src);
            this.render();
        },

        findScriptBySrc: function() {
            var scripts = document.getElementsByTagName('script'),
                i = 0,
                script = scripts[i];

            do {
                // Testing for starts with or preceded by slash to support
                // relative and absolute paths.
                if (!script._done &&
                     new RegExp('(?:^|\\/)' + this.src).test(script.src)) {
                    script._done = true;
                    return script;
                }
            } while (script = scripts[++i]);
        },

        syncHeight: function() {
            var doc = this.getWindow().document;

            // If zero default to height attribute.
            this._frame.height = doc.documentElement.offsetHeight || this._frame.height;
        },

        getWindow: function() {
            var frame = this._frame;
            return frame.contentWindow || frame.parentWindow;// || window;
        },

        getMixId: function() {
            return this._scriptNode.id.substring(3);
        },

        getSkinUrl: function() {
            return this._scriptNode.getAttribute('data-mc-skin') || this.defaultSkin;
        },

        render: function() {
            var container = document.createElement('div'),
                iframe, win, body;

            container.innerHTML = this.html;

            this._frame = container.getElementsByTagName('iframe')[0];

            if (this._scriptNode) {
                this._scriptNode.parentNode.insertBefore(this._frame, this._scriptNode);
            } else {
                console.log('mixcrate: unable to render iframe, script node not found');
            }

            win = this.getWindow();
            win.document.open('text/html', 'replace');
            win.document.write('<!doctype html><html xmlns:fb="http://www.facebook.com/2008/fbml"><head></head><body></body></html>');
            win.document.close();

            this.initResize();
        },

        initResize: function() {
            var win = this.getWindow(),
                frame = this;

            // Async for IE.
            setTimeout(function() {
                win.onresize = function(e) {
                    frame.syncHeight();
                };
            }, 1);
        },

        loadAsset: function(src, callback) {
            var frame = this,
                win = frame.getWindow(),
                type = (/\.css/.test(src)) ? 'link' : 'script',
                el = win.document.createElement(type),
                baseURI = '';

            // TODO: Use "&" if querystring already exists.
            src = src + '?cacheBust=' + frame.cacheBust;

            if (callback) {
                el.onload = function() {
                    callback.call(frame);
                };
            }

            if (type === 'link') {
                el.rel = 'stylesheet';
                el.href = baseURI + src;
            } else {
                el.src = baseURI + src;
            }

            setTimeout(function() {
                var dE = win.document.documentElement,
                    head = win.document.getElementsByTagName('head')[0];

                if (head) {
                    head.appendChild(el);
                } else { // Prevent operation aborted in IE 6 & 7. Do we really care?
                    dE.insertBefore(el, dE.firstChild);
                }

            }, 1);
        }
    };

    var frame = new PlayerFrame(),
        mixId = frame.getMixId(),
        apiUrl = 'http://query.yahooapis.com/v1/public/yql?q=use%20%22' +
                 'https%3A%2F%2Fs3-us-west-1.amazonaws.com%2Fmc-api%2' +
                 'Fmc-table.xml%22%20as%20api%3B%0Aselect%20*%20from%20api%20' +
                 'where%20id%3D%22' + mixId + '%22&format=json' +
                 '&callback=onYQL&';

        win = frame.getWindow();

    win.onYQL = function(data) {
        data = data.query;

        if (!data.results || data.results.json.mp3_url === 'null') {
            console.log('mixcrate: no mix found for mixId ' + mixId);
            return;
        }

        data = data.results.json;

        // TODO: Build JS assets into a single file.
        frame.loadAsset('js/mcplayer.js', function() {
            var win = this.getWindow();
            win.MCPlayer._frame = frame;
            win.MCPlayer._data = data;
            frame.loadAsset('js/soundmanager2-nodebug-jsmin.js', function() {
                win.MCPlayer.init();
                frame.loadAsset('http://platform.twitter.com/widgets.js');
                frame.loadAsset('https://apis.google.com/js/plusone.js');
            });

        }); 
        frame.loadAsset(frame.getSkinUrl());
    };

    frame.loadAsset(apiUrl);

}());
