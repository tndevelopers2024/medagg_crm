package com.callerapp

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import java.io.File

class CallRecordingService : Service() {

    companion object {
        private const val CHANNEL_ID = "call_recording_channel"
        private const val NOTIFICATION_ID = 1001
        private const val TAG = "CallRecording"

        var isRecording = false
            private set
        var currentFilePath: String? = null
            private set
        var usedAudioSource: String = "NONE"
            private set
        var speakerWasOn = false
            private set

        private var mediaRecorder: MediaRecorder? = null

        fun stopAndRelease(): String? {
            val path = currentFilePath
            try {
                mediaRecorder?.stop()
            } catch (_: Exception) {}
            try {
                mediaRecorder?.release()
            } catch (_: Exception) {}
            mediaRecorder = null
            isRecording = false
            currentFilePath = null
            return path
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val filename = intent?.getStringExtra("filename")
            ?: "call_${System.currentTimeMillis()}.mp4"

        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)

        startRecording(filename)

        return START_NOT_STICKY
    }

    private fun startRecording(filename: String) {
        val outputFile = File(cacheDir, filename)
        currentFilePath = outputFile.absolutePath

        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager

        // Save original speaker state so we can restore it later
        speakerWasOn = audioManager.isSpeakerphoneOn

        // Step 1: Try VOICE_CALL first (works on Samsung, Xiaomi, some OEMs)
        //         without touching speaker — captures both sides natively
        val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(this)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }

        // Try VOICE_CALL source first (no speaker needed)
        var prepared = false
        try {
            recorder.reset()
            recorder.setAudioSource(MediaRecorder.AudioSource.VOICE_CALL)
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            recorder.setAudioEncodingBitRate(256000)
            recorder.setAudioSamplingRate(44100)
            recorder.setAudioChannels(2)
            recorder.setOutputFile(currentFilePath)
            recorder.prepare()
            usedAudioSource = "VOICE_CALL"
            prepared = true
            android.util.Log.d(TAG, "Prepared with VOICE_CALL — both sides captured natively")
        } catch (e: Exception) {
            android.util.Log.w(TAG, "VOICE_CALL failed: ${e.message}")
        }

        // Step 2: If VOICE_CALL not available, enable SPEAKER + use VOICE_COMMUNICATION or MIC
        //         Speaker makes lead's voice audible to mic, so mic captures both sides
        if (!prepared) {
            android.util.Log.d(TAG, "Enabling speakerphone for call recording...")
            audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
            audioManager.isSpeakerphoneOn = true

            // Small delay for audio routing to settle after speaker switch
            Thread.sleep(300)

            val fallbackSources = listOf(
                MediaRecorder.AudioSource.VOICE_COMMUNICATION to "VOICE_COMMUNICATION",
                MediaRecorder.AudioSource.MIC to "MIC"
            )

            for ((source, name) in fallbackSources) {
                try {
                    recorder.reset()
                    recorder.setAudioSource(source)
                    recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                    recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                    recorder.setAudioEncodingBitRate(256000)
                    recorder.setAudioSamplingRate(44100)
                    recorder.setAudioChannels(2)
                    recorder.setOutputFile(currentFilePath)
                    recorder.prepare()
                    usedAudioSource = "$name+SPEAKER"
                    prepared = true
                    android.util.Log.d(TAG, "Prepared with $name + SPEAKER — mic captures both sides via speaker")
                    break
                } catch (e: Exception) {
                    android.util.Log.w(TAG, "Source $name failed: ${e.message}")
                    continue
                }
            }
        }

        if (prepared) {
            recorder.start()
            mediaRecorder = recorder
            isRecording = true
            android.util.Log.d(TAG, "Recording started with $usedAudioSource")

            // If we're using speaker-based recording, periodically ensure speaker stays on
            // (some phone dialers may turn it off)
            if (usedAudioSource.contains("SPEAKER")) {
                startSpeakerGuard()
            }
        } else {
            android.util.Log.e(TAG, "All audio sources failed — cannot record")
            recorder.release()
            // Restore speaker state
            audioManager.isSpeakerphoneOn = speakerWasOn
            audioManager.mode = AudioManager.MODE_NORMAL
            stopSelf()
        }
    }

    private var speakerGuardHandler: Handler? = null
    private var speakerGuardRunnable: Runnable? = null

    private fun startSpeakerGuard() {
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        speakerGuardHandler = Handler(Looper.getMainLooper())
        speakerGuardRunnable = object : Runnable {
            override fun run() {
                if (isRecording && usedAudioSource.contains("SPEAKER")) {
                    if (!audioManager.isSpeakerphoneOn) {
                        android.util.Log.d(TAG, "Speaker was turned off — re-enabling for recording")
                        audioManager.isSpeakerphoneOn = true
                    }
                    speakerGuardHandler?.postDelayed(this, 2000)
                }
            }
        }
        speakerGuardHandler?.postDelayed(speakerGuardRunnable!!, 2000)
    }

    private fun stopSpeakerGuard() {
        speakerGuardRunnable?.let { speakerGuardHandler?.removeCallbacks(it) }
        speakerGuardHandler = null
        speakerGuardRunnable = null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Call Recording",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when a call is being recorded"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Recording Call")
            .setContentText("Call recording in progress...")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        stopSpeakerGuard()
        stopAndRelease()

        // Restore audio settings
        try {
            val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.isSpeakerphoneOn = speakerWasOn
            audioManager.mode = AudioManager.MODE_NORMAL
        } catch (_: Exception) {}

        super.onDestroy()
    }
}
