package io.github.blaxcky.waeschetimer;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static final String WASHING_MACHINE_CHANNEL_ID = "washing-machine";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidSettingsPlugin.class);
        createWashingMachineNotificationChannel();
        super.onCreate(savedInstanceState);
    }

    private void createWashingMachineNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(
            WASHING_MACHINE_CHANNEL_ID,
            "Waschmaschine",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Meldung, sobald die Waschmaschine fertig ist.");
        channel.enableVibration(true);
        channel.enableLights(true);
        channel.setLightColor(Color.rgb(13, 95, 127));
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build();
        channel.setSound(Settings.System.DEFAULT_NOTIFICATION_URI, audioAttributes);
        manager.createNotificationChannel(channel);
    }
}
