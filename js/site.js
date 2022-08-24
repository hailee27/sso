//site.js

async function  doOnload()
{
    await ClientOauthApp.Init();
    window.SSOClient = new goSSOClient('loginsso',window.URL_ORIGIN_SSO);
    window.SSOClient.OnGetDeviceId = function (did) {
        console.log('OnGetDeviceId', did);
        ClientOauthApp.setDeviceId(did);
    };
        
    window.ApplicationLogout = function () {
        //Co the dinh nghia o noi khac viet lai ham nay trong project
        ClientOauthApp.LogOutFromSSO();
    };

    window.ApplicationLogin = function (action, value) {
        //console.log("Login from other tab", action, value);
        ClientOauthApp.LoginFromSSO(value);
    }

    window.SSOClient.loadStorageIframe();

    //Init buttonapp;btnLogOut

    $("#btnLogin").on('click', function(){
        ClientOauthApp.Login();
    });
    $("#btnLogOut").on('click', function(){
        ClientOauthApp.LogOut();
    });
    $("#btnGetUserInfo").on('click', function(){
        ClientOauthApp.GetUserInfo();
    });
    $("#btnVerifyToken").on('click', function(){
        ClientOauthApp.VerifyToken();
    });
    $("#btnRefreshToken").on('click', function(){
        ClientOauthApp.RefreshToken();
    });
}

window.JSLogout = function () {
    console.log("JSLogout from application");
    window.SSOClient.JSLogout();
}


//event ;

window.addEventListener('load', doOnload);
window.addEventListener('onunload', (e) => { e.preventDefault(); alert('Bye.');});

window.addEventListener('beforeunload', function (e) {
    return 'Are you sure you want to leave?';
});
