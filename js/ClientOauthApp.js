ClientOauthApp={
    TOKEN_EXPIRE:120,   //120 s
    deviceId : "",
    clientIp : "",
    deltatime : 0,
    IntervalHandle:0,
    tokeInfo:undefined,
    loginStatus:0, //0: Chua dang nhap, 1: Dang dang nhap, 2: Da dang nhap thanh cong
    serverTime :  function() {
        return moment().utcOffset(420).valueOf() + ClientOauthApp.deltatime * 1000;
    },
    isdoinglogin : false,
    isDevelopment:function()
    {
        if(
            window.location.hostname=='localhost' 
            || window.location.href.includes('dev') 
            || window.location.href.includes('testing') 
            || ClientOauthApp.clientIp=='118.70.133.210'
            || window.location.hostname=='127.0.0.1'
        )
        {
            return true;
        }
        return false;
    },
    WriteLog:function(...data)
    {
        if(this.isDevelopment())
        {
            console.log(...data);
        }
    },
    timeNow:function()
    {
        return moment(ClientOauthApp.serverTime()).utcOffset(420);
    },
    getTime: function(examISODate)
    {
        var now = ClientOauthApp.timeNow();
        if(!examISODate.includes('+07:00'))
        {
            examISODate= examISODate+'+07:00';
        }
        var a =moment(examISODate).utcOffset(420);
        return a;
    },
    parseParams:function(params = "")
    {
        const rawParams = params.replace("?", "").split("&");
        const extractedParams = {};
        rawParams.forEach((item) => {
            item = item.split("=");
            extractedParams[item[0]] =decodeURIComponent(item[1]);
        });
        return extractedParams;
    },
    getLoginDataInput:function()
    {
        var inputData = { 
            client_id: window.client_id, 
            client_secret: window.client_secret, 
            dvId: ClientOauthApp.deviceId, 
            osver: platform.version, 
            os: platform.name, 
            ip: ClientOauthApp.clientIp,
            fromclientId: ClientOauthApp.clientData.client_id
        };
        return inputData;
    },
    getUserDataInput:function()
    {

        var access_token= '';
        if(ClientOauthApp.tokeInfo!=null)
        {
            access_token=ClientOauthApp.tokeInfo.access_token;
        }
        var inputData = { 
            jwt: access_token, 
            client_id: window.client_id, 
            client_secret: '', //window.client_secret, 
            dvId: ClientOauthApp.deviceId, 
            osver: platform.version, 
            os: platform.name, 
            ip: ClientOauthApp.clientIp,
        };
        ClientOauthApp.WriteLog('getUserDataInput', inputData, access_token, ClientOauthApp.tokeInfo);
        
        return inputData;
    },
    DoFunctionWithEncode: async function(funcName, data)
    {
        var jti = ClientOauthApp.serverTime();
        var nbf = parseInt( jti/1000);
        var exp = nbf + ClientOauthApp.TOKEN_EXPIRE ;
        var payload = 
        {
            jti : jti,
            iss : window.client_id,
            nbf : nbf,
            exp : exp,
            sid : 0,
            jdt : data,
            cid: ClientOauthApp.clientData.client_id
        };
        var postData ={ jwt : CryptoService.jwt.Encode(payload, window.client_secret, 'HS256') };
        var url= window.auth_uri+'/'+funcName;
        return await ClientOauthApp.postData(url, postData);
    },
    postData: async function(url = '', data = {})
    {
        
        const response = await fetch(url, {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'include', // include, *same-origin, omit
            headers: {
                'Content-Type': 'application/json',
                'Content-Security-Policy':'upgrade-insecure-requests'
                // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify(data) // body data type must match "Content-Type" header
        });
        
        var returnObj;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            returnObj= response.json();
        } else {
            returnObj= response.text();
        }
        if(url.includes('dev') || url.includes('testing'))
        {
            ClientOauthApp.WriteLog('postData', url, data, returnObj);
        }
        return returnObj;
    },
    getData: async function(url)
    {
        if(url.includes('dev') || url.includes('testing'))
        {
            ClientOauthApp.WriteLog('getData',url);
        }
        const response = await fetch(url, {
            method: 'GET', // *GET, POST, PUT, DELETE, etc.
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'include', // include, *same-origin, omit
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        });
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        } else {
            return response.text();
        }
    },
    setDeviceId: function(dvid){ ClientOauthApp.deviceId= dvid;},
    Init: async function()
    {
        ClientOauthApp.WriteLog(navigator.userAgent,platform);
        ClientOauthApp.deviceId= localStorage.getItem("deviceId");
        ComLibs.ShowLoading();
        await ClientOauthApp.InitServer();
    },
    
    InitServer: async function()
    {
        var getclientip = new Promise(async resolve => {
            await ClientOauthApp.getData(window.auth_uri + '/infos/getclientip').then(data => {
                resolve(data);
            });
        });
        var getservertime = new Promise(async resolve => {
            await ClientOauthApp.getData(window.auth_uri + '/infos/getservertime').then(data => {
                resolve(data);
            });
        });

        await Promise.all([getclientip, getservertime]).then(values => {
            ClientOauthApp.WriteLog("Promise.all([getclientip, getservertime])", values);
            ClientOauthApp.clientIp = values[0];
            var serverTime = parseInt(values[1]);
            var clientTime =moment().utcOffset(420).unix();
            ClientOauthApp.deltatime = serverTime - clientTime;
            if (Math.abs(ClientOauthApp.deltatime) < 10) { ClientOauthApp.deltatime = 0; }
            ClientOauthApp.WriteLog("deltatime", serverTime, clientTime, ClientOauthApp.deltatime);
            ComLibs.HideLoading();
            ClientOauthApp.LoginFromUrlReturn();
        });
        
    },
    LoginFromUrlReturn: async function()
    {
        //Hàm xử lý đăng nhập khi đăng nhập qua cổng đăng nhập return trở về;
        var params = ClientOauthApp.parseParams(window.location.search);
        if(!params.code)
        {
            return;
        }
        ClientOauthApp.WriteLog('LoginFromUrlReturn', params);
        if(this.loginStatus==1) //đang đăng nhập;
        {
            setTimeout(()=> { ClientOauthApp.LoginFromUrlReturn(); }, 1000);
        }
        if(this.loginStatus==2)  //dang dang nhap o mot thread khac => khong xu ly;
        {
            //redirect ve trang goi login;
            var url=localStorage.getItem('redirectpath');
            localStorage.removeItem('redirectpath')
            if(ComLibs.IsNullOrEmpty(url))
            {
                url='/';
            }
            window.history.pushState('Object','Title', url);
            return ;
        }
        this.loginStatus=1;
        ComLibs.ShowLoading();
        
        var inputData=ClientOauthApp.getUserDataInput();
        inputData.jwt=params.code;
        await ClientOauthApp.postData(window.token_uri, inputData).then(responseData => {
            ComLibs.HideLoading();
            ClientOauthApp.ShowMessage('LoginFromUrlReturn: '+ JSON.stringify(responseData));
            if(responseData.IsSuccessed)
            {
                ClientOauthApp.OnLoginSuccess(responseData.data, true);
                //redirect ve trang goi login;
                var url=localStorage.getItem('redirectpath');
                localStorage.removeItem('redirectpath')
                if(ComLibs.IsNullOrEmpty(url))
                {
                    url='/';
                }
                window.history.pushState('Object','Title', url);
            }
            else
            {
                alert(responseData.message);
                this.loginStatus=0;
            }
        });
    },
   
    Login: async function()
    {
        if(ClientOauthApp.tokeInfo!=null)
        {
            alert('Đã đăng nhập');
            return;
        }
        var state = ClientOauthApp.serverTime();
        localStorage.setItem('loginstate',state);
        //save current virtualpath;
        localStorage.setItem('redirectpath',window.location);

        var loginHref =
        window.AUTHEN_URL + 
        "?client_id=" + window.client_id + 
        "&redirect_uri=" + window.REDIRECT_SSO_URI +
        "&state=" + state;
        window.location.replace(loginHref);
        
    },
    Register: async function()
    {
        if(ClientOauthApp.tokeInfo!=null)
        {
            alert('Đã đăng nhập');
            return;
        }
        /*
        var state = ClientOauthApp.serverTime();
        localStorage.setItem('loginstate',state);
        //save current virtualpath;
        localStorage.setItem('redirectpath',window.location);

        var loginHref =
        window.AUTHEN_URL + 
        "/register?client_id=" + window.CLIENT_ID + 
        "&redirect_uri=" + window.REDIRECT_URI +
        "&state=" + state;
        window.location.replace(loginHref);
        */
    },
    OnLoginSuccess:function(tokenData, savesso)
    {
        this.loginStatus=2;
        //test
        var payload= CryptoService.jwt.getPayload(tokenData.access_token);
        ClientOauthApp.ShowMessage('OnLoginSuccess: '+JSON.stringify(payload));
        
        tokenData.payload=payload;

        tokenData.deltatime=ClientOauthApp.deltatime;
        ClientOauthApp.tokeInfo=tokenData;
        //Lưu dữ liệu vào storage;  và notify tới những client khác đang chạy trên cùng trình duyệt
        if(savesso)
        {
            window.SSOClient.setDataToken(tokenData);
        }
        
        //Show login info; getuserinfo; xu ly nghiep vu sau login;
        this.ProcessLoginInfo();
    },
    LoginFromSSO:function(strtokeInfo)
    {
        ClientOauthApp.WriteLog("Login from sso stotage event with tokeInfo: ", strtokeInfo);
        if(this.loginStatus==1) //đang đăng nhập;
        {
            setTimeout(()=> { ClientOauthApp.LoginFromSSO(strtokeInfo); }, 1000);
        }
       
        //Xử lý hiển thị tài khoản đang đăng nhập, nếu người dùng ấn contine thì gọi hàm OnLoginSuccess;
        var tokeInfo = JSON.parse(strtokeInfo);
        if (ClientOauthApp.tokeInfo != null && ClientOauthApp.tokeInfo.access_token == tokeInfo.access_token && this.loginStatus==2) {
           //đã đăng nhập
            //this.ProcessLoginInfo();
            return;
        }
        this.loginStatus=1;
        // if need verify token
        /*
        ClientOauthApp.VerifyToken((IsSuccessed)=>{
            if(IsSuccessed)
            {
                ClientOauthApp.OnLoginSuccess(tokeInfo);
            }
        });
        */
        //if no need verify token
        ClientOauthApp.OnLoginSuccess(tokeInfo);
    },
    ProcessLoginInfo: function(){
        //Xử lý nghiệp vụ sau đăng nhập;
    },
    LogOut:function()
    {
        //call logout to aother tab;
        window.JSLogout();
        ClientOauthApp.setLogOut();
    },
    LogOutFromSSO:function()
    {
        console.log("JSLogout from other tab");
        ClientOauthApp.setLogOut();
    },
    setLogOut:function()
    {
        ClientOauthApp.tokeInfo=null;
        this.loginStatus=0;
        //xy ly nghiep vu logout;
        this.ShowMessage('User is logout');
    },
    GetUserInfo: async function()
    {
        if(ClientOauthApp.tokeInfo==null) return;

       var inputData=ClientOauthApp.getUserDataInput();
        await ClientOauthApp.postData(window.userinfo_uri+'/get/info', inputData).then(responseData => {
            ComLibs.HideLoading();
            ClientOauthApp.ShowMessage('GetUserInfo: '+ JSON.stringify(responseData));
            /*
            if (responseData.code == 0 && responseData.data!=null) {
                ClientOauthApp.ShowMessage('GetUserInfo: '+ JSON.parse( responseData));
            }
            else {
                ClientOauthApp.WriteLog(responseData.message);
                ComLibs.Alert(responseData.message);
            }
            */
        });
       
    },
    VerifyToken: async function(callback){
        if(ClientOauthApp.tokeInfo==null) return;
        var inputData=ClientOauthApp.getUserDataInput();
        await ClientOauthApp.postData(window.auth_uri + '/validatetoken', inputData).then(responseData => {
            ComLibs.HideLoading();
            ClientOauthApp.ShowMessage('VerifyToken: '+ JSON.stringify(responseData));
            if(typeof callback === 'function')
            {
                callback(responseData.IsSuccessed);
            }
        });
    },
    RefreshToken: async function(){
        if(ClientOauthApp.tokeInfo==null) return;
        var inputData=ClientOauthApp.getUserDataInput();
        inputData.jwt=ClientOauthApp.tokeInfo.refresh_token;
        await ClientOauthApp.postData(window.auth_uri + '/refreshtoken', inputData).then(responseData => {
            ComLibs.HideLoading();
            ClientOauthApp.ShowMessage('VerifyToken: '+ JSON.stringify(responseData));
            if(responseData.IsSuccessed)
            {
                ClientOauthApp.OnLoginSuccess(responseData.data,true);
            }
            else
            {
                alert(responseData.message);
            }
        });
    },

    ShowMessage:function(message)
    {
        $("#result").text(message);
    },
    verifyProtocol:function(url)
    {
        var returnUrl=url;
        if (window.location.protocol === "https:") {
            if(window.httpcore.startsWith('http://'))
            {
                returnUrl=url.replace('https','http');
            }
         }
        return returnUrl;
    }
};