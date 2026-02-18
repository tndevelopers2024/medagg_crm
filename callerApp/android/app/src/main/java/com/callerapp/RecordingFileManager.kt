package com.callerapp

import android.content.Context
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class RecordingFileManager(private val context: Context) {
    
    companion object {
        private const val TAG = "RecordingFileManager"
        private const val RECORDINGS_DIR = "Recordings"
        private const val FILE_EXTENSION = ".mp3"
        private const val MAX_AGE_DAYS = 30
    }
    
    private val recordingsDir: File by lazy {
        val dir = File(context.getExternalFilesDir(null), RECORDINGS_DIR)
        if (!dir.exists()) {
            dir.mkdirs()
        }
        dir
    }
    
    /**
     * Generate a new recording filename with timestamp
     */
    fun generateFilename(): String {
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault())
            .format(Date())
        return "call_$timestamp$FILE_EXTENSION"
    }
    
    /**
     * Get the full path for a new recording
     */
    fun getNewRecordingPath(): String {
        val filename = generateFilename()
        return File(recordingsDir, filename).absolutePath
    }
    
    /**
     * Get file metadata
     */
    data class RecordingMetadata(
        val path: String,
        val filename: String,
        val sizeBytes: Long,
        val createdAt: Long,
        val durationSeconds: Int = 0
    )
    
    /**
     * Get metadata for a recording file
     */
    fun getMetadata(filePath: String): RecordingMetadata? {
        val file = File(filePath)
        if (!file.exists()) return null
        
        return RecordingMetadata(
            path = filePath,
            filename = file.name,
            sizeBytes = file.length(),
            createdAt = file.lastModified()
        )
    }
    
    /**
     * List all recordings
     */
    fun listAllRecordings(): List<RecordingMetadata> {
        return recordingsDir.listFiles()
            ?.filter { it.isFile && it.name.endsWith(FILE_EXTENSION) }
            ?.mapNotNull { file ->
                RecordingMetadata(
                    path = file.absolutePath,
                    filename = file.name,
                    sizeBytes = file.length(),
                    createdAt = file.lastModified()
                )
            }
            ?.sortedByDescending { it.createdAt }
            ?: emptyList()
    }
    
    /**
     * Delete a specific recording
     */
    fun deleteRecording(filePath: String): Boolean {
        return try {
            val file = File(filePath)
            if (file.exists()) {
                val deleted = file.delete()
                if (deleted) {
                    Log.d(TAG, "Deleted recording: $filePath")
                }
                deleted
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error deleting recording: ${e.message}")
            false
        }
    }
    
    /**
     * Clean up old recordings (older than MAX_AGE_DAYS)
     */
    fun cleanupOldRecordings(): Int {
        val cutoffTime = System.currentTimeMillis() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000L)
        var deletedCount = 0
        
        recordingsDir.listFiles()
            ?.filter { it.isFile && it.lastModified() < cutoffTime }
            ?.forEach { file ->
                try {
                    if (file.delete()) {
                        deletedCount++
                        Log.d(TAG, "Auto-deleted old recording: ${file.name}")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error deleting old file: ${e.message}")
                }
            }
        
        if (deletedCount > 0) {
            Log.i(TAG, "Cleaned up $deletedCount old recordings")
        }
        
        return deletedCount
    }
    
    /**
     * Get total storage used by recordings
     */
    fun getTotalStorageUsed(): Long {
        return recordingsDir.listFiles()
            ?.filter { it.isFile }
            ?.sumOf { it.length() }
            ?: 0L
    }
    
    /**
     * Format bytes to human-readable size
     */
    fun formatFileSize(bytes: Long): String {
        return when {
            bytes < 1024 -> "$bytes B"
            bytes < 1024 * 1024 -> "${bytes / 1024} KB"
            else -> "${bytes / (1024 * 1024)} MB"
        }
    }
}
