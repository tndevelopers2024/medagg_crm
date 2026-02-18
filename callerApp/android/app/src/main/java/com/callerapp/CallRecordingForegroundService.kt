package com.callerapp

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

class CallRecordingForegroundService : Service() {
    
    companion object {
        private const val TAG = "CallRecordingService"
        private const val CHANNEL_ID = "call_recording_channel"
        private const val NOTIFICATION_ID = 2001
        
        // Service state
        private var isServiceRunning = false
        private var recordingEngine: HybridRecordingEngine? = null
        private var callStateListener: CallStateListener? = null
        private var fileManager: RecordingFileManager? = null
        private var lastRecordingPath: String? = null
        
        fun isRunning(): Boolean = isServiceRunning
        fun getLastRecordingPath(): String? = lastRecordingPath
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "Service starting...")
        
        // Start foreground service
        val notification = buildNotification("Monitoring calls...")
        startForeground(NOTIFICATION_ID, notification)
        
        // Initialize components
        recordingEngine = HybridRecordingEngine(this)
        fileManager = RecordingFileManager(this)
        
        // Log device capabilities
        Log.i(TAG, DeviceCapabilityDetector.logDeviceInfo())
        
        // Start listening for call state changes
        callStateListener = CallStateListener(
            context = this,
            onCallStarted = { handleCallStarted() },
            onCallEnded = { handleCallEnded() }
        )
        callStateListener?.startListening()
        
        // Clean up old recordings
        val deletedCount = fileManager?.cleanupOldRecordings() ?: 0
        if (deletedCount > 0) {
            Log.i(TAG, "Cleaned up $deletedCount old recordings")
        }
        
        isServiceRunning = true
        Log.i(TAG, "Service started successfully")
        
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        Log.i(TAG, "Service stopping...")
        
        // Stop listening for calls
        callStateListener?.stopListening()
        callStateListener = null
        
        // Stop any active recording
        if (recordingEngine?.isRecording() == true) {
            val result = recordingEngine?.stopRecording()
            Log.i(TAG, "Stopped active recording on service destroy: ${result?.filePath}")
        }
        
        recordingEngine = null
        fileManager = null
        isServiceRunning = false
        
        Log.i(TAG, "Service destroyed")
        super.onDestroy()
    }
    
    /**
     * Handle call started event
     */
    private fun handleCallStarted() {
        Log.i(TAG, "📞 Call started - beginning recording")
        
        try {
            // Update notification
            updateNotification("Recording call...")
            
            // Generate file path
            val filePath = fileManager?.getNewRecordingPath()
            if (filePath == null) {
                Log.e(TAG, "Failed to generate file path")
                return
            }
            
            // Start recording
            val result = recordingEngine?.startRecording(filePath)
            
            if (result?.success == true) {
                lastRecordingPath = result.filePath
                val sourceInfo = if (result.usingSpeaker) {
                    "${result.audioSource} + SPEAKER"
                } else {
                    result.audioSource
                }
                Log.i(TAG, "✓ Recording started: $sourceInfo")
                updateNotification("Recording: $sourceInfo")
            } else {
                Log.e(TAG, "✗ Recording failed: ${result?.errorMessage}")
                updateNotification("Recording failed")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting recording: ${e.message}", e)
        }
    }
    
    /**
     * Handle call ended event
     */
    private fun handleCallEnded() {
        Log.i(TAG, "📞 Call ended - stopping recording")
        
        try {
            if (recordingEngine?.isRecording() == true) {
                val result = recordingEngine?.stopRecording()
                
                if (result?.success == true) {
                    val metadata = fileManager?.getMetadata(result.filePath!!)
                    val sizeStr = metadata?.let { fileManager?.formatFileSize(it.sizeBytes) } ?: "unknown"
                    Log.i(TAG, "✓ Recording saved: ${result.filePath} ($sizeStr)")
                    lastRecordingPath = result.filePath
                } else {
                    Log.w(TAG, "Recording stopped but no file saved")
                }
            }
            
            // Update notification
            updateNotification("Monitoring calls...")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping recording: ${e.message}", e)
        }
    }
    
    /**
     * Create notification channel for Android 8+
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Call Recording",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors and records phone calls"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    /**
     * Build notification for foreground service
     */
    private fun buildNotification(contentText: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Call Recorder Active")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setShowWhen(false)
            .build()
    }
    
    /**
     * Update notification text
     */
    private fun updateNotification(contentText: String) {
        try {
            val notification = buildNotification(contentText)
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "Error updating notification: ${e.message}")
        }
    }
}
