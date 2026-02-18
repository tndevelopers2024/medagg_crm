package com.callerapp

import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.AutomaticGainControl
import android.media.audiofx.NoiseSuppressor
import android.util.Log

class AudioEnhancer(private val audioSessionId: Int) {
    
    companion object {
        private const val TAG = "AudioEnhancer"
    }
    
    private var aec: AcousticEchoCanceler? = null
    private var ns: NoiseSuppressor? = null
    private var agc: AutomaticGainControl? = null
    
    data class EnhancementStatus(
        val aecEnabled: Boolean,
        val nsEnabled: Boolean,
        val agcEnabled: Boolean
    )
    
    /**
     * Enable all available audio enhancements
     */
    fun enableEnhancements(): EnhancementStatus {
        var aecEnabled = false
        var nsEnabled = false
        var agcEnabled = false
        
        // Enable Acoustic Echo Canceler
        if (AcousticEchoCanceler.isAvailable()) {
            try {
                aec = AcousticEchoCanceler.create(audioSessionId)
                aec?.enabled = true
                aecEnabled = aec?.enabled == true
                if (aecEnabled) {
                    Log.d(TAG, "Acoustic Echo Canceler enabled")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to enable AEC: ${e.message}")
            }
        } else {
            Log.d(TAG, "Acoustic Echo Canceler not available on this device")
        }
        
        // Enable Noise Suppressor
        if (NoiseSuppressor.isAvailable()) {
            try {
                ns = NoiseSuppressor.create(audioSessionId)
                ns?.enabled = true
                nsEnabled = ns?.enabled == true
                if (nsEnabled) {
                    Log.d(TAG, "Noise Suppressor enabled")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to enable NS: ${e.message}")
            }
        } else {
            Log.d(TAG, "Noise Suppressor not available on this device")
        }
        
        // Enable Automatic Gain Control
        if (AutomaticGainControl.isAvailable()) {
            try {
                agc = AutomaticGainControl.create(audioSessionId)
                agc?.enabled = true
                agcEnabled = agc?.enabled == true
                if (agcEnabled) {
                    Log.d(TAG, "Automatic Gain Control enabled")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to enable AGC: ${e.message}")
            }
        } else {
            Log.d(TAG, "Automatic Gain Control not available on this device")
        }
        
        return EnhancementStatus(aecEnabled, nsEnabled, agcEnabled)
    }
    
    /**
     * Disable and release all audio enhancements
     */
    fun release() {
        try {
            aec?.enabled = false
            aec?.release()
            aec = null
            
            ns?.enabled = false
            ns?.release()
            ns = null
            
            agc?.enabled = false
            agc?.release()
            agc = null
            
            Log.d(TAG, "Audio enhancements released")
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing audio enhancements: ${e.message}")
        }
    }
}
