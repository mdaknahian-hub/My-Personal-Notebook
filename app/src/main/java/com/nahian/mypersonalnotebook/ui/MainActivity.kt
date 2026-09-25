package com.nahian.mypersonalnotebook.ui

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import android.content.pm.PackageManager
import com.nahian.mypersonalnotebook.data.LocationPoint
import com.nahian.mypersonalnotebook.data.LocationReminder
import com.nahian.mypersonalnotebook.data.LocationReminderRepository
import com.nahian.mypersonalnotebook.data.NotebookContentRepository
import com.nahian.mypersonalnotebook.data.OperationResult
import com.nahian.mypersonalnotebook.data.ReminderDatabase
import com.nahian.mypersonalnotebook.domain.ReminderRules
import com.nahian.mypersonalnotebook.notifications.ReminderNotifications
import com.nahian.mypersonalnotebook.ui.theme.NotebookTheme
import java.util.UUID
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val repository = LocationReminderRepository(applicationContext, ReminderDatabase.get(applicationContext))
        val contentRepository = NotebookContentRepository(applicationContext)
        val initialReminderId = intent.getStringExtra(EXTRA_REMINDER_ID)
        setContent {
            NotebookTheme {
                NotebookAppRoot(
                    locationRepository = repository,
                    contentRepository = contentRepository,
                    initialReminderId = initialReminderId,
                )
            }
        }
    }

    companion object {
        const val EXTRA_REMINDER_ID = "open_location_reminder_id"
    }
}

