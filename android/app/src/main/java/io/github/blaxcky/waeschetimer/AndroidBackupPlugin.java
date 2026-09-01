package io.github.blaxcky.waeschetimer;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "AndroidBackup")
public class AndroidBackupPlugin extends Plugin {
    @PluginMethod
    public void exportBackup(PluginCall call) {
        String content = call.getString("content");
        String fileName = call.getString("fileName");
        if (content == null || fileName == null) {
            call.reject("Backup-Inhalt oder Dateiname fehlt.");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        startActivityForResult(call, intent, "saveBackupResult");
    }

    @ActivityCallback
    private void saveBackupResult(PluginCall call, ActivityResult result) {
        JSObject response = new JSObject();
        if (result.getResultCode() == Activity.RESULT_CANCELED) {
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }

        Intent data = result.getData();
        Uri uri = data == null ? null : data.getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            call.reject("Kein Speicherort ausgewählt.");
            return;
        }

        String content = call.getString("content");
        if (content == null) {
            call.reject("Backup-Inhalt fehlt.");
            return;
        }

        try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (output == null) {
                call.reject("Backup-Datei konnte nicht geöffnet werden.");
                return;
            }
            output.write(content.getBytes(StandardCharsets.UTF_8));
            output.flush();
            response.put("cancelled", false);
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Backup-Datei konnte nicht geschrieben werden.", error);
        }
    }
}
