package com.callerapp

import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.*

class NativeCallRecorderModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NativeCallRecorder"

    @ReactMethod
    fun startRecording(filename: String, promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, CallRecordingService::class.java).apply {
                putExtra("filename", filename)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }

            // Give the service time to prepare, enable speaker, and start recording
            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    promise.resolve(WritableNativeMap().apply {
                        putString("filePath", CallRecordingService.currentFilePath ?: "")
                        putString("audioSource", CallRecordingService.usedAudioSource)
                        putBoolean("recording", CallRecordingService.isRecording)
                    })
                } catch (e: Exception) {
                    promise.reject("START_FAILED", e.message, e)
                }
            }, 1200) // Slightly longer delay to account for speaker switch + audio settle
        } catch (e: Exception) {
            promise.reject("START_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        try {
            val filePath = CallRecordingService.stopAndRelease()

            // Stop the foreground service (this also restores speaker + audio mode in onDestroy)
            val intent = Intent(reactApplicationContext, CallRecordingService::class.java)
            reactApplicationContext.stopService(intent)

            // Also restore audio from module side as safety net
            try {
                val audioManager = reactApplicationContext
                    .getSystemService(Context.AUDIO_SERVICE) as AudioManager
                audioManager.isSpeakerphoneOn = CallRecordingService.speakerWasOn
                audioManager.mode = AudioManager.MODE_NORMAL
            } catch (_: Exception) {}

            promise.resolve(WritableNativeMap().apply {
                putString("filePath", filePath ?: "")
            })
        } catch (e: Exception) {
            promise.reject("STOP_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun isCurrentlyRecording(promise: Promise) {
        promise.resolve(CallRecordingService.isRecording)
    }
}
