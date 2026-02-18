package com.callerapp

import android.content.Context
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi

class CallStateListener(
    private val context: Context,
    private val onCallStarted: () -> Unit,
    private val onCallEnded: () -> Unit
) {
    
    companion object {
        private const val TAG = "CallStateListener"
    }
    
    private var telephonyManager: TelephonyManager? = null
    private var phoneStateListener: PhoneStateListener? = null
    private var telephonyCallback: TelephonyCallback? = null
    
    private var isCallActive = false
    private var wasRinging = false
    
    /**
     * Start listening for phone state changes
     */
    fun startListening() {
        telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ (API 31+)
            startListeningModern()
        } else {
            // Android 10-11 (API 29-30)
            startListeningLegacy()
        }
        
        Log.i(TAG, "Started listening for call state changes")
    }
    
    /**
     * Stop listening for phone state changes
     */
    fun stopListening() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                telephonyCallback?.let {
                    telephonyManager?.unregisterTelephonyCallback(it)
                }
                telephonyCallback = null
            } else {
                phoneStateListener?.let {
                    @Suppress("DEPRECATION")
                    telephonyManager?.listen(it, PhoneStateListener.LISTEN_NONE)
                }
                phoneStateListener = null
            }
            
            Log.i(TAG, "Stopped listening for call state changes")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping listener: ${e.message}")
        }
    }
    
    /**
     * Modern implementation for Android 12+ (API 31+)
     */
    @RequiresApi(Build.VERSION_CODES.S)
    private fun startListeningModern() {
        telephonyCallback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
            override fun onCallStateChanged(state: Int) {
                handleCallStateChange(state)
            }
        }
        
        telephonyManager?.registerTelephonyCallback(
            context.mainExecutor,
            telephonyCallback!!
        )
    }
    
    /**
     * Legacy implementation for Android 10-11 (API 29-30)
     */
    @Suppress("DEPRECATION")
    private fun startListeningLegacy() {
        phoneStateListener = object : PhoneStateListener() {
            override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                handleCallStateChange(state)
            }
        }
        
        telephonyManager?.listen(
            phoneStateListener,
            PhoneStateListener.LISTEN_CALL_STATE
        )
    }
    
    /**
     * Handle call state changes
     */
    private fun handleCallStateChange(state: Int) {
        when (state) {
            TelephonyManager.CALL_STATE_IDLE -> {
                // No call activity
                if (isCallActive) {
                    Log.i(TAG, "Call ended (IDLE)")
                    isCallActive = false
                    wasRinging = false
                    onCallEnded()
                }
            }
            
            TelephonyManager.CALL_STATE_RINGING -> {
                // Incoming call ringing
                Log.d(TAG, "Call ringing")
                wasRinging = true
            }
            
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                // Call is active (answered or outgoing)
                if (!isCallActive) {
                    if (wasRinging) {
                        Log.i(TAG, "Incoming call answered (OFFHOOK)")
                    } else {
                        Log.i(TAG, "Outgoing call started (OFFHOOK)")
                    }
                    isCallActive = true
                    onCallStarted()
                }
            }
        }
    }
    
    /**
     * Check if a call is currently active
     */
    fun isCallActive(): Boolean {
        return isCallActive
    }
}
