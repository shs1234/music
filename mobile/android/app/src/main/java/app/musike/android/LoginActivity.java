package app.musike.android;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Google sign-in in a WebView. Once the login lands back on music.youtube.com, the music.youtube.com cookies are
 * stored (MusikeAuthPlugin) and the activity finishes.
 */
public class LoginActivity extends Activity {

    private static final String LOGIN_URL =
        "https://accounts.google.com/ServiceLogin?ltmpl=music&service=youtube&passive=true" +
        "&continue=https%3A%2F%2Fmusic.youtube.com%2F";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);

        WebView web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        cookies.setAcceptThirdPartyCookies(web, true);
        web.setWebViewClient(
            new WebViewClient() {
                @Override
                public void onPageStarted(WebView view, String url, Bitmap favicon) {
                    check(url);
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    check(url);
                }
            }
        );
        setContentView(web);
        web.loadUrl(LOGIN_URL);
    }

    private void check(String url) {
        if (url == null || !url.startsWith("https://music.youtube.com")) return;
        String cookie = CookieManager.getInstance().getCookie("https://music.youtube.com");
        if (!MusikeAuthPlugin.isValid(cookie)) return;
        CookieManager.getInstance().flush();
        MusikeAuthPlugin.save(this, cookie);
        setResult(RESULT_OK);
        finish();
    }
}
