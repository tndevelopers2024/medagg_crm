package com.callerapp

import android.content.Context
import android.media.MediaScannerConnection
import android.os.Build
import android.os.Environment
import android.util.Log
import java.io.File
import kotlin.math.abs

class SystemCallRecordingFinder(private val context: Context) {

    companion object {
        private const val TAG = "SystemRecordingFinder"
        private const val DEFAULT_TOLERANCE_MS = 120000L // 120 seconds — OEM dialers can have significant write delays
    }

    /**
     * Get all possible recording directory paths based on manufacturer
     */
    private fun getRecordingDirectories(): List<File> {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()
        val basePath = Environment.getExternalStorageDirectory().absolutePath

        val directories = mutableListOf<String>()

        // Samsung
        if (manufacturer.contains("samsung")) {
            directories.addAll(listOf(
                "$basePath/Call",
                "$basePath/Recordings/Call",
                "$basePath/PhoneRecord",
                "$basePath/Voice Recorder"
            ))
        }

        // Xiaomi
        if (manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco")) {
            directories.addAll(listOf(
                "$basePath/MIUI/sound_recorder/call_rec",
                "$basePath/Recordings/Call",
                "$basePath/sound_recorder/call_rec"
            ))
        }

        // OnePlus
        if (manufacturer.contains("oneplus")) {
            directories.addAll(listOf(
                "$basePath/Recordings/CallRecordings",
                "$basePath/Record/Call"
            ))
        }

        // Oppo/Realme
        if (manufacturer.contains("oppo") || manufacturer.contains("realme")) {
            directories.addAll(listOf(
                "$basePath/Recordings/CallRecordings",
                "$basePath/Record",
                "$basePath/Recordings"
            ))
        }

        // Vivo
        if (manufacturer.contains("vivo")) {
            directories.addAll(listOf(
                "$basePath/Record",
                "$basePath/Recordings",
                "$basePath/PhoneRecord"
            ))
        }

        // Google Pixel
        if (manufacturer.contains("google")) {
            directories.addAll(listOf(
                "$basePath/Recordings/Call Recordings",
                "$basePath/Recordings"
            ))
        }

        // Motorola
        if (manufacturer.contains("motorola") || manufacturer.contains("moto")) {
            directories.addAll(listOf(
                "$basePath/Recordings",
                "$basePath/Call Recordings"
            ))
        }

        // Huawei / Honor
        if (manufacturer.contains("huawei") || brand.contains("honor")) {
            directories.addAll(listOf(
                "$basePath/Sounds/CallRecord",
                "$basePath/record",
                "$basePath/Recordings/Call Recordings",
                "$basePath/Recordings"
            ))
        }

        // Tecno / Infinix / Itel (Transsion brands)
        if (manufacturer.contains("tecno") || manufacturer.contains("infinix") || manufacturer.contains("itel") || brand.contains("transsion")) {
            directories.addAll(listOf(
                "$basePath/Transsion/CallRecorder",
                "$basePath/Recording",
                "$basePath/CallRecording",
                "$basePath/Recordings"
            ))
        }

        // Nothing
        if (manufacturer.contains("nothing")) {
            directories.addAll(listOf(
                "$basePath/Recordings/Call recordings",
                "$basePath/Recordings/Call Recordings",
                "$basePath/Recordings"
            ))
        }

        // Asus
        if (manufacturer.contains("asus")) {
            directories.addAll(listOf(
                "$basePath/Recordings",
                "$basePath/CallRecording"
            ))
        }

        // Lava / Micromax / General Indian OEMs
        if (manufacturer.contains("lava") || manufacturer.contains("micromax") || manufacturer.contains("karbonn") || manufacturer.contains("intex")) {
            directories.addAll(listOf(
                "$basePath/CallRecording",
                "$basePath/PhoneCallRecords",
                "$basePath/Recordings"
            ))
        }

        // Generic fallback directories (checked for all devices)
        directories.addAll(listOf(
            "$basePath/Recordings",
            "$basePath/Recordings/Call recordings",
            "$basePath/Recordings/Call Recordings",
            "$basePath/CallRecordings",
            "$basePath/CallRecording",
            "$basePath/Call",
            "$basePath/Audio/Calls",
            "$basePath/Music/Recordings",
            "$basePath/PhoneCallRecords",
            "$basePath/Record",
            "$basePath/Recording"
        ))

        // Convert to File objects and filter existing directories
        return directories
            .distinct()
            .map { File(it) }
            .filter { it.exists() && it.isDirectory }
            .also {
                Log.i(TAG, "Found ${it.size} recording directories")
                it.forEach { dir -> Log.d(TAG, "  - ${dir.absolutePath}") }
            }
    }

