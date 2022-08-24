var goSSOClient = (function () {
    function goSSOClient(serviceCode, storage_url) {
        if(!serviceCode)
        {
            serviceCode='ID';
        }
        this.serviceCode = serviceCode;
        this.helperFrame = "helperFrame";
        this.iframessoid = "iframe-sso-id";
        this.storage_url = storage_url;
        this.dataKey = "keyForData";
        this.ReturnDataKey = "isReturnData";
        this.logOutKey = "logOutKey";
        this.timerId = 0;
        this.iframe = null;
        this.ApplicationLogin = null;
        this.ApplicationLogout = null;
        this.OnGetDeviceId = null;
        this.OnFrameLoad = null;
        window.addEventListener('message', this.messageHandler.bind(this), false);
        window.addEventListener("storage", this.storageHandler.bind(this), false);
    };
    goSSOClient.prototype.isDevelopment = function()
    {
        if(
            window.location.hostname=='localhost' 
            || window.location.href.includes('dev') 
            || window.location.href.includes('testing') 
            || ClientOauthApp.clientIp=='118.70.133.210'
            || window.location.hostname=='127.0.0.1'
            || this.DEV
        )
        {
            return true;
        }
        return false;
    }

    goSSOClient.prototype.log = function(...data)
    {
        if(this.isDevelopment())
        {
            console.log(...data);
        }
    }

    goSSOClient.prototype.getData = function () {
        sessionStorage.setItem(this.ReturnDataKey, 0);
        if (this.iframe) {
            this.iframe.contentWindow.postMessage(
                {
                    serviceCode: this.serviceCode,
                    action: "get",
                    key: "deviceId",
                    value: "",
                },
                this.storage_url
            );
            this.iframe.contentWindow.postMessage(
                {
                    serviceCode: this.serviceCode,
                    action: "get",
                    key: this.dataKey,
                    value: "",
                },
                this.storage_url
            );
        }
    };

    goSSOClient.prototype.setDataToken = function (tokenData) {
        //this.log("setDataToken", tokenData);
        sessionStorage.setItem(this.dataKey, tokenData);
        if (this.iframe) {
            this.iframe.contentWindow.postMessage(
                {
                    serviceCode: this.serviceCode,
                    action: "set",
                    key: this.dataKey,
                    value: tokenData,
                },
                this.storage_url
            );
        }
    };
    goSSOClient.prototype.Logout = function () {
        sessionStorage.removeItem(this.dataKey);
    };

    goSSOClient.prototype.JSLogout = function () {
        if (this.iframe) {
            this.iframe.contentWindow.postMessage(
                {
                    serviceCode: this.serviceCode,
                    action: "remove",
                    key: this.dataKey,
                    value: null,
                },
                this.storage_url
            );
        }
        this.Logout();
        //logout other tab; and app;
        localStorage.setItem("logOutKey", Date.now())
        //clear other state;
    };

    goSSOClient.prototype.loadStorageIframe = function (sso_url) {
        if (sso_url != null && sso_url != undefined && sso_url.length > 0) {
            this.storage_url = sso_url;
        }
        this.iframe = document.getElementById(this.helperFrame);
        var client = this;
        if (!this.iframe) {
            this.iframe = document.createElement("iframe");
            this.iframe.id = this.helperFrame;
            this.iframe.style.display = "none";
            this.iframe.title = 'sso-edu';
            this.iframe.onload = function () {
                client.getData();
                client.timerId = setTimeout(() => { sessionStorage.setItem(client.ReturnDataKey, 2); client.getDeviceId(); }, 2000);
                client.log("iframe onload");
                if(typeof(client.OnFrameLoad) ==='function')
                {
                    client.OnFrameLoad();
                }
            };
            this.iframe.src = this.storage_url+'?t='+Date.now();
            var firstChild = document.getElementById(this.iframessoid);

            if (firstChild) {
                document.body.insertBefore(this.iframe, firstChild.nextSibling);
            } else {
                document.body.insertBefore(this.iframe, document.body.firstChild);
            }
        }
    };

    goSSOClient.prototype.getDeviceId = function () {
        var deviceId = localStorage.getItem("deviceId");
        if (!deviceId) {
            var chars = "0123456789abcdef".split("");
            var uuid = [],
                rnd = Math.random,
                r;
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = "-";
            uuid[14] = "4"; // version 4

            for (var i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | (rnd() * 16);

                    uuid[i] = chars[i === 19 ? (r & 0x3) | 0x8 : r & 0xf];
                }
            }
            deviceId = uuid.join("");
            localStorage.setItem("deviceId", deviceId);
        }
        return deviceId;
    };
    goSSOClient.prototype.messageHandler = function (event) {
        if (event.origin != this.storage_url) {
            this.log("goSSOClient.messageHandler",event.origin, " !=", this.storage_url);
            return;
        }
        const { serviceCode, action, key, error, value } = event.data;
        if (this.serviceCode!= serviceCode) {
            this.log("goSSOClient.messageHandler", this.serviceCode, " !=", serviceCode );
            return;
        }

        if (action == undefined || key == undefined ) {
            this.log("goSSOClient.messageHandler", "serviceCode", serviceCode, "action", action, key, error, value  );
            return;
        }
        this.log("goSSOClient.messageHandler", serviceCode, action, key, error, value);
        if (action === "remove" || action === "del" || action === "clear") {
            //nhan message xoa du lieu tu storage;
            sessionStorage.removeItem(key);
            localStorage.removeItem("REDIRECT_URI");
            localStorage.removeItem("paramsUrl");
            //sessionStorage.removeItem(this.dataKey);
            if (key == this.dataKey) {
                sessionStorage.setItem(this.ReturnDataKey, 3);
                try {
                    if (typeof (this.ApplicationLogout) === 'function') {
                        this.ApplicationLogout();
                    }
                    else if (typeof (window.ApplicationLogout) === 'function') {
                        window.ApplicationLogout();
                    }
                }
                catch { }
            }
            return;
        }

        if ((action === "get" || action == "set" || action == "save") && key == this.dataKey) {
            if (error == 0 && value) {
                if((action == "set" || action == "save") && value==="successed")
                {
                    this.log("goSSOClient.messageHandler", "return", action, value);
                    return;
                }
                
                sessionStorage.setItem(this.dataKey, value);
                //const data = JSON.parse(value); //
                
                try {
                    if (this.ApplicationLogin!==null) {
                        this.log("goSSOClient.messageHandler", "this.ApplicationLogin",value);
                        this.ApplicationLogin(action, value);
                    }
                    else if (window.ApplicationLogin) {
                        this.log("goSSOClient.messageHandler", "window.ApplicationLogin",value);
                        window.ApplicationLogin(action, value);
                    }
                }
                catch { }
            }
            if (!value || value === "null" || value === null) {
                sessionStorage.removeItem(key);
            }
            if (this.timerId > 0) {
                clearTimeout(this.timerId);
            }
            sessionStorage.setItem(this.ReturnDataKey, 1);

        }
        if (action === "get" && key == "deviceId") {
            if (error == 0 && value) {
                localStorage.setItem("deviceId", value);
                if (typeof (this.OnGetDeviceId) === 'function') {
                    this.OnGetDeviceId(value);
                }
            }
        }
    };

    goSSOClient.prototype.storageHandler = function (event) {
        this.log("goSSOClient.storageHandler", event);
        //if (event.key == this.ExpiredKey && event.newValue) {
        //    var tokenData = event.newValue;
        //    if (tokenData) {
        //        this.setDataToken(event.newValue);
        //        localStorage.removeItem(this.ExpiredKey);
        //    }
        //}
        if (event.key == this.logOutKey) {
            //xoa bo sessionkey
            this.Logout();
            //goi hamg logout trang website neu co; viet rieng cho moi website;
            try {
                if (typeof (this.ApplicationLogout) === 'function') {
                    this.ApplicationLogout();
                }
                else if (typeof (window.ApplicationLogout) === 'function') {
                    window.ApplicationLogout();
                }
            }
            catch (e) {

            }
        }
    };

    return goSSOClient;
}());


window.JSLogout = function () {
    console.log("JSLogout from application");
    //window.SSOClient.JSLogout();
}

window.ApplicationLogout = function () {
    //Co the dinh nghia o noi khac viet lai ham nay trong project
};
window.ApplicationLogin = function (action, value) {
    //overide code to call login application
}

//how to use
//Add to module js affter attach this script code below

/*

window.SSOClient = new goSSOClient(serviceCode, window.URL_ORIGIN_SSO);
window.SSOClient.loadStorageIframe();

TokenData

{
    "access_token": "",
    "expires_in": 1641621664,
    "refresh_token": "",
    "payload": {
        "iss": "",
        "sub": "",
        "aud": "access_token",
        "exp": 1641621664,
        "sid": 330013,
        "atk": "637772400635603256.0823a4982b41888df26af3383311d571",
        "aty": 1,   //AccountType;
        "uid": 2684650515,
        "name": "sdktest02",
        "dvId": "e69550b8-a84e-4ce4-a77f-79215f560c47",
        "os": "Chrome",
        "ip": "118.70.133.210",
        "IsAuthenticated": true
    },
    "deltatime": 0
}

*/