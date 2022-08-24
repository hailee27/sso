"use strict";

var CryptoService;

(function (CryptoService) {
    var CryptoJS;
    var isLoaded = false;
    (function (CryptoJS) {
        var _a, _b;
        const searchParam = ((_b = (_a = document.currentScript) === null || _a === void 0 ? void 0 : _a.getAttribute('src')) === null || _b === void 0 ? void 0 : _b.split('?')[1]) || '';
        CryptoJS.ready = import('./CryptoService.module.js?' + searchParam).then(m => {
            Object.assign(CryptoJS, m.CryptoJS);
            console.log('CryptoService loaded');
            isLoaded = true;
            CryptoService.jwt.Init();
        });
    })(CryptoJS || (CryptoJS = {}));

    CryptoService.Sleep = function (delay) {
        var start = new Date().getTime();
        while (new Date().getTime() < start + delay);
    };

    CryptoService.Init = function () { console.log('CryptoService Init'); };
    CryptoService.MD5 = function (input) {
        if (!isLoaded) return input;
        return CryptoJS.MD5(input).toString(CryptoJS.enc.Hex);
    };
   
    CryptoService.Base64 = {
        urlEscape: function (str) {
            return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        },

        urlUnescape: function (str) {
            str += new Array(5 - str.length % 4).join('=');
            return str.replace(/\-/g, '+').replace(/_/g, '/');
        },

        urlDecode: function (str) {
            return this.Decode(this.urlUnescape(str));
        },

        urlEncode: function (str) {
            return this.urlEscape(this.Encode(str));
        },
        Decode: function (str) {
            return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(str));
        },

        Encode: function (str) {
            return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(str));
        }
    };

    CryptoService.jwt = {
        algorithmMap: {
           
        },
        Init: function () {
            this.algorithmMap = {
                HS256: CryptoJS.algo.SHA256,
                HS384: CryptoJS.algo.SHA384,
                HS512: CryptoJS.algo.SHA512
            };
        },
        sign: function (input, key, method) {
            var base64str = CryptoJS.algo.HMAC.create(method, key).update(input).finalize().toString(CryptoJS.enc.Base64);
            return CryptoService.Base64.urlEscape(base64str);
        },
        Encode: function (payload, key, algorithm) {
            // Check key
            if (!key) {
                throw new Error('Require key');
            }

            // Check algorithm, default is HS256
            if (!algorithm) {
                algorithm = 'HS256';
            }

            var signingMethod = this.algorithmMap[algorithm];

            // header, typ is fixed value.
            var header = { typ: 'JWT', alg: algorithm };
            // create segments, all segments should be base64 string
            var segments = [];
            segments.push(CryptoService.Base64.urlEncode(JSON.stringify(header)));
            segments.push(CryptoService.Base64.urlEncode(JSON.stringify(payload)));
            segments.push(this.sign(segments.join('.'), key, signingMethod));

            return segments.join('.');
        },
        Decode: function (token, key, noVerify, algorithm) {
            // check token
            if (!token) {
                throw new Error('No token supplied');
            }
            // check segments
            var segments = token.split('.');
            if (segments.length !== 3) {
                throw new Error('Not enough or too many segments');
            }

            // All segment should be base64
            var headerSeg = segments[0];
            var payloadSeg = segments[1];
            var signatureSeg = segments[2];

            // base64 decode and parse JSON
            var header = JSON.parse(CryptoService.Base64.urlDecode(headerSeg));
            var payload = JSON.parse(CryptoService.Base64.urlDecode(payloadSeg));

            if (!noVerify) {
                if (!algorithm) {
                    algorithm = 'HS256';
                }
                var signingMethod = this.algorithmMap[algorithm || header.alg];

                // verify signature. `sign` will return base64 string.
                var signingInput = [headerSeg, payloadSeg].join('.');

                if (!(signatureSeg === this.sign(signingInput, key, signingMethod))) {
                    throw new Error('Signature verification failed');
                }

                // Support for nbf and exp claims.
                // According to the RFC, they should be in seconds.
                if (payload.nbf && Date.now() < payload.nbf * 1000) {
                    throw new Error('Token not yet active');
                }

                if (payload.exp && Date.now() > payload.exp * 1000) {
                    throw new Error('Token expired');
                }
            }
            return payload;
        },
        getPayload:function(token){
            return CryptoService.jwt.Decode(token,'',true);
        },
    }
})(CryptoService || (CryptoService = {}));



