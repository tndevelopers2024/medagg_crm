package com.callerapp

import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.provider.MediaStore
import android.util.Log
import kotlin.math.abs

class MediaStoreRecordingFinder(private val context: Context) {

    companion object {
        private const val TAG = "MediaStoreRecordingFinder"
        private const val DEFAULT_TOLERANCE_MS = 120000L // 120 seconds — OEM dialers can have significant write delays
    }

    /**
     * Find call recording using MediaStore ContentResolver
     * This works for recordings stored by Phone app in scoped storage
     */
    fun findRecordingForCall(
        phoneNumber: String,
        callTimestamp: Long,
        toleranceMs: Long = DEFAULT_TOLERANCE_MS
    ): String? {
        Log.i(TAG, "Searching MediaStore for recording: number=$phoneNumber, time=$callTimestamp, tolerance=${toleranceMs}ms")

        val normalizedNumber = phoneNumber.replace(Regex("[^\\d]"), "").takeLast(10)
        Log.d(TAG, "Normalized number: $normalizedNumber")

        // Query MediaStore for audio files
        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.DATA,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.DATE_ADDED,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.SIZE
        )

        // Sort by date added descending to get recent files first
        val sortOrder = "${MediaStore.Audio.Media.DATE_ADDED} DESC"

        var cursor: Cursor? = null
        try {
            cursor = context.contentResolver.query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                projection,
                null,
                null,
                sortOrder
            )

            if (cursor == null || cursor.count == 0) {
                Log.w(TAG, "No audio files found in MediaStore")
                return null
            }

            Log.d(TAG, "Found ${cursor.count} audio files in MediaStore")

            val dataColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
            val displayNameColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
            val titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
            val dateAddedColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
            val durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
            val sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)

            var bestCallMatch: String? = null
            var bestCallTimeDiff = Long.MAX_VALUE
            var bestAnyMatch: String? = null
            var bestAnyTimeDiff = Long.MAX_VALUE
            var checkedCount = 0
            val maxToCheck = 100 // Check recent 100 files for broader coverage

            while (cursor.moveToNext() && checkedCount < maxToCheck) {
                checkedCount++

                val filePath = cursor.getString(dataColumn)
                val displayName = cursor.getString(displayNameColumn)
                val title = cursor.getString(titleColumn)
                val dateAdded = cursor.getLong(dateAddedColumn) * 1000 // Convert to milliseconds
                val duration = cursor.getLong(durationColumn)
                val size = cursor.getLong(sizeColumn)

                // Skip if file is too small (likely not a call recording)
                if (size < 1024) { // Less than 1KB
                    continue
                }

                // Broader keyword matching — OEM dialers use various naming conventions
                val looksLikeCallRecording = listOf(displayName, title, filePath).any { field ->
                    field != null && listOf("call", "record", "voice", "rec", "phone").any { keyword ->
                        field.contains(keyword, ignoreCase = true)
                    }
                }

                // Calculate time difference
                val timeDiff = abs(dateAdded - callTimestamp)

                if (timeDiff <= toleranceMs) {
                    Log.d(TAG, "  Found file within time window:")
                    Log.d(TAG, "    Path: $filePath")
                    Log.d(TAG, "    Name: $displayName")
                    Log.d(TAG, "    Time diff: ${timeDiff}ms")
                    Log.d(TAG, "    Duration: ${duration}ms")
                    Log.d(TAG, "    Looks like call: $looksLikeCallRecording")

                    // Perfect match: time + looks like call recording + contains phone number
                    if (looksLikeCallRecording &&
                        (displayName?.contains(normalizedNumber) == true ||
                         title?.contains(normalizedNumber) == true)) {
                        Log.i(TAG, "✓ Perfect match (time + call + number): $filePath")
                        return filePath
                    }

                    // Good match: time + looks like call recording
                    if (looksLikeCallRecording && timeDiff < bestCallTimeDiff) {
                        bestCallTimeDiff = timeDiff
                        bestCallMatch = filePath
                    }

                    // Fallback: any audio file within time window (some OEM dialers don't use "call" in filename)
                    if (timeDiff < bestAnyTimeDiff) {
                        bestAnyTimeDiff = timeDiff
                        bestAnyMatch = filePath
                    }
                }
            }

            // Prefer call-looking match, fall back to any audio match
            val result = bestCallMatch ?: bestAnyMatch
            return result?.let {
                val diffMs = if (bestCallMatch != null) bestCallTimeDiff else bestAnyTimeDiff
                val matchType = if (bestCallMatch != null) "call keyword" else "time-only fallback"
                Log.i(TAG, "✓ Best match ($matchType): $it (${diffMs}ms diff)")
                it
            } ?: run {
                Log.w(TAG, "✗ No recording found within ${toleranceMs}ms of call")
                null
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error querying MediaStore: ${e.message}", e)
            return null
        } finally {
            cursor?.close()
        }
    }

    /**
     * Get all recent call recordings (for debugging)
     */
    fun getRecentRecordings(limit: Int = 10): List<String> {
        val recordings = mutableListOf<String>()

        val projection = arrayOf(
            MediaStore.Audio.Media.DATA,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.DATE_ADDED
        )

        val sortOrder = "${MediaStore.Audio.Media.DATE_ADDED} DESC LIMIT $limit"

        var cursor: Cursor? = null
        try {
            cursor = context.contentResolver.query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                projection,
                null,
                null,
                sortOrder
            )

            if (cursor != null) {
                val dataColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
                val nameColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)

                while (cursor.moveToNext()) {
                    val path = cursor.getString(dataColumn)
                    val name = cursor.getString(nameColumn)

                    if (listOf("call", "record", "voice", "rec", "phone").any { keyword ->
                        (name?.contains(keyword, ignoreCase = true) == true) ||
                        (path?.contains(keyword, ignoreCase = true) == true)
                    }) {
                        recordings.add(path)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting recent recordings: ${e.message}", e)
        } finally {
            cursor?.close()
        }

        return recordings
    }
}
