package com.callerapp

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.DocumentsContract
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*

class CallRecorderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        private const val TAG = "CallRecorderModule"
        private const val PICK_FOLDER_REQUEST_CODE = 9999
    }

    private var folderPickerPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "CallRecorderModule"

    override fun onNewIntent(intent: Intent) {}

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != PICK_FOLDER_REQUEST_CODE) return
        val promise = folderPickerPromise ?: return
        folderPickerPromise = null

        if (resultCode != Activity.RESULT_OK || data?.data == null) {
            promise.resolve(null)
            return
        }

        val treeUri = data.data!!
        val realPath = getFilePathFromTreeUri(treeUri)
        if (realPath != null) {
            Log.i(TAG, "User picked recording folder: $realPath")
            promise.resolve(realPath)
        } else {
            Log.w(TAG, "Could not resolve real path from tree URI: $treeUri")
            promise.resolve(null)
        }
    }

    private fun getFilePathFromTreeUri(treeUri: Uri): String? {
        try {
            val docId = DocumentsContract.getTreeDocumentId(treeUri)
            // Primary storage: "primary:path/to/folder"
            val parts = docId.split(":")
            if (parts.size >= 2) {
                val storageType = parts[0]
                val relativePath = parts[1]
                return if (storageType.equals("primary", ignoreCase = true)) {
                    "${Environment.getExternalStorageDirectory().absolutePath}/$relativePath"
                } else {
                    // External SD card
                    "/storage/$storageType/$relativePath"
                }
            } else if (parts.size == 1 && parts[0].equals("primary", ignoreCase = true)) {
                return Environment.getExternalStorageDirectory().absolutePath
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing tree URI: ${e.message}", e)
        }
        return null
    }
    
    /**
     * Start monitoring calls (starts foreground service)
     */
    @ReactMethod
    fun startMonitoring(promise: Promise) {
        try {
            Log.i(TAG, "Starting call monitoring service...")
            
            // Check permissions
            if (!hasRequiredPermissions()) {
                promise.reject("PERMISSION_DENIED", "Required permissions not granted")
                return
            }
            
            // Start foreground service
            val intent = Intent(reactApplicationContext, CallRecordingForegroundService::class.java)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            
            val result = WritableNativeMap().apply {
                putBoolean("success", true)
                putString("message", "Call monitoring started")
            }
            
            promise.resolve(result)
            Log.i(TAG, "Call monitoring service started successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting monitoring: ${e.message}", e)
            promise.reject("START_FAILED", e.message, e)
        }
    }
    
    /**
     * Stop monitoring calls (stops foreground service)
     */
    @ReactMethod
    fun stopMonitoring(promise: Promise) {
        try {
            Log.i(TAG, "Stopping call monitoring service...")
            
            val intent = Intent(reactApplicationContext, CallRecordingForegroundService::class.java)
            reactApplicationContext.stopService(intent)
            
            val result = WritableNativeMap().apply {
                putBoolean("success", true)
                putString("message", "Call monitoring stopped")
            }
            
            promise.resolve(result)
            Log.i(TAG, "Call monitoring service stopped successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping monitoring: ${e.message}", e)
            promise.reject("STOP_FAILED", e.message, e)
        }
    }
    
    /**
     * Get recording status
     */
    @ReactMethod
    fun getRecordingStatus(promise: Promise) {
        try {
            val result = WritableNativeMap().apply {
                putBoolean("isServiceRunning", CallRecordingForegroundService.isRunning())
                putString("lastRecordingPath", CallRecordingForegroundService.getLastRecordingPath())
            }
            
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error getting status: ${e.message}", e)
            promise.reject("STATUS_FAILED", e.message, e)
        }
    }
    
    /**
     * Get last recording path
     */
    @ReactMethod
    fun getLastRecordingPath(promise: Promise) {
        try {
            val path = CallRecordingForegroundService.getLastRecordingPath()
            
            if (path != null) {
                val result = WritableNativeMap().apply {
                    putString("filePath", path)
                }
                promise.resolve(result)
            } else {
                promise.reject("NO_RECORDING", "No recording available")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error getting last recording: ${e.message}", e)
            promise.reject("GET_FAILED", e.message, e)
        }
    }
    
    /**
     * Get device capabilities
     */
    @ReactMethod
    fun getDeviceCapabilities(promise: Promise) {
        try {
            val capability = DeviceCapabilityDetector.detectCapabilities()
            
            val sourcesArray = WritableNativeArray().apply {
                capability.preferredSources.forEach { source ->
                    pushString(DeviceCapabilityDetector.getAudioSourceName(source))
                }
            }
            
            val result = WritableNativeMap().apply {
                putString("manufacturer", capability.manufacturer)
                putString("brand", capability.brand)
                putString("model", capability.model)
                putInt("androidVersion", capability.androidVersion)
                putBoolean("supportsVoiceCall", capability.supportsVoiceCall)
                putBoolean("requiresSpeakerFallback", capability.requiresSpeakerFallback)
                putArray("preferredSources", sourcesArray)
            }
            
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error getting capabilities: ${e.message}", e)
            promise.reject("CAPABILITY_FAILED", e.message, e)
        }
    }
    
    /**
     * Check if required permissions are granted
     */
    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            val result = WritableNativeMap().apply {
                putBoolean("hasRecordAudio", hasPermission(android.Manifest.permission.RECORD_AUDIO))
                putBoolean("hasReadPhoneState", hasPermission(android.Manifest.permission.READ_PHONE_STATE))
                putBoolean("hasAllRequired", hasRequiredPermissions())
            }
            
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error checking permissions: ${e.message}", e)
            promise.reject("PERMISSION_CHECK_FAILED", e.message, e)
        }
    }
    
    /**
     * Find system call recording for a specific call
     */
    @ReactMethod
    fun findSystemRecording(phoneNumber: String, callTimestamp: Double, promise: Promise) {
        try {
            Log.i(TAG, "Searching for system recording: $phoneNumber at $callTimestamp")
            
            val finder = SystemCallRecordingFinder(reactApplicationContext)
            val recordingPath = finder.findRecordingForCall(
                phoneNumber = phoneNumber,
                callTimestamp = callTimestamp.toLong()
            )
            
            if (recordingPath != null) {
                val result = WritableNativeMap().apply {
                    putString("filePath", recordingPath)
                    putBoolean("found", true)
                }
                promise.resolve(result)
                Log.i(TAG, "✓ System recording found: $recordingPath")
            } else {
                val result = WritableNativeMap().apply {
                    putString("filePath", null)
                    putBoolean("found", false)
                }
                promise.resolve(result)
                Log.w(TAG, "✗ No system recording found")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error finding system recording: ${e.message}", e)
            promise.reject("FIND_FAILED", e.message, e)
        }
    }
    
    /**
     * Launch Android folder picker (SAF) and return the selected directory path
     */
    @ReactMethod
    fun pickRecordingFolder(promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity")
                return
            }

            folderPickerPromise = promise
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
            activity.startActivityForResult(intent, PICK_FOLDER_REQUEST_CODE)
        } catch (e: Exception) {
            Log.e(TAG, "Error launching folder picker: ${e.message}", e)
            folderPickerPromise = null
            promise.reject("PICKER_FAILED", e.message, e)
        }
    }

    /**
     * Search ONLY the user-selected directory for a matching recording
     */
    @ReactMethod
    fun findRecordingInDirectory(dirPath: String, phoneNumber: String, callTimestamp: Double, promise: Promise) {
        try {
            Log.i(TAG, "Searching user directory: $dirPath for $phoneNumber at $callTimestamp")

            val finder = SystemCallRecordingFinder(reactApplicationContext)
            val recordingPath = finder.findRecordingInSpecificDirectory(
                dirPath = dirPath,
                phoneNumber = phoneNumber,
                callTimestamp = callTimestamp.toLong()
            )

            if (recordingPath != null) {
                val result = WritableNativeMap().apply {
                    putString("filePath", recordingPath)
                    putBoolean("found", true)
                }
                promise.resolve(result)
                Log.i(TAG, "✓ Found in user directory: $recordingPath")
            } else {
                val result = WritableNativeMap().apply {
                    putString("filePath", null)
                    putBoolean("found", false)
                }
                promise.resolve(result)
                Log.w(TAG, "✗ Not found in user directory")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error searching user directory: ${e.message}", e)
            promise.reject("DIR_SEARCH_FAILED", e.message, e)
        }
    }

    /**
     * Check if device has recording capability (has recording directories)
     */
    @ReactMethod
    fun hasSystemRecordingCapability(promise: Promise) {
        try {
            val finder = SystemCallRecordingFinder(reactApplicationContext)
            val hasCapability = finder.hasRecordingCapability()
            
            val result = WritableNativeMap().apply {
                putBoolean("hasCapability", hasCapability)
                putArray("directories", WritableNativeArray().apply {
                    finder.getAvailableDirectories().forEach { pushString(it) }
                })
            }
            
            promise.resolve(result)
            Log.i(TAG, "System recording capability: $hasCapability")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error checking capability: ${e.message}", e)
            promise.reject("CAPABILITY_CHECK_FAILED", e.message, e)
        }
    }
    
    /**
     * Get all system call recordings
     */
    @ReactMethod
    fun getAllRecordings(promise: Promise) {
        try {
            Log.i(TAG, "Getting all system recordings...")
            
            val mediaStoreFinder = MediaStoreRecordingFinder(reactApplicationContext)
            val recordings = mediaStoreFinder.getRecentRecordings(100) // Get up to 100 recordings
            
            val recordingsArray = WritableNativeArray()
            recordings.forEach { path ->
                recordingsArray.pushString(path)
            }
            
            val result = WritableNativeMap().apply {
                putArray("recordings", recordingsArray)
                putInt("count", recordings.size)
            }
            
            promise.resolve(result)
            Log.i(TAG, "Found ${recordings.size} recordings")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error getting all recordings: ${e.message}", e)
            promise.reject("GET_ALL_FAILED", e.message, e)
        }
    }
    
    /**
     * Trigger MediaStore scan on known recording directories
     * Forces newly saved OEM recording files to be indexed before searching
     */
    @ReactMethod
    fun triggerMediaScan(promise: Promise) {
        try {
            Log.i(TAG, "Triggering MediaStore scan on recording directories...")

            val finder = SystemCallRecordingFinder(reactApplicationContext)
            finder.triggerMediaScan {
                Log.i(TAG, "MediaStore scan complete")
                val result = WritableNativeMap().apply {
                    putBoolean("success", true)
                }
                promise.resolve(result)
            }

            // Safety timeout — if scan callback never fires, resolve after 5s
            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    promise.resolve(WritableNativeMap().apply {
                        putBoolean("success", true)
                        putBoolean("timeout", true)
                    })
                } catch (_: Exception) {
                    // Promise already resolved by callback — ignore
                }
            }, 5000)

        } catch (e: Exception) {
            Log.e(TAG, "Error triggering MediaStore scan: ${e.message}", e)
            promise.reject("SCAN_FAILED", e.message, e)
        }
    }

    /**
     * Find system recording with native-level retry logic
     * Triggers MediaStore scan between attempts for better indexing
     * Retries: attempt 1 immediately, then at 3s, 5s, 8s intervals
     */
    @ReactMethod
    fun findSystemRecordingWithRetry(phoneNumber: String, callTimestamp: Double, maxAttempts: Int, promise: Promise) {
        try {
            Log.i(TAG, "findSystemRecordingWithRetry: $phoneNumber at $callTimestamp, maxAttempts=$maxAttempts")

            val finder = SystemCallRecordingFinder(reactApplicationContext)
            val delays = longArrayOf(0, 3000, 5000, 8000) // delays between attempts
            val attemptsToTry = maxAttempts.coerceAtMost(delays.size)
            val handler = Handler(Looper.getMainLooper())
            var resolved = false

            fun attemptFind(attemptIndex: Int) {
                if (resolved || attemptIndex >= attemptsToTry) {
                    if (!resolved) {
                        resolved = true
                        val result = WritableNativeMap().apply {
                            putString("filePath", null)
                            putBoolean("found", false)
                            putInt("attempts", attemptIndex)
                        }
                        promise.resolve(result)
                    }
                    return
                }

                val delay = delays[attemptIndex]
                Log.i(TAG, "Retry attempt ${attemptIndex + 1}/$attemptsToTry (delay=${delay}ms)")

                handler.postDelayed({
                    // Trigger MediaStore scan before searching (except first attempt)
                    if (attemptIndex > 0) {
                        finder.triggerMediaScan {
                            doSearch(finder, phoneNumber, callTimestamp.toLong(), attemptIndex, attemptsToTry) { path ->
                                if (path != null && !resolved) {
                                    resolved = true
                                    val result = WritableNativeMap().apply {
                                        putString("filePath", path)
                                        putBoolean("found", true)
                                        putInt("attempts", attemptIndex + 1)
                                    }
                                    promise.resolve(result)
                                } else {
                                    attemptFind(attemptIndex + 1)
                                }
                            }
                        }
                    } else {
                        doSearch(finder, phoneNumber, callTimestamp.toLong(), attemptIndex, attemptsToTry) { path ->
                            if (path != null && !resolved) {
                                resolved = true
                                val result = WritableNativeMap().apply {
                                    putString("filePath", path)
                                    putBoolean("found", true)
                                    putInt("attempts", attemptIndex + 1)
                                }
                                promise.resolve(result)
                            } else {
                                attemptFind(attemptIndex + 1)
                            }
                        }
                    }
                }, delay)
            }

            attemptFind(0)

        } catch (e: Exception) {
            Log.e(TAG, "Error in findSystemRecordingWithRetry: ${e.message}", e)
            promise.reject("RETRY_FIND_FAILED", e.message, e)
        }
    }

    private fun doSearch(
        finder: SystemCallRecordingFinder,
        phoneNumber: String,
        callTimestamp: Long,
        attemptIndex: Int,
        totalAttempts: Int,
        callback: (String?) -> Unit
    ) {
        val path = finder.findRecordingForCall(phoneNumber, callTimestamp)
        Log.i(TAG, "Attempt ${attemptIndex + 1}/$totalAttempts result: ${path ?: "not found"}")
        callback(path)
    }

    /**
     * Helper: Check if a specific permission is granted
     */
    private fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(
            reactApplicationContext,
            permission
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    /**
     * Helper: Check if all required permissions are granted
     */
    private fun hasRequiredPermissions(): Boolean {
        return hasPermission(android.Manifest.permission.RECORD_AUDIO) &&
               hasPermission(android.Manifest.permission.READ_PHONE_STATE)
    }
}