@Composable
internal fun LocationReminderApp(
    repository: LocationReminderRepository,
    initialReminderId: String?,
    onExit: () -> Unit,
) {
    val context = LocalContext.current
    val activity = context as? ComponentActivity
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val reminders by repository.observeReminders().collectAsState(initial = emptyList())
    val savedLocations by repository.observeSavedLocations().collectAsState(initial = emptyList())
    val snackbarHostState = remember { SnackbarHostState() }

    var permissionRevision by remember { mutableIntStateOf(0) }
    var locationRequestCount by remember {
        mutableIntStateOf(context.getSharedPreferences(PREFS_PERMISSIONS, 0).getInt(KEY_LOCATION_REQUEST_COUNT, 0))
    }
    var backgroundRequestCount by remember {
        mutableIntStateOf(context.getSharedPreferences(PREFS_PERMISSIONS, 0).getInt(KEY_BACKGROUND_REQUEST_COUNT, 0))
    }
    var notificationRequestCount by remember {
        mutableIntStateOf(context.getSharedPreferences(PREFS_PERMISSIONS, 0).getInt(KEY_NOTIFICATION_REQUEST_COUNT, 0))
    }
    var permissionDialog by remember { mutableStateOf<PermissionIssue?>(null) }
    var draft by remember { mutableStateOf<ReminderDraft?>(null) }
    var pickerMode by remember { mutableStateOf<PickerMode?>(null) }
    var pickerInitial by remember { mutableStateOf<LocationPoint?>(null) }
    var pickerTab by remember { mutableIntStateOf(0) }
    var isSaving by remember { mutableStateOf(false) }
    var reminderToDelete by remember { mutableStateOf<LocationReminder?>(null) }

    BackHandler(enabled = true) {
        when {
            pickerMode != null -> pickerMode = null
            draft != null -> draft = null
            else -> onExit()
        }
    }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        permissionRevision++
        permissionDialog = if (granted) null else activity?.let {
            PermissionSupport.firstIssue(it, locationRequestCount, backgroundRequestCount, notificationRequestCount)
        }
    }
    val foregroundLocationLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        permissionRevision++
        permissionDialog = if (result[Manifest.permission.ACCESS_FINE_LOCATION] == true) null else activity?.let {
            PermissionSupport.firstIssue(it, locationRequestCount, backgroundRequestCount, notificationRequestCount)
        }
    }
    val backgroundLocationLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        permissionRevision++
        permissionDialog = if (granted) null else activity?.let {
            PermissionSupport.firstIssue(it, locationRequestCount, backgroundRequestCount, notificationRequestCount)
        }
    }

    val currentPermissionIssue = remember(permissionRevision, locationRequestCount, backgroundRequestCount, notificationRequestCount, activity) {
        activity?.let { PermissionSupport.firstIssue(it, locationRequestCount, backgroundRequestCount, notificationRequestCount) }
    }
    val batteryExempt = remember(permissionRevision) { PermissionSupport.batteryOptimizationIsExempt(context) }
    val latestActivity by rememberUpdatedState(activity)
    val latestLocationRequestCount by rememberUpdatedState(locationRequestCount)
    val latestBackgroundRequestCount by rememberUpdatedState(backgroundRequestCount)
    val latestNotificationRequestCount by rememberUpdatedState(notificationRequestCount)

    DisposableEffect(lifecycleOwner, repository) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                permissionRevision++
                scope.launch {
                    val currentActivity = latestActivity
                    if (currentActivity != null) {
                        val issue = PermissionSupport.firstIssue(
                            currentActivity,
                            latestLocationRequestCount,
                            latestBackgroundRequestCount,
                            latestNotificationRequestCount,
                        )
                        if (issue == null) repository.retryPendingRegistrations()
                        else repository.markActiveRemindersUnregistered(issue.explanation)
                    }
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    var initialNavigationHandled by remember(initialReminderId) { mutableStateOf(false) }
    LaunchedEffect(initialReminderId, reminders) {
        if (initialReminderId != null && !initialNavigationHandled) {
            val requestedReminder = reminders.firstOrNull { it.id == initialReminderId }
            if (requestedReminder != null) {
                draft = requestedReminder.toDraft()
                pickerMode = null
                initialNavigationHandled = true
            }
        }
    }

    fun tellUser(message: String) {
        scope.launch { snackbarHostState.showSnackbar(message) }
    }

    fun showCurrentIssue(foregroundOnly: Boolean = false) {
        permissionRevision++
        permissionDialog = activity?.let {
            PermissionSupport.firstIssue(
                it,
                locationRequestCount,
                backgroundRequestCount,
                notificationRequestCount,
                foregroundOnly = foregroundOnly,
            )
        } ?: PermissionIssue(
            PermissionIssueType.FOREGROUND_LOCATION,
            "Location permission required",
            "Allow precise location to choose a current location.",
            "Continue",
        )
    }

    fun openSettingsFor(issue: PermissionIssue) {
        val settingsIntent = when (issue.type) {
            PermissionIssueType.NOTIFICATION_SETTINGS -> Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) putExtra(Settings.EXTRA_CHANNEL_ID, ReminderNotifications.CHANNEL_ID)
            }
            PermissionIssueType.FOREGROUND_LOCATION_SETTINGS,
            PermissionIssueType.BACKGROUND_LOCATION_SETTINGS,
            -> appDetailsIntent(context.packageName)
            PermissionIssueType.BACKGROUND_LOCATION_RUNTIME -> null
            PermissionIssueType.LOCATION_SERVICES -> Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
            PermissionIssueType.GOOGLE_PLAY_SERVICES -> appDetailsIntent("com.google.android.gms")
            PermissionIssueType.NOTIFICATION_PERMISSION,
            PermissionIssueType.FOREGROUND_LOCATION,
            -> null
        }
        if (settingsIntent == null) return
        try {
            activity?.startActivity(settingsIntent)
        } catch (_: Exception) {
            try {
                activity?.startActivity(appDetailsIntent(context.packageName))
            } catch (_: Exception) {
                tellUser("Open Android Settings and update this app's permissions.")
            }
        }
    }

    fun performPermissionAction(issue: PermissionIssue) {
        permissionDialog = null
        when (issue.type) {
            PermissionIssueType.NOTIFICATION_PERMISSION -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    notificationRequestCount++
                    context.getSharedPreferences(PREFS_PERMISSIONS, 0).edit().putInt(KEY_NOTIFICATION_REQUEST_COUNT, notificationRequestCount).apply()
                    notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
            }
            PermissionIssueType.FOREGROUND_LOCATION -> {
                locationRequestCount++
                context.getSharedPreferences(PREFS_PERMISSIONS, 0).edit().putInt(KEY_LOCATION_REQUEST_COUNT, locationRequestCount).apply()
                foregroundLocationLauncher.launch(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION))
            }
            PermissionIssueType.BACKGROUND_LOCATION_RUNTIME -> {
                backgroundRequestCount++
                context.getSharedPreferences(PREFS_PERMISSIONS, 0).edit().putInt(KEY_BACKGROUND_REQUEST_COUNT, backgroundRequestCount).apply()
                backgroundLocationLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            }
            PermissionIssueType.NOTIFICATION_SETTINGS,
            PermissionIssueType.FOREGROUND_LOCATION_SETTINGS,
            PermissionIssueType.BACKGROUND_LOCATION_SETTINGS,
            PermissionIssueType.LOCATION_SERVICES,
            PermissionIssueType.GOOGLE_PLAY_SERVICES,
            -> openSettingsFor(issue)
        }
    }

    fun createNewReminder() {
        draft = ReminderDraft(id = UUID.randomUUID().toString())
        pickerMode = null
    }

    fun launchPicker(initial: LocationPoint?, tab: Int, preview: Boolean) {
        pickerInitial = initial
        pickerTab = tab
        pickerMode = if (preview) PickerMode.PREVIEW else PickerMode.EDIT
    }

    fun saveDraft(value: ReminderDraft) {
        val customInterval = value.customIntervalText.toIntOrNull() ?: 0
        val error = ReminderRules.validate(
            title = value.title.trim(),
            message = value.message.trim(),
            latitude = value.latitude,
            longitude = value.longitude,
            radiusMeters = value.radiusMeters,
            triggerType = value.triggerType,
            recurrenceType = value.recurrenceType,
            customIntervalDays = customInterval,
        )
        if (error != null) {
            tellUser(error)
            return
        }
        if (value.enabled) {
            val issue = activity?.let { PermissionSupport.firstIssue(it, locationRequestCount, backgroundRequestCount, notificationRequestCount) }
            if (issue != null) {
                permissionDialog = issue
                return
            }
        }
        isSaving = true
        val now = System.currentTimeMillis()
        val reminder = LocationReminder(
            id = value.id,
            title = value.title.trim(),
            message = value.message.trim(),
            latitude = value.latitude ?: Double.NaN,
            longitude = value.longitude ?: Double.NaN,
            radiusMeters = value.radiusMeters,
            triggerType = value.triggerType,
            recurrenceType = value.recurrenceType,
            enabled = value.enabled,
            notificationId = value.notificationId,
            createdAt = value.createdAt.takeIf { it > 0 } ?: now,
            updatedAt = now,
            lastTriggeredAt = value.lastTriggeredAt,
            lastTransitionType = value.lastTransitionType,
            customIntervalDays = customInterval,
        )
        scope.launch {
            when (val result = repository.saveReminder(reminder)) {
                OperationResult.Success -> {
                    draft = null
                    tellUser("Reminder saved${if (value.enabled) " and registered with Android" else " as disabled"}.")
                }
                is OperationResult.Warning -> {
                    draft = null
                    tellUser(result.message)
                }
                is OperationResult.Error -> tellUser(result.message)
            }
            isSaving = false
        }
    }

    Box(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing)) {
        when {
            pickerMode != null -> {
                LocationPickerScreen(
                    initialLocation = pickerInitial,
                    initialTab = pickerTab,
                    savedLocations = savedLocations,
                    previewOnly = pickerMode == PickerMode.PREVIEW,
                    onCancel = { pickerMode = null },
                    onUse = { point ->
                        if (pickerMode == PickerMode.EDIT) {
                            draft = draft?.copy(locationName = point.label, latitude = point.latitude, longitude = point.longitude)
                        }
                        pickerMode = null
                    },
                    onSaveLocation = { label, latitude, longitude ->
                        scope.launch {
                            when (val result = repository.saveLocation(label, latitude, longitude)) {
                                OperationResult.Success -> tellUser("Saved location added on this device.")
                                is OperationResult.Warning -> tellUser(result.message)
                                is OperationResult.Error -> tellUser(result.message)
                            }
                        }
                    },
                    onDeleteSavedLocation = { id -> scope.launch { repository.deleteSavedLocation(id); tellUser("Saved location deleted.") } },
                    onRequestLocationPermission = { showCurrentIssue(foregroundOnly = true) },
                )
            }
            draft != null -> {
                val currentDraft = draft!!
                ReminderEditorScreen(
                    draft = currentDraft,
                    isSaving = isSaving,
                    onChange = { draft = it },
                    onChooseLocation = {
                        val point = currentDraft.asLocationPoint()
                        launchPicker(point, tab = 0, preview = false)
                    },
                    onSave = { saveDraft(currentDraft) },
                    onCancel = { draft = null },
                )
            }
            else -> {
                LocationReminderListScreen(
                    reminders = reminders,
                    permissionIssue = currentPermissionIssue,
                    batteryOptimizationExempt = batteryExempt,
                    onCreate = ::createNewReminder,
                    onBack = onExit,
                    onSetupPermissions = { showCurrentIssue() },
                    onOpenBatterySettings = {
                        try {
                            activity?.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
                        } catch (_: Exception) {
                            tellUser("Open Android Settings → Apps → My Personal Notebook → Battery.")
                        }
                    },
                    onEdit = { reminder -> draft = reminder.toDraft() },
                    onToggle = { reminder, enabled ->
                        if (enabled) {
                            val issue = activity?.let { PermissionSupport.firstIssue(it, locationRequestCount, backgroundRequestCount, notificationRequestCount) }
                            if (issue != null) permissionDialog = issue
                            else scope.launch { showOperationResult(repository.setEnabled(reminder.id, true), ::tellUser) }
                        } else {
                            scope.launch { showOperationResult(repository.setEnabled(reminder.id, false), ::tellUser) }
                        }
                    },
                    onTest = { reminder ->
                        val notificationIssue = notificationOnlyIssue(context, activity, notificationRequestCount)
                        if (notificationIssue != null) permissionDialog = notificationIssue
                        else scope.launch { showOperationResult(repository.testNotification(reminder.id), ::tellUser) }
                    },
                    onOpenMap = { reminder ->
                        launchPicker(LocationPoint(reminder.title, reminder.latitude, reminder.longitude), tab = 1, preview = true)
                    },
                    onDelete = { reminderToDelete = it },
                )
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }

    permissionDialog?.let { issue ->
        AlertDialog(
            onDismissRequest = { permissionDialog = null },
            title = { Text(issue.title) },
            text = { Text(issue.explanation) },
            confirmButton = {
                Button(onClick = { performPermissionAction(issue) }) { Text(issue.actionLabel) }
            },
            dismissButton = { TextButton(onClick = { permissionDialog = null }) { Text("Not now") } },
        )
    }

    reminderToDelete?.let { reminder ->
        AlertDialog(
            onDismissRequest = { reminderToDelete = null },
            title = { Text("Delete reminder?") },
            text = { Text("“${reminder.title}” and its Android geofence will be removed from this device.") },
            confirmButton = {
                Button(onClick = {
                    reminderToDelete = null
                    scope.launch {
                        repository.deleteReminder(reminder.id)
                        tellUser("Reminder deleted.")
                    }
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { reminderToDelete = null }) { Text("Cancel") } },
        )
    }
}

private enum class PickerMode { EDIT, PREVIEW }

private fun appDetailsIntent(packageName: String) = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
    data = Uri.fromParts("package", packageName, null)
}

private fun notificationOnlyIssue(
    context: android.content.Context,
    activity: ComponentActivity?,
    requestCount: Int,
): PermissionIssue? {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
        val permanentlyDenied = activity != null && requestCount >= 2 &&
            !activity.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)
        return PermissionIssue(
            if (permanentlyDenied) PermissionIssueType.NOTIFICATION_SETTINGS else PermissionIssueType.NOTIFICATION_PERMISSION,
            if (permanentlyDenied) "Notification permission is blocked" else "Allow reminder notifications",
            if (permanentlyDenied) "Enable notifications for My Personal Notebook in Android settings."
            else "Android notification permission is needed to test this reminder.",
            if (permanentlyDenied) "Open notification settings" else "Continue",
        )
    }
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
        return PermissionIssue(
            PermissionIssueType.NOTIFICATION_SETTINGS,
            "Notifications are turned off",
            "Enable notifications for My Personal Notebook in Android settings, then test again.",
            "Open notification settings",
        )
    }
    return ReminderNotifications.notificationPermissionIssue(context)?.let {
        PermissionIssue(
            PermissionIssueType.NOTIFICATION_SETTINGS,
            "Location reminders are blocked",
            it,
            "Open notification settings",
        )
    }
}

private suspend fun showOperationResult(result: OperationResult, tellUser: (String) -> Unit) {
    when (result) {
        OperationResult.Success -> tellUser("Reminder updated.")
        is OperationResult.Warning -> tellUser(result.message)
        is OperationResult.Error -> tellUser(result.message)
    }
}

private const val PREFS_PERMISSIONS = "location_reminder_permissions"
private const val KEY_LOCATION_REQUEST_COUNT = "precise_location_request_count"
private const val KEY_BACKGROUND_REQUEST_COUNT = "background_location_request_count"
private const val KEY_NOTIFICATION_REQUEST_COUNT = "notification_request_count"
