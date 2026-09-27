package com.nahian.mypersonalnotebook.ui

import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.nahian.mypersonalnotebook.reminders.ChecklistTaskAlertSettings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun NotebookSettingsScreen(
    profileName: String,
    profilePhotoPath: String?,
    themeMode: NotebookThemeMode,
    language: NotebookLanguage,
    appVersionName: String,
    taskAlertRepeatMinutes: Int,
    onSaveProfile: (String) -> Unit,
    onTaskAlertRepeatMinutesChange: (Int) -> Unit,
    onSaveProfilePhoto: suspend (Uri?) -> String?,
    onThemeModeChange: (NotebookThemeMode) -> Unit,
    onToggleLanguage: () -> Unit,
    onVoiceCommand: () -> Unit,
    onOpenAlertSettings: () -> Unit,
    onOpenBackupSettings: () -> Unit,
    onOpenUpdates: () -> Unit,
) {
    var name by remember(profileName) { mutableStateOf(profileName) }
    var savedName by remember(profileName) { mutableStateOf(profileName) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var showHelp by remember { mutableStateOf(false) }
    var profileBitmap by remember(profilePhotoPath) { mutableStateOf<android.graphics.Bitmap?>(null) }
    LaunchedEffect(profilePhotoPath) {
        profileBitmap = withContext(Dispatchers.IO) { profilePhotoPath?.let { path -> BitmapFactory.decodeFile(path) } }
    }
    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) scope.launch {
            try {
                onSaveProfilePhoto(uri)
                snackbar.showSnackbar(uiText("Profile photo saved on this device."))
            } catch (exception: Exception) {
                snackbar.showSnackbar(uiText(exception.message ?: "The profile photo could not be saved."))
            }
        }
    }
    BackHandler(enabled = showHelp) { showHelp = false }

    if (showHelp) {
        HelpAndAppInfoScreen(
            versionName = appVersionName,
            onBack = { showHelp = false },
            onOpenAlertSettings = onOpenAlertSettings,
            onOpenBackupSettings = onOpenBackupSettings,
            onOpenUpdates = onOpenUpdates,
        )
        return
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text(uiText("Settings")) }) },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth().animateContentSize(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                ) {
                    Column(Modifier.fillMaxWidth().padding(18.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.primaryContainer,
                                modifier = Modifier.size(54.dp),
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    if (profileBitmap != null) {
                                        Image(
                                            bitmap = profileBitmap!!.asImageBitmap(),
                                            contentDescription = uiText("Profile picture"),
                                            modifier = Modifier.fillMaxSize(),
                                            contentScale = ContentScale.Crop,
                                        )
                                    } else if (name.isBlank()) {
                                        Icon(Icons.Filled.Person, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
                                    } else {
                                        Text(name.trim().take(1).uppercase(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                                    }
                                }
                            }
                            Column(Modifier.padding(start = 14.dp)) {
                                Text(uiText("Profile"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                                Text(uiText("Personalize your notebook"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        Text(
                            uiText("Profile details are stored locally. Android can include this app in device backup if enabled."),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 14.dp),
                        )
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it.take(40) },
                            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                            label = { Text(uiText("Profile name")) },
                            singleLine = true,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                            TextButton(onClick = {
                                photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                            }) { Text(uiText("Choose profile picture")) }
                            if (profilePhotoPath != null) {
                                TextButton(onClick = {
                                    scope.launch {
                                        try {
                                            onSaveProfilePhoto(null)
                                            snackbar.showSnackbar(uiText("Profile picture removed."))
                                        } catch (exception: Exception) {
                                            snackbar.showSnackbar(uiText(exception.message ?: "The profile photo could not be saved."))
                                        }
                                    }
                                }) { Text(uiText("Remove photo")) }
                            }
                        }
                        Button(
                            onClick = {
                                val cleaned = name.trim()
                                onSaveProfile(cleaned)
                                name = cleaned
                                savedName = cleaned
                                scope.launch { snackbar.showSnackbar(uiText("Profile saved.")) }
                            },
                            enabled = name.trim() != savedName,
                            modifier = Modifier.padding(top = 10.dp),
                        ) { Text(uiText("Save profile")) }
                    }
                }
            }
            item {
                Card(
                    modifier = Modifier.fillMaxWidth().animateContentSize(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                ) {
                    Column(Modifier.fillMaxWidth().padding(18.dp)) {
                        Text(uiText("Appearance"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text(uiText("Choose the look that feels right."), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
                            FilterChip(
                                selected = themeMode == NotebookThemeMode.DARK,
                                onClick = { onThemeModeChange(NotebookThemeMode.DARK) },
                                label = { Text(uiText("Dark")) },
                            )
                            FilterChip(
                                selected = themeMode == NotebookThemeMode.LIGHT,
                                onClick = { onThemeModeChange(NotebookThemeMode.LIGHT) },
                                label = { Text(uiText("Light")) },
                            )
                            FilterChip(
                                selected = themeMode == NotebookThemeMode.SYSTEM,
                                onClick = { onThemeModeChange(NotebookThemeMode.SYSTEM) },
                                label = { Text(uiText("System")) },
                            )
                        }
                    }
                }
            }
            item {
                SettingsActionCard(
                    title = "Language",
                    description = if (language == NotebookLanguage.ENGLISH) uiText("Current language: English") else uiText("Current language: Bangla"),
                    action = if (language == NotebookLanguage.ENGLISH) "Switch to Bangla" else "Switch to English",
                    onClick = onToggleLanguage,
                )
            }
            item {
                SettingsActionCard(
                    title = "Voice commands",
                    description = "${uiText("Say a command like open notes.")} ${uiText("Voice recognition is handled by Android's speech service. Offline availability depends on your device; this app does not save audio.")}",
                    action = "Start voice command",
                    onClick = onVoiceCommand,
                )
            }
            item {
                SettingsActionCard(
                    title = "Reminder sound & alerts",
                    description = uiText("Alarm-style reminder sound and vibration are controlled by Android notification channels."),
                    action = "Open notification settings",
                    onClick = onOpenAlertSettings,
                )
            }
            item {
                TaskAlertRepeatSettingsCard(
                    repeatMinutes = taskAlertRepeatMinutes,
                    onSave = { minutes ->
                        onTaskAlertRepeatMinutesChange(minutes)
                        scope.launch { snackbar.showSnackbar(uiText("Repeat alert interval saved.")) }
                    },
                )
            }
            item {
                SettingsActionCard(
                    title = "Help & App Info",
                    description = "${uiText("Version")} $appVersionName · ${uiText("Offline-first notebook with Android backup support.")}",
                    action = "Open Help & App Info",
                    onClick = { showHelp = true },
                )
            }
        }
    }
}

@Composable
private fun TaskAlertRepeatSettingsCard(repeatMinutes: Int, onSave: (Int) -> Unit) {
    var minutesText by remember(repeatMinutes) { mutableStateOf(repeatMinutes.toString()) }
    val minutes = minutesText.toIntOrNull()
    val valid = minutes != null && minutes in ChecklistTaskAlertSettings.MIN_REPEAT_INTERVAL_MINUTES..ChecklistTaskAlertSettings.MAX_REPEAT_INTERVAL_MINUTES
    Card(
        modifier = Modifier.fillMaxWidth().animateContentSize(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Text(uiText("Overdue task alert interval"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                uiText("Overdue task alerts repeat until the task is marked complete."),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 10.dp)) {
                OutlinedTextField(
                    value = minutesText,
                    onValueChange = { minutesText = it.filter(Char::isDigit).take(3) },
                    modifier = Modifier.weight(1f),
                    label = { Text(uiText("Minutes between repeat alerts")) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                )
                Button(onClick = { minutes?.let(onSave) }, enabled = valid && minutes != repeatMinutes) {
                    Text(uiText("Save"))
                }
            }
            Text(uiText("Enter 1 to 120 minutes."), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HelpAndAppInfoScreen(
    versionName: String,
    onBack: () -> Unit,
    onOpenAlertSettings: () -> Unit,
    onOpenBackupSettings: () -> Unit,
    onOpenUpdates: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiText("Help & App Info"), maxLines = 1) },
                navigationIcon = {
                    androidx.compose.material3.IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = uiText("Back to settings"))
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(Modifier.fillMaxWidth().padding(18.dp)) {
                    Text("NAHIAN'S NOTEBOOK", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, maxLines = 1)
                    Text("${uiText("App version")}: $versionName", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 4.dp))
                    Text(uiText("Help and app information"), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 10.dp))
                }
            }
            SettingsActionCard(
                title = "Using your notebook",
                description = uiText("Notes autosave on this device. Checklists open as folders; use the edit controls to rename lists or change tasks."),
                action = "Got it",
                onClick = onBack,
            )
            SettingsActionCard(
                title = "Reminders and privacy",
                description = uiText("Time reminders use Android alarms. Place reminders use Android geofencing, not continuous background GPS. Android notification and battery settings can affect delivery."),
                action = "Open notification settings",
                onClick = onOpenAlertSettings,
            )
            SettingsActionCard(
                title = "Automatic Google backup",
                description = uiText("Your data stays available offline on this phone. If Android backup is enabled for your Google account, Android can back up this app's local notes, lists, reminders, profile, and preferences. Backup timing is controlled by Android; it is not instant sync."),
                action = "Open Android backup settings",
                onClick = onOpenBackupSettings,
            )
            SettingsActionCard(
                title = "Updates and downloads",
                description = uiText("Open the project's GitHub Actions page to find published app builds. A permanent link to this chat is not available inside the app."),
                action = "View app updates",
                onClick = onOpenUpdates,
            )
        }
    }
}

@Composable
private fun SettingsActionCard(title: String, description: String, action: String, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().animateContentSize(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Text(uiText(title), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
            TextButton(onClick = onClick, modifier = Modifier.padding(top = 4.dp)) { Text(uiText(action)) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun NotebookReminderHubScreen(
    onOpenTimeReminders: () -> Unit,
    onOpenLocationReminders: () -> Unit,
) {
    Scaffold(topBar = { TopAppBar(title = { Text(uiText("Reminders")) }) }) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(uiText("Choose a reminder type."), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            ReminderHubCard(
                title = "Time reminders",
                description = "Choose a date and time; Android will notify you then.",
                icon = { Icon(Icons.Filled.Alarm, contentDescription = null) },
                onClick = onOpenTimeReminders,
            )
            ReminderHubCard(
                title = "Location reminders",
                description = "Android will notify you when the geofence transition happens.",
                icon = { Icon(Icons.Filled.LocationOn, contentDescription = null) },
                onClick = onOpenLocationReminders,
            )
        }
    }
}

@Composable
private fun ReminderHubCard(title: String, description: String, icon: @Composable () -> Unit, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).animateContentSize(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.size(50.dp)) {
                Box(contentAlignment = Alignment.Center) { icon() }
            }
            Column(Modifier.weight(1f).padding(start = 14.dp)) {
                Text(uiText(title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(uiText(description), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 3.dp))
            }
        }
    }
}
