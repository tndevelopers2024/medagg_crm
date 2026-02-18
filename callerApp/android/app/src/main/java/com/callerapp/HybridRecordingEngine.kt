package com.callerapp

import android.content.Context
import android.media.AudioManager
import android.media.MediaRecorder
import android.os.Build
import android.util.Log

class HybridRecordingEngine(private val context: Context) {
    
    companion object {
        private const val TAG = "HybridRecordingEngine"
        
        // Audio source constants
        const val SOURCE_MIC = 1
        const val SOURCE_VOICE_CALL = 4
        const val SOURCE_VOICE_COMMUNICATION = 7
    }
    
    private var mediaRecorder: MediaRecorder? = null
    private var audioManager: AudioManager? = null
    private var audioEnhancer: AudioEnhancer? = null
    private var currentFilePath: String? = null
    private var currentAudioSource: Int? = null
    private var usingSpeakerFallback = false
    
    // Store original audio state for restoration
    private var originalSpeakerState = false
    private var originalAudioMode = AudioManager.MODE_NORMAL
    
    data class RecordingResult(
        val success: Boolean,
        val filePath: String?,
        val audioSource: String,
        val usingSpeaker: Boolean,
        val errorMessage: String? = null
    )
    
    /**
     * Start recording with automatic fallback strategy
     */
    fun startRecording(filePath: String): RecordingResult {
        currentFilePath = filePath
        audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        
        // Save original audio state
        originalSpeakerState = audioManager?.isSpeakerphoneOn ?: false
        originalAudioMode = audioManager?.mode ?: AudioManager.MODE_NORMAL
        
        // Get device capabilities
        val deviceCapability = DeviceCapabilityDetector.detectCapabilities()
        Log.i(TAG, "Starting recording on: ${deviceCapability.manufacturer} ${deviceCapability.model}")
        Log.i(TAG, "Preferred sources: ${deviceCapability.preferredSources.joinToString { DeviceCapabilityDetector.getAudioSourceName(it) }}")
        
        // Try each audio source in order of preference
        for (source in deviceCapability.preferredSources) {
            val result = tryRecordingWithSource(source, filePath)
            if (result.success) {
                return result
            }
        }
        
        // All sources failed
        return RecordingResult(
            success = false,
            filePath = null,
            audioSource = "NONE",
            usingSpeaker = false,
            errorMessage = "All audio sources failed"
        )
    }
    
    /**
     * Try recording with a specific audio source
     */
    private fun tryRecordingWithSource(source: Int, filePath: String): RecordingResult {
        val sourceName = DeviceCapabilityDetector.getAudioSourceName(source)
        Log.d(TAG, "Attempting to record with source: $sourceName")
        
        try {
            // Create MediaRecorder
            val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }
            
            // If using MIC source, enable speakerphone for better capture
            if (source == SOURCE_MIC) {
                enableSpeakerMode()
                usingSpeakerFallback = true
                // Small delay for audio routing to settle
                Thread.sleep(300)
            } else {
                // For VOICE_CALL and VOICE_COMMUNICATION, use IN_COMMUNICATION mode
                audioManager?.mode = AudioManager.MODE_IN_COMMUNICATION
                usingSpeakerFallback = false
            }
            
            // Configure recorder
            recorder.reset()
            recorder.setAudioSource(source)
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            recorder.setAudioEncodingBitRate(128000)
            recorder.setAudioSamplingRate(44100)
            recorder.setAudioChannels(if (source == SOURCE_VOICE_CALL) 2 else 1)
            recorder.setOutputFile(filePath)
            
            // Prepare recorder
            recorder.prepare()
            
            // Note: Audio enhancements (AEC, NS, AGC) are not available for MediaRecorder
            // They are typically used with AudioRecord, not MediaRecorder
            
            // Start recording
            recorder.start()
            
            mediaRecorder = recorder
            currentAudioSource = source
            
            Log.i(TAG, "✓ Recording started successfully with $sourceName${if (usingSpeakerFallback) " + SPEAKER" else ""}")
            
            return RecordingResult(
                success = true,
                filePath = filePath,
                audioSource = sourceName,
                usingSpeaker = usingSpeakerFallback
            )
            
        } catch (e: Exception) {
            Log.w(TAG, "✗ Failed to record with $sourceName: ${e.message}")
            
            // Cleanup on failure
            try {
                mediaRecorder?.reset()
                mediaRecorder?.release()
                mediaRecorder = null
            } catch (cleanupError: Exception) {
                Log.e(TAG, "Cleanup error: ${cleanupError.message}")
            }
            
            return RecordingResult(
                success = false,
                filePath = null,
                audioSource = sourceName,
                usingSpeaker = usingSpeakerFallback,
                errorMessage = e.message
            )
        }
    }
    
    /**
     * Enable speakerphone mode for MIC fallback
     */
    private fun enableSpeakerMode() {
        try {
            audioManager?.mode = AudioManager.MODE_IN_COMMUNICATION
            audioManager?.isSpeakerphoneOn = true
            Log.d(TAG, "Speakerphone enabled for MIC recording")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to enable speakerphone: ${e.message}")
        }
    }
    
    /**
     * Stop recording and cleanup
     */
    fun stopRecording(): RecordingResult {
        val filePath = currentFilePath
        val sourceName = currentAudioSource?.let { DeviceCapabilityDetector.getAudioSourceName(it) } ?: "NONE"
        
        try {
            mediaRecorder?.stop()
            Log.i(TAG, "Recording stopped successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping recorder: ${e.message}")
        }
        
        // Release recorder
        try {
            mediaRecorder?.release()
            mediaRecorder = null
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing recorder: ${e.message}")
        }
        
        // Release audio enhancements
        audioEnhancer?.release()
        audioEnhancer = null
        
        // Restore original audio state
        restoreAudioState()
        
        val result = RecordingResult(
            success = filePath != null,
            filePath = filePath,
            audioSource = sourceName,
            usingSpeaker = usingSpeakerFallback
        )
        
        // Reset state
        currentFilePath = null
        currentAudioSource = null
        usingSpeakerFallback = false
        
        return result
    }
    
    /**
     * Restore original audio settings
     */
    private fun restoreAudioState() {
        try {
            audioManager?.isSpeakerphoneOn = originalSpeakerState
            audioManager?.mode = originalAudioMode
            Log.d(TAG, "Audio state restored")
        } catch (e: Exception) {
            Log.e(TAG, "Error restoring audio state: ${e.message}")
        }
    }
    
    /**
     * Check if currently recording
     */
    fun isRecording(): Boolean {
        return mediaRecorder != null
    }
    
    /**
     * Get current recording info
     */
    fun getCurrentRecordingInfo(): String? {
        if (!isRecording()) return null
        
        val sourceName = currentAudioSource?.let { DeviceCapabilityDetector.getAudioSourceName(it) } ?: "UNKNOWN"
        return "$sourceName${if (usingSpeakerFallback) " + SPEAKER" else ""}"
    }
}
