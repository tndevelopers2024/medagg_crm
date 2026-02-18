package com.callerapp

import android.os.Build

object DeviceCapabilityDetector {
    
    data class DeviceCapability(
        val manufacturer: String,
        val brand: String,
        val model: String,
        val androidVersion: Int,
        val preferredSources: List<Int>,
        val supportsVoiceCall: Boolean,
        val requiresSpeakerFallback: Boolean
    )
    
    fun detectCapabilities(): DeviceCapability {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()
        val model = Build.MODEL
        val androidVersion = Build.VERSION.SDK_INT
        
        // Determine preferred audio sources based on OEM
        val (preferredSources, supportsVoiceCall, requiresSpeakerFallback) = when {
            // Samsung devices - excellent VOICE_CALL support
            manufacturer.contains("samsung") -> {
                Triple(
                    listOf(4, 7, 1), // VOICE_CALL, VOICE_COMMUNICATION, MIC
                    true,
                    false
                )
            }
            
            // Xiaomi/Redmi - good VOICE_CALL support on newer models
            manufacturer.contains("xiaomi") || brand.contains("redmi") -> {
                if (androidVersion >= 29) { // Android 10+
                    Triple(listOf(4, 7, 1), true, false)
                } else {
                    Triple(listOf(7, 1), false, true)
                }
            }
            
            // Oppo/Realme - mixed support
            manufacturer.contains("oppo") || brand.contains("realme") -> {
                Triple(listOf(7, 1), false, true)
            }
            
            // Vivo - limited VOICE_CALL support
            manufacturer.contains("vivo") -> {
                Triple(listOf(7, 1), false, true)
            }
            
            // OnePlus - good support
            manufacturer.contains("oneplus") -> {
                Triple(listOf(4, 7, 1), true, false)
            }
            
            // Google Pixel - excellent support
            manufacturer.contains("google") -> {
                Triple(listOf(4, 7, 1), true, false)
            }
            
            // Motorola - good support
            manufacturer.contains("motorola") -> {
                Triple(listOf(4, 7, 1), true, false)
            }
            
            // Default for unknown manufacturers
            else -> {
                Triple(listOf(7, 1), false, true)
            }
        }
        
        return DeviceCapability(
            manufacturer = manufacturer,
            brand = brand,
            model = model,
            androidVersion = androidVersion,
            preferredSources = preferredSources,
            supportsVoiceCall = supportsVoiceCall,
            requiresSpeakerFallback = requiresSpeakerFallback
        )
    }
    
    fun getAudioSourceName(source: Int): String {
        return when (source) {
            1 -> "MIC"
            4 -> "VOICE_CALL"
            7 -> "VOICE_COMMUNICATION"
            else -> "UNKNOWN_$source"
        }
    }
    
    fun logDeviceInfo(): String {
        val capability = detectCapabilities()
        return """
            Device Capability Report:
            - Manufacturer: ${capability.manufacturer}
            - Brand: ${capability.brand}
            - Model: ${capability.model}
            - Android Version: ${capability.androidVersion}
            - Supports VOICE_CALL: ${capability.supportsVoiceCall}
            - Requires Speaker Fallback: ${capability.requiresSpeakerFallback}
            - Preferred Sources: ${capability.preferredSources.joinToString { getAudioSourceName(it) }}
        """.trimIndent()
    }
}