    /**
     * Trigger MediaStore scan on known recording directories so newly saved files are indexed
     */
    fun triggerMediaScan(callback: (() -> Unit)? = null) {
        val dirs = getRecordingDirectories()
        if (dirs.isEmpty()) {
            callback?.invoke()
            return
        }

        // Collect all audio files in recording directories (including subdirectories)
        val filePaths = mutableListOf<String>()
        for (dir in dirs) {
            collectAudioFiles(dir, filePaths, maxDepth = 3)
        }

        if (filePaths.isEmpty()) {
            Log.d(TAG, "No audio files to scan")
            callback?.invoke()
            return
        }

        Log.i(TAG, "Triggering MediaStore scan for ${filePaths.size} files")

        val pathsArray = filePaths.toTypedArray()
        var scannedCount = 0

        MediaScannerConnection.scanFile(
            context,
            pathsArray,
            null
        ) { _, _ ->
            scannedCount++
            if (scannedCount >= pathsArray.size) {
                Log.i(TAG, "MediaStore scan complete for ${pathsArray.size} files")
                callback?.invoke()
            }
        }
    }

    /**
     * Collect audio files recursively from a directory
     */
    private fun collectAudioFiles(dir: File, result: MutableList<String>, maxDepth: Int, currentDepth: Int = 0) {
        if (currentDepth > maxDepth) return

        val files = dir.listFiles() ?: return
        for (file in files) {
            if (file.isDirectory && currentDepth < maxDepth) {
                collectAudioFiles(file, result, maxDepth, currentDepth + 1)
            } else if (file.isFile && file.extension.lowercase() in AUDIO_EXTENSIONS) {
                result.add(file.absolutePath)
            }
        }
    }

    /**
     * Find recording file for a specific call
     * First tries file system, then falls back to MediaStore
     */
    fun findRecordingForCall(
        phoneNumber: String,
        callTimestamp: Long,
        toleranceMs: Long = DEFAULT_TOLERANCE_MS
    ): String? {
        Log.i(TAG, "Searching for recording: number=$phoneNumber, time=$callTimestamp, tolerance=${toleranceMs}ms")

        // Try file system first (includes recursive subdirectory scan)
        val fileSystemResult = findRecordingInFileSystem(phoneNumber, callTimestamp, toleranceMs)
        if (fileSystemResult != null) {
            Log.i(TAG, "✓ Found via file system: $fileSystemResult")
            return fileSystemResult
        }

        // Fallback to MediaStore
        Log.i(TAG, "File system search failed, trying MediaStore...")
        val mediaStoreResult = MediaStoreRecordingFinder(context).findRecordingForCall(
            phoneNumber, callTimestamp, toleranceMs
        )
        if (mediaStoreResult != null) {
            Log.i(TAG, "✓ Found via MediaStore: $mediaStoreResult")
            return mediaStoreResult
        }

        Log.w(TAG, "✗ No recording found in file system or MediaStore")
        return null
    }

