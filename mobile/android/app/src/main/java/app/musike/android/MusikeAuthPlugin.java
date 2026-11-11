package app.musike.android;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.webkit.CookieManager;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The YouTube Music sign-in (web/src/native/account.ts): opens LoginActivity and hands the stored
 * music.youtube.com cookies to the app, which signs its own requests for the home feed with them.
 */
@CapacitorPlugin(name = "MusikeAuth")
public class MusikeAuthPlugin extends Plugin {

    private static final String PREFS = "musike-auth";
    private static final String KEY = "cookie";

    static boolean isValid(String cookie) {
        return cookie != null && (cookie.contains("SAPISID=") || cookie.contains("__Secure-3PAPISID="));
    }

    static void save(Context context, String cookie) {
        prefs(context).edit().putString(KEY, cookie).apply();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private JSObject result() {
        String cookie = prefs(getContext()).getString(KEY, null);
        JSObject r = new JSObject();
        r.put("cookie", isValid(cookie) ? cookie : null);
        return r;
    }

    /** { cookie } — null when signed out. */
    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(result());
    }

    @PluginMethod
    public void login(PluginCall call) {
        startActivityForResult(call, new Intent(getContext(), LoginActivity.class), "loginDone");
    }

    @ActivityCallback
    private void loginDone(PluginCall call, ActivityResult ignored) {
        if (call != null) call.resolve(result());
    }

    /**
     * Signs out of YouTube Music. By default only the YouTube cookies go: the Google account stays signed in inside the
     * login WebView, so signing in again goes straight through without typing the password. { forgetGoogle: true }
     * clears every cookie, to sign in with another account.
     */
    @PluginMethod
    public void logout(PluginCall call) {
        prefs(getContext()).edit().remove(KEY).apply();
        CookieManager cookies = CookieManager.getInstance();
        if (call.getBoolean("forgetGoogle", false)) {
            cookies.removeAllCookies(done -> {
                cookies.flush();
                call.resolve(result());
            });
            return;
        }
        for (String site : new String[] { "https://music.youtube.com", "https://www.youtube.com" }) {
            String all = cookies.getCookie(site);
            if (all == null) continue;
            for (String part : all.split(";")) {
                String name = part.split("=", 2)[0].trim();
                if (name.isEmpty()) continue;
                String expired = name + "=; Max-Age=0; Path=/; Secure";
                if (!name.startsWith("__Host-")) cookies.setCookie(site, expired + "; Domain=.youtube.com");
                cookies.setCookie(site, expired);
            }
        }
        cookies.flush();
        call.resolve(result());
    }
}
