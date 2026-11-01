package com.alya.companion;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

/**
 * Android Foreground Service for Alya AI Companion
 * Displays a required persistent notification when background voice companion is active,
 * with explicit user controls to Pause or Stop the service at any time.
 */
public class AlyaForegroundService extends Service {
    private static final String CHANNEL_ID = "alya_companion_foreground_channel";
    private static final int NOTIFICATION_ID = 1042;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || "ACTION_STOP".equals(intent.getAction())) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        if (title == null) title = "Alya AI Companion Active";
        if (body == null) body = "Listening & ready to help. Tap to open or stop.";

        Notification notification = buildNotification(title, body);
        startForeground(NOTIFICATION_ID, notification);
        return START_STICKY;
    }

    private Notification buildNotification(String title, String body) {
        Intent openIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingOpen = PendingIntent.getActivity(
                this, 0, openIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Intent stopIntent = new Intent(this, AlyaForegroundService.class);
        stopIntent.setAction("ACTION_STOP");
        PendingIntent pendingStop = PendingIntent.getService(
                this, 1, stopIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        return builder
                .setContentTitle(title)
                .setContentText(body)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setContentIntent(pendingOpen)
                .setOngoing(true)
                .addAction(android.R.drawable.ic_media_pause, "Stop Service", pendingStop)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Alya Companion Background Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("User-controlled continuous AI companion service");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