    /**
     * Find recording in file system directories (with recursive subdirectory scanning)
     */
    private fun findRecordingInFileSystem(
        phoneNumber: String,
        callTimestamp: Long,
        toleranceMs: Long
    ): String? {
        val recordingDirs = getRecordingDirectories()
        if (recordingDirs.isEmpty()) {
            Log.w(TAG, "No recording directories found")
            return null
        }

        // Normalize phone number (last 10 digits)
        val normalizedNumber = phoneNumber.replace(Regex("[^\\d]"), "").takeLast(10)
        Log.d(TAG, "Normalized number: $normalizedNumber")

        var bestMatch: File? = null
        var smallestTimeDiff = Long.MAX_VALUE

        for (dir in recordingDirs) {
            // Recursively collect audio files (up to 3 levels deep for date-based subdirs)
            val files = mutableListOf<File>()
            collectAudioFilesAsFiles(dir, files, maxDepth = 3)

            Log.d(TAG, "Checking ${files.size} files in ${dir.name} (including subdirs)")

            for (file in files) {
                val timeDiff = abs(file.lastModified() - callTimestamp)

                // Check if file was created around the call time
                if (timeDiff <= toleranceMs) {
                    Log.d(TAG, "  Found file within time window: ${file.name} (${timeDiff}ms diff)")

                    // Check if filename contains phone number — perfect match
                    if (file.name.contains(normalizedNumber)) {
                        Log.i(TAG, "✓ Perfect match (number + time): ${file.absolutePath}")
                        return file.absolutePath
                    }

                    // Track best match by time
                    if (timeDiff < smallestTimeDiff) {
                        smallestTimeDiff = timeDiff
                        bestMatch = file
                    }
                }
            }
        }

        return bestMatch?.let {
            Log.i(TAG, "✓ Best time match: ${it.absolutePath} (${smallestTimeDiff}ms diff)")
            it.absolutePath
        }
    }

    /**
     * Recursively collect audio files as File objects
     */
    private fun collectAudioFilesAsFiles(dir: File, result: MutableList<File>, maxDepth: Int, currentDepth: Int = 0) {
        if (currentDepth > maxDepth) return

        val files = dir.listFiles() ?: return
        for (file in files) {
            if (file.isDirectory && currentDepth < maxDepth) {
                collectAudioFilesAsFiles(file, result, maxDepth, currentDepth + 1)
            } else if (file.isFile && file.extension.lowercase() in AUDIO_EXTENSIONS) {
                result.add(file)
            }
        }
    }

    /**
     * Find recording in a specific user-selected directory (with recursive subdirectory scan)
     */
    fun findRecordingInSpecificDirectory(
        dirPath: String,
        phoneNumber: String,
        callTimestamp: Long,
        toleranceMs: Long = DEFAULT_TOLERANCE_MS
    ): String? {
        val dir = File(dirPath)
        if (!dir.exists() || !dir.isDirectory) {
            Log.w(TAG, "User-selected directory does not exist: $dirPath")
            return null
        }

        val normalizedNumber = phoneNumber.replace(Regex("[^\\d]"), "").takeLast(10)
        Log.i(TAG, "Searching user directory: $dirPath for number=$normalizedNumber")

        val files = mutableListOf<File>()
        collectAudioFilesAsFiles(dir, files, maxDepth = 3)

        Log.d(TAG, "Found ${files.size} audio files in user directory")

        var bestMatch: File? = null
        var smallestTimeDiff = Long.MAX_VALUE

        for (file in files) {
            val timeDiff = abs(file.lastModified() - callTimestamp)

            if (timeDiff <= toleranceMs) {
                if (file.name.contains(normalizedNumber)) {
                    Log.i(TAG, "✓ Perfect match in user dir (number + time): ${file.absolutePath}")
                    return file.absolutePath
                }

                if (timeDiff < smallestTimeDiff) {
                    smallestTimeDiff = timeDiff
                    bestMatch = file
                }
            }
        }

        return bestMatch?.let {
            Log.i(TAG, "✓ Best time match in user dir: ${it.absolutePath} (${smallestTimeDiff}ms diff)")
            it.absolutePath
        }
    }

    /**
     * Check if device has any recording directories (indicates built-in recording might be available)
     */
    fun hasRecordingCapability(): Boolean {
        return getRecordingDirectories().isNotEmpty()
    }

    /**
     * Get list of all recording directories for debugging
     */
    fun getAvailableDirectories(): List<String> {
        return getRecordingDirectories().map { it.absolutePath }
    }
}

private val AUDIO_EXTENSIONS = listOf("mp3", "m4a", "aac", "amr", "3gp", "wav", "mp4", "ogg", "opus")
