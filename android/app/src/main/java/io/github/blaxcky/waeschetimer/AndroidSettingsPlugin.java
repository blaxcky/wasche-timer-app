package io.github.blaxcky.waeschetimer;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AndroidSettings")
public class AndroidSettingsPlugin extends Plugin {
    @PluginMethod
    public void openAppNotificationSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));

        try {
            getActivity().startActivity(intent);
            call.resolve(new JSObject());
        } catch (Exception error) {
            Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            fallback.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(fallback);
            call.resolve(new JSObject());
        }
    }
}
