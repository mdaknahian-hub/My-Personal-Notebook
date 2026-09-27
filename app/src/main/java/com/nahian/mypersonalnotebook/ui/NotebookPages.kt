package com.nahian.mypersonalnotebook.ui

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.activity.compose.BackHandler
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.nahian.mypersonalnotebook.data.ChecklistTaskTimeLimit
import com.nahian.mypersonalnotebook.data.ChecklistTaskTimeLimitType
import com.nahian.mypersonalnotebook.data.ChecklistWithItems
import com.nahian.mypersonalnotebook.data.ContentResult
import com.nahian.mypersonalnotebook.data.NotebookChecklist
import com.nahian.mypersonalnotebook.data.NotebookChecklistItem
import com.nahian.mypersonalnotebook.data.NotebookContentRepository
import com.nahian.mypersonalnotebook.data.NotebookNote
import com.nahian.mypersonalnotebook.data.TimeReminderRepository
import com.nahian.mypersonalnotebook.domain.NotebookVoiceCommands
import com.nahian.mypersonalnotebook.domain.NotebookVoiceDestination
import com.nahian.mypersonalnotebook.reminders.ChecklistTaskAlertSettings
import com.nahian.mypersonalnotebook.widget.NotebookWidgetProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.DateFormat
import java.util.Date
import java.util.UUID

private enum class NotebookSection {
    SUMMARY,
    REMINDERS,
    LOCATION_REMINDERS,
    TIME_REMINDERS,
    CHECKLISTS,
    NOTES,
    SETTINGS,
}

@Composable
internal fun NotebookAppRoot(
    locationRepository: com.nahian.mypersonalnotebook.data.LocationReminderRepository,
    contentRepository: NotebookContentRepository,
    timeReminderRepository: TimeReminderRepository,
    initialReminderId: String? = null,
    initialOpenSection: String? = null,
    themeMode: NotebookThemeMode,
    onThemeModeChange: (NotebookThemeMode) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val voiceSnackbar = remember { SnackbarHostState() }
    var language by remember { mutableStateOf(NotebookLanguageSettings.current) }
    var profileName by remember { mutableStateOf(NotebookAppSettingsStore.profileName) }
    var profilePhotoPath by remember { mutableStateOf(NotebookAppSettingsStore.profilePhotoPath) }
    val appVersionName = remember(context) {
        runCatching { context.packageManager.getPackageInfo(context.packageName, 0).versionName }.getOrNull() ?: "1.0.0"
    }
    var taskAlertRepeatMinutes by remember { mutableStateOf(ChecklistTaskAlertSettings.repeatIntervalMinutes(context)) }
    var pendingReminderId by remember(initialReminderId) { mutableStateOf(initialReminderId) }
    var locationNavigationVisible by remember { mutableStateOf(true) }
    var showVoiceLanguageDialog by remember { mutableStateOf(false) }
    var noteEditorOpen by remember { mutableStateOf(false) }
    var section by remember(initialReminderId, initialOpenSection) {
        mutableStateOf(
            when {
                initialReminderId != null -> NotebookSection.LOCATION_REMINDERS
                initialOpenSection == MainActivity.SECTION_NOTES -> NotebookSection.NOTES
                initialOpenSection == MainActivity.SECTION_CHECKLISTS -> NotebookSection.CHECKLISTS
                initialOpenSection == MainActivity.SECTION_TIME_REMINDERS -> NotebookSection.TIME_REMINDERS
                initialOpenSection == MainActivity.SECTION_LOCATION_REMINDERS -> NotebookSection.LOCATION_REMINDERS
                else -> NotebookSection.SUMMARY
            },
        )
    }
    BackHandler(enabled = section != NotebookSection.SUMMARY) {
        section = when (section) {
            NotebookSection.TIME_REMINDERS, NotebookSection.LOCATION_REMINDERS -> NotebookSection.REMINDERS
            else -> NotebookSection.SUMMARY
        }
    }
    val reminders by locationRepository.observeReminders().collectAsState(initial = emptyList())
    val recentNotes by contentRepository.observeRecentNotes().collectAsState(initial = emptyList())
    val allNotes by contentRepository.observeNotes().collectAsState(initial = emptyList())
    val checklists by contentRepository.observeChecklists().collectAsState(initial = emptyList())
    val timeReminders by timeReminderRepository.observeAll().collectAsState(initial = emptyList())

    fun toggleLanguage() {
        val next = language.next()
        language = next
        NotebookLanguageSettings.save(context, next)
        NotebookWidgetProvider.refresh(context)
    }

    val voiceLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val transcript = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
            val destination = transcript?.let { NotebookVoiceCommands.destinationFor(it) }
            if (destination == null) {
                scope.launch { voiceSnackbar.showSnackbar(uiText("Command not recognized. Try saying open notes.")) }
            } else {
                section = when (destination) {
                    NotebookVoiceDestination.SUMMARY -> NotebookSection.SUMMARY
                    NotebookVoiceDestination.NOTES -> NotebookSection.NOTES
                    NotebookVoiceDestination.CHECKLISTS -> NotebookSection.CHECKLISTS
                    NotebookVoiceDestination.REMINDERS -> NotebookSection.REMINDERS
                    NotebookVoiceDestination.TIME_REMINDERS -> NotebookSection.TIME_REMINDERS
                    NotebookVoiceDestination.LOCATION_REMINDERS -> NotebookSection.LOCATION_REMINDERS
                    NotebookVoiceDestination.SETTINGS -> NotebookSection.SETTINGS
                }
                scope.launch { voiceSnackbar.showSnackbar(uiText("Voice command opened a screen.")) }
            }
        }
    }

    fun launchVoiceCommand(languageTag: String) {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, languageTag)
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            putExtra(
                RecognizerIntent.EXTRA_PROMPT,
                if (languageTag == "bn-BD") "কমান্ড বলুন, যেমন নোট খুলুন।" else "Say a command like open notes.",
            )
        }
        try {
            voiceLauncher.launch(intent)
        } catch (_: ActivityNotFoundException) {
            scope.launch { voiceSnackbar.showSnackbar(uiText("Voice recognition is unavailable on this device.")) }
        }
    }

    fun startVoiceCommand() {
        showVoiceLanguageDialog = true
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Box(Modifier.weight(1f).fillMaxWidth()) {
            AnimatedContent(
                targetState = section,
                modifier = Modifier.fillMaxSize(),
                transitionSpec = {
                    (fadeIn(tween(190)) + slideInHorizontally(tween(190)) { it / 18 }) togetherWith
                        (fadeOut(tween(130)) + slideOutHorizontally(tween(130)) { -it / 18 })
                },
                label = "notebook section transition",
            ) { destination ->
                key(language) {
                    when (destination) {
                        NotebookSection.SUMMARY -> NotebookSummaryScreen(
                            language = language,
                            displayName = profileName,
                            onToggleLanguage = ::toggleLanguage,
                            onOpenSettings = { section = NotebookSection.SETTINGS },
                            onVoiceCommand = ::startVoiceCommand,
                            activeTimeReminders = timeReminders.count { it.enabled },
                            activeLocationReminders = reminders.count { it.enabled },
                            registeredLocationReminders = reminders.count { it.enabled && it.registered },
                            checklists = checklists,
                            recentNotes = recentNotes,
                            noteCount = allNotes.size,
                            onOpenReminders = { section = NotebookSection.LOCATION_REMINDERS },
                            onOpenTimeReminders = { section = NotebookSection.TIME_REMINDERS },
                            onOpenChecklists = { section = NotebookSection.CHECKLISTS },
                            onOpenNotes = { section = NotebookSection.NOTES },
                        )
                        NotebookSection.REMINDERS -> NotebookReminderHubScreen(
                            onOpenTimeReminders = { section = NotebookSection.TIME_REMINDERS },
                            onOpenLocationReminders = { section = NotebookSection.LOCATION_REMINDERS },
                        )
                        NotebookSection.LOCATION_REMINDERS -> LocationReminderApp(
                            repository = locationRepository,
                            initialReminderId = pendingReminderId,
                            onExit = { section = NotebookSection.REMINDERS },
                            onPrimaryNavigationVisibilityChange = { locationNavigationVisible = it },
                            onInitialReminderHandled = { pendingReminderId = null },
                        )
                        NotebookSection.TIME_REMINDERS -> TimeRemindersScreen(
                            repository = timeReminderRepository,
                            onBack = { section = NotebookSection.REMINDERS },
                        )
                        NotebookSection.CHECKLISTS -> NotebookChecklistsScreen(
                            repository = contentRepository,
                            onBack = { section = NotebookSection.SUMMARY },
                        )
                        NotebookSection.NOTES -> NotebookNotesScreen(
                            repository = contentRepository,
                            onBack = { section = NotebookSection.SUMMARY },
                            onEditorVisibilityChange = { noteEditorOpen = it },
                        )
                        NotebookSection.SETTINGS -> NotebookSettingsScreen(
                            profileName = profileName,
                            profilePhotoPath = profilePhotoPath,
                            themeMode = themeMode,
                            language = language,
                            appVersionName = appVersionName,
                            taskAlertRepeatMinutes = taskAlertRepeatMinutes,
                            onTaskAlertRepeatMinutesChange = { minutes ->
                                if (ChecklistTaskAlertSettings.saveRepeatIntervalMinutes(context, minutes)) taskAlertRepeatMinutes = minutes
                            },
                            onSaveProfile = { name ->
                                NotebookAppSettingsStore.saveProfileName(context, name)
                                profileName = NotebookAppSettingsStore.profileName
                            },
                            onSaveProfilePhoto = { uri ->
                                val savedPath = withContext(Dispatchers.IO) { NotebookAppSettingsStore.saveProfilePhoto(context, uri) }
                                profilePhotoPath = savedPath
                                savedPath
                            },
                            onThemeModeChange = onThemeModeChange,
                            onToggleLanguage = ::toggleLanguage,
                            onVoiceCommand = ::startVoiceCommand,
                            onOpenAlertSettings = {
                                try {
                                    context.startActivity(
                                        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                                            .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName),
                                    )
                                } catch (_: ActivityNotFoundException) {
                                    scope.launch { voiceSnackbar.showSnackbar(uiText("Android notification settings could not be opened.")) }
                                }
                            },
                            onOpenBackupSettings = {
                                try {
                                    context.startActivity(Intent(Settings.ACTION_PRIVACY_SETTINGS))
                                } catch (_: ActivityNotFoundException) {
                                    try {
                                        context.startActivity(Intent(Settings.ACTION_SETTINGS))
                                    } catch (_: ActivityNotFoundException) {
                                        scope.launch { voiceSnackbar.showSnackbar(uiText("Android backup settings could not be opened.")) }
                                    }
                                }
                            },
                            onOpenUpdates = {
                                try {
                                    context.startActivity(
                                        Intent(
                                            Intent.ACTION_VIEW,
                                            Uri.parse("https://github.com/mdaknahian-hub/My-Personal-Notebook/actions/workflows/android-debug.yml?query=branch%3Aarena%2F01a0d731-my-personal-notebook"),
                                        ),
                                    )
                                } catch (_: ActivityNotFoundException) {
                                    scope.launch { voiceSnackbar.showSnackbar(uiText("No browser is available to open the updates page.")) }
                                }
                            },
                        )
                    }
                }
            }
            SnackbarHost(
                hostState = voiceSnackbar,
                modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 8.dp),
            )
        }
        if ((locationNavigationVisible || section != NotebookSection.LOCATION_REMINDERS) && !noteEditorOpen) {
            NotebookNavigationBar(
                section = section,
                onSelect = { section = it },
            )
        }
    }

    if (showVoiceLanguageDialog) {
        AlertDialog(
            onDismissRequest = { showVoiceLanguageDialog = false },
            title = { Text(uiText("Choose voice command language")) },
            text = { Text(uiText("Choose the language you will speak.")) },
            confirmButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = { showVoiceLanguageDialog = false; launchVoiceCommand("en-US") }) { Text(uiText("English")) }
                    TextButton(onClick = { showVoiceLanguageDialog = false; launchVoiceCommand("bn-BD") }) { Text(uiText("Bangla")) }
                }
            },
            dismissButton = { TextButton(onClick = { showVoiceLanguageDialog = false }) { Text(uiText("Cancel")) } },
        )
    }
}

@Composable
private fun NotebookNavigationBar(section: NotebookSection, onSelect: (NotebookSection) -> Unit) {
    val selectedSection = when (section) {
        NotebookSection.SUMMARY -> NotebookSection.SUMMARY
        NotebookSection.NOTES -> NotebookSection.NOTES
        NotebookSection.CHECKLISTS -> NotebookSection.CHECKLISTS
        NotebookSection.REMINDERS, NotebookSection.TIME_REMINDERS, NotebookSection.LOCATION_REMINDERS -> NotebookSection.REMINDERS
        NotebookSection.SETTINGS -> NotebookSection.SETTINGS
    }
    NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
        NavigationBarItem(
            selected = selectedSection == NotebookSection.SUMMARY,
            onClick = { onSelect(NotebookSection.SUMMARY) },
            icon = { Icon(Icons.Filled.Home, contentDescription = null) },
            label = { Text(uiText("Summary")) },
        )
        NavigationBarItem(
            selected = selectedSection == NotebookSection.NOTES,
            onClick = { onSelect(NotebookSection.NOTES) },
            icon = { Icon(Icons.Filled.MenuBook, contentDescription = null) },
            label = { Text(uiText("Notes")) },
        )
        NavigationBarItem(
            selected = selectedSection == NotebookSection.CHECKLISTS,
            onClick = { onSelect(NotebookSection.CHECKLISTS) },
            icon = { Icon(Icons.Filled.Checklist, contentDescription = null) },
            label = { Text(uiText("Checklists")) },
        )
        NavigationBarItem(
            selected = selectedSection == NotebookSection.REMINDERS,
            onClick = { onSelect(NotebookSection.REMINDERS) },
            icon = { Icon(Icons.Filled.NotificationsActive, contentDescription = null) },
            label = { Text(uiText("Reminders")) },
        )
        NavigationBarItem(
            selected = selectedSection == NotebookSection.SETTINGS,
            onClick = { onSelect(NotebookSection.SETTINGS) },
            icon = { Icon(Icons.Filled.Settings, contentDescription = null) },
            label = { Text(uiText("Settings")) },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NotebookSummaryScreen(
    language: NotebookLanguage,
    displayName: String,
    onToggleLanguage: () -> Unit,
    onOpenSettings: () -> Unit,
    onVoiceCommand: () -> Unit,
    activeTimeReminders: Int,
    activeLocationReminders: Int,
    registeredLocationReminders: Int,
    checklists: List<ChecklistWithItems>,
    recentNotes: List<NotebookNote>,
    noteCount: Int,
    onOpenReminders: () -> Unit,
    onOpenTimeReminders: () -> Unit,
    onOpenChecklists: () -> Unit,
    onOpenNotes: () -> Unit,
) {
    val outstandingItems = checklists.sumOf { it.remainingCount }
    val summaryMessage = when {
        activeTimeReminders == 0 && activeLocationReminders == 0 && outstandingItems == 0 -> uiText("A calm place for your notes, plans, and reminders.")
        language == NotebookLanguage.BANGLA -> "আপনার ${activeTimeReminders}টি সময়ভিত্তিক ও ${activeLocationReminders}টি সক্রিয় অবস্থানভিত্তিক রিমাইন্ডার আছে; চেকলিস্টে ${outstandingItems}টি আইটেম বাকি।"
        else -> "You have $activeTimeReminders scheduled and $activeLocationReminders active location reminders, with $outstandingItems checklist items left."
    }
    val welcomeText = when {
        displayName.isBlank() -> uiText("Your day, in one place")
        language == NotebookLanguage.BANGLA -> "স্বাগতম, $displayName"
        else -> "Welcome back, $displayName"
    }
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            uiText("NAHIAN'S NOTEBOOK"),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(welcomeText, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                },
                actions = {
                    IconButton(onClick = onVoiceCommand) {
                        Icon(Icons.Filled.Mic, contentDescription = uiText("Voice command"))
                    }
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Filled.Settings, contentDescription = uiText("Settings"))
                    }
                    TextButton(onClick = onToggleLanguage) {
                        Text(if (language == NotebookLanguage.ENGLISH) "বাংলা" else "English")
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 10.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Surface(color = MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(24.dp)) {
                    Column(Modifier.fillMaxWidth().padding(20.dp)) {
                        Text(uiText("Summary"), style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Bold)
                        Text(
                            summaryMessage,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.9f),
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                }
            }
            item {
                NotebookActivityChart(
                    noteCount = noteCount,
                    checklistCount = checklists.size,
                    completedTasks = checklists.sumOf { it.completedCount },
                    remainingTasks = outstandingItems,
                    reminderCount = activeTimeReminders + activeLocationReminders,
                )
            }
            item {
                SummaryActionCard(
                    title = "Time reminders",
                    subtitle = if (activeTimeReminders == 0) uiText("No scheduled reminders") else if (language == NotebookLanguage.BANGLA) "${activeTimeReminders}টি নির্ধারিত রিমাইন্ডার" else "$activeTimeReminders scheduled reminders",
                    icon = { Icon(Icons.Filled.Alarm, contentDescription = null) },
                    onClick = onOpenTimeReminders,
                )
            }
            item {
                SummaryActionCard(
                    title = "Location reminders",
                    subtitle = if (activeLocationReminders == 0) uiText("No active location reminders") else if (language == NotebookLanguage.BANGLA) "Android-এ নিবন্ধিত: $registeredLocationReminders / $activeLocationReminders" else "$registeredLocationReminders of $activeLocationReminders registered with Android",
                    icon = { Icon(Icons.Filled.NotificationsActive, contentDescription = null) },
                    onClick = onOpenReminders,
                )
            }
            item {
                SummaryActionCard(
                    title = "Checklists",
                    subtitle = if (language == NotebookLanguage.BANGLA) "${checklists.size}টি তালিকা · ${outstandingItems}টি আইটেম বাকি" else "${checklists.size} lists · $outstandingItems items remaining",
                    icon = { Icon(Icons.Filled.Checklist, contentDescription = null) },
                    onClick = onOpenChecklists,
                )
            }
            item {
                SummaryActionCard(
                    title = "Notebook",
                    subtitle = if (language == NotebookLanguage.BANGLA) "নিচে ${recentNotes.size}টি সাম্প্রতিক নোট" else "${recentNotes.size} recent notes shown below",
                    icon = { Icon(Icons.Filled.MenuBook, contentDescription = null) },
                    onClick = onOpenNotes,
                )
            }
            item {
                Text(uiText("Recent notes"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
            }
            if (recentNotes.isEmpty()) {
                item {
                    Text(uiText("Your saved notes will appear here."), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                items(recentNotes, key = { "recent-${it.id}" }) { note ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable(onClick = onOpenNotes),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Text(
                                if (note.title.isBlank()) uiText("Untitled note") else note.title,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            if (note.body.isNotBlank()) NotebookNotePreview(note.body, maxLines = 2, modifier = Modifier.padding(top = 5.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotebookActivityChart(
    noteCount: Int,
    checklistCount: Int,
    completedTasks: Int,
    remainingTasks: Int,
    reminderCount: Int,
) {
    val maximum = maxOf(noteCount, checklistCount, completedTasks, remainingTasks, reminderCount, 1)
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(24.dp)) {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(uiText("Notebook activity"), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            ActivityBar(uiText("Notes"), noteCount, maximum, MaterialTheme.colorScheme.primary)
            ActivityBar(uiText("Checklists"), checklistCount, maximum, MaterialTheme.colorScheme.secondary)
            ActivityBar(uiText("Tasks complete"), completedTasks, maximum, MaterialTheme.colorScheme.tertiary)
            ActivityBar(uiText("Tasks remaining"), remainingTasks, maximum, MaterialTheme.colorScheme.error)
            ActivityBar(uiText("Reminders"), reminderCount, maximum, MaterialTheme.colorScheme.secondary)
        }
    }
}

@Composable
private fun ActivityBar(label: String, value: Int, maximum: Int, tint: androidx.compose.ui.graphics.Color) {
    val trackColor = MaterialTheme.colorScheme.surfaceVariant
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(9.dp)) {
        Text(label, modifier = Modifier.width(104.dp), style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Canvas(Modifier.weight(1f).height(9.dp)) {
            val radius = CornerRadius(size.height / 2f)
            drawRoundRect(color = trackColor, cornerRadius = radius)
            val fraction = (value.toFloat() / maximum).coerceIn(0f, 1f)
            if (fraction > 0f) drawRoundRect(color = tint, size = Size(size.width * fraction, size.height), cornerRadius = radius)
        }
        Text(value.toString(), modifier = Modifier.width(24.dp), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun SummaryActionCard(
    title: String,
    subtitle: String,
    icon: @Composable () -> Unit,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(14.dp), modifier = Modifier.size(46.dp)) {
                androidx.compose.foundation.layout.Box(contentAlignment = Alignment.Center) { icon() }
            }
            Column(Modifier.weight(1f).padding(start = 14.dp)) {
                Text(uiText(title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(uiText(subtitle), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NotebookNotesScreen(
    repository: NotebookContentRepository,
    onBack: () -> Unit,
    onEditorVisibilityChange: (Boolean) -> Unit,
) {
    val notes by repository.observeNotes().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current
    var editorOpen by remember { mutableStateOf(false) }
    var editingNoteId by remember { mutableStateOf<String?>(null) }
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var isDirty by remember { mutableStateOf(false) }
    var saveStatus by remember { mutableStateOf("Saved on this device") }
    var pendingDelete by remember { mutableStateOf<NotebookNote?>(null) }

    LaunchedEffect(editorOpen) { onEditorVisibilityChange(editorOpen) }

    fun openEditor(note: NotebookNote?) {
        editingNoteId = note?.id ?: UUID.randomUUID().toString()
        title = note?.title.orEmpty()
        body = note?.body.orEmpty()
        isDirty = false
        saveStatus = "Saved on this device"
        editorOpen = true
    }

    fun copyText(copyTitle: String, copyBody: String) {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val plainBody = renderNotebookNote(copyBody).text
        val copiedNote = when {
            copyTitle.isBlank() -> plainBody
            plainBody.isBlank() -> copyTitle
            else -> "$copyTitle\n\n$plainBody"
        }
        clipboard.setPrimaryClip(ClipData.newPlainText(copyTitle.ifBlank { "NAHIAN'S NOTEBOOK" }, copiedNote))
        scope.launch { snackbar.showSnackbar(uiText("Note copied to clipboard.")) }
    }

    fun saveAndClose() {
        if (!isDirty) {
            editorOpen = false
            return
        }
        if (title.isBlank() && body.isBlank()) {
            editorOpen = false
            return
        }
        scope.launch {
            when (val result = repository.saveNote(editingNoteId, title, body)) {
                ContentResult.Success -> {
                    isDirty = false
                    saveStatus = "Saved on this device"
                    editorOpen = false
                }
                is ContentResult.Error -> {
                    saveStatus = result.message
                    snackbar.showSnackbar(uiText(result.message))
                }
            }
        }
    }

    BackHandler(enabled = editorOpen) { saveAndClose() }

    LaunchedEffect(editorOpen, editingNoteId, title, body, isDirty) {
        if (!editorOpen || !isDirty || (title.isBlank() && body.isBlank())) return@LaunchedEffect
        saveStatus = "Saving…"
        delay(650)
        when (val result = repository.saveNote(editingNoteId, title, body)) {
            ContentResult.Success -> {
                isDirty = false
                saveStatus = "Saved on this device"
            }
            is ContentResult.Error -> {
                saveStatus = result.message
                snackbar.showSnackbar(uiText(result.message))
            }
        }
    }

    if (!editorOpen) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text(uiText("Notebook"), maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    navigationIcon = {
                        IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = uiText("Back to summary")) }
                    },
                )
            },
            floatingActionButton = {
                ExtendedFloatingActionButton(onClick = { openEditor(null) }, icon = { Icon(Icons.Filled.Add, contentDescription = null) }, text = { Text(uiText("New note")) })
            },
            snackbarHost = { SnackbarHost(snackbar) },
        ) { padding ->
            if (notes.isEmpty()) {
                Column(
                    Modifier.fillMaxSize().padding(padding).padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(Icons.Filled.MenuBook, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(56.dp))
                    Text(uiText("Your notebook is ready"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 12.dp))
                    Text(uiText("Create a note; it will be saved on this device."), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                    Button(onClick = { openEditor(null) }, modifier = Modifier.padding(top = 16.dp)) { Text(uiText("Create first note")) }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 100.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(notes, key = { it.id }) { note ->
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Row(Modifier.fillMaxWidth().padding(start = 14.dp, end = 4.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.Top) {
                                Column(Modifier.weight(1f).clickable { openEditor(note) }.padding(vertical = 6.dp)) {
                                    Text(
                                        if (note.title.isBlank()) uiText("Untitled note") else note.title,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                    if (note.body.isNotBlank()) NotebookNotePreview(note.body, maxLines = 3, modifier = Modifier.padding(top = 5.dp))
                                }
                                IconButton(onClick = { copyText(note.title, note.body) }) { Icon(Icons.Filled.ContentCopy, contentDescription = uiText("Copy note")) }
                                IconButton(onClick = { openEditor(note) }) { Icon(Icons.Filled.Edit, contentDescription = uiText("Edit note")) }
                                IconButton(onClick = { pendingDelete = note }) { Icon(Icons.Filled.DeleteOutline, contentDescription = uiText("Delete note")) }
                            }
                        }
                    }
                }
            }
        }
    } else {
        NotebookNoteEditorScreen(
            noteKey = editingNoteId.orEmpty(),
            title = title,
            serializedBody = body,
            saveStatus = saveStatus,
            onTitleChange = { title = it; isDirty = true },
            onBodyChange = { body = it; isDirty = true },
            onCopy = { copyText(title, body) },
            onClose = ::saveAndClose,
        )
    }

    pendingDelete?.let { note ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text(uiText("Delete this note?")) },
            text = { Text(uiText("This removes the note from this device.")) },
            confirmButton = {
                Button(onClick = {
                    pendingDelete = null
                    scope.launch { repository.deleteNote(note.id) }
                }) { Text(uiText("Delete")) }
            },
            dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text(uiText("Cancel")) } },
        )
    }
}

@Composable
private fun NotebookNotePreview(body: String, maxLines: Int, modifier: Modifier = Modifier) {
    val document = remember(body) { decodeNotebookNote(body) }
    Text(
        text = renderNotebookNote(body),
        modifier = modifier,
        style = MaterialTheme.typography.bodyMedium.copy(fontFamily = document.font.family),
        textAlign = document.alignment.textAlign,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        maxLines = maxLines,
        overflow = TextOverflow.Ellipsis,
    )
}

@Composable
private fun ChecklistTaskTimeLimitStatus(item: NotebookChecklistItem) {
    val limit = ChecklistTaskTimeLimit.from(item)
    if (limit.type == ChecklistTaskTimeLimitType.NONE) return
    if (item.isChecked) {
        Text(uiText("Completed"), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }
    val dueAt = limit.dueAt()
    if (dueAt == null) {
        Text(uiText("Countdown not started"), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.tertiary)
        return
    }
    var now by remember(item.id, dueAt) { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(item.id, dueAt, item.isChecked) {
        while (!item.isChecked) {
            delay(30_000L)
            now = System.currentTimeMillis()
        }
    }
    val overdueBy = now >= dueAt
    val difference = if (overdueBy) now - dueAt else dueAt - now
    val prefix = if (overdueBy) uiText("Overdue by") else uiText("Time left")
    Text(
        "$prefix · ${formatTaskTimeDuration(difference)}",
        style = MaterialTheme.typography.labelSmall,
        color = if (overdueBy) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.tertiary,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
}

private fun taskTimeLimitDescription(limit: ChecklistTaskTimeLimit): String = when (limit.type) {
    ChecklistTaskTimeLimitType.NONE -> uiText("No limit")
    ChecklistTaskTimeLimitType.DEADLINE -> DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(limit.deadlineAt!!))
    ChecklistTaskTimeLimitType.COUNTDOWN -> buildString {
        append(formatTaskTimeDuration(limit.countdownDurationMillis ?: 0L))
        append(" · ")
        append(
            uiText(
                when {
                    limit.countdownStartedAt != null -> "Running"
                    limit.startCountdownWhenSaved -> "Start when saved"
                    else -> "Start manually"
                },
            ),
        )
    }
}

private fun formatTaskTimeDuration(millis: Long): String {
    val totalMinutes = ((millis.coerceAtLeast(0L) + 59_999L) / 60_000L).coerceAtLeast(1L)
    val hours = totalMinutes / 60
    val minutes = totalMinutes % 60
    return if (hours == 0L) "${totalMinutes}m" else "${hours}h ${minutes}m"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NotebookChecklistsScreen(repository: NotebookContentRepository, onBack: () -> Unit) {
    val checklists by repository.observeChecklists().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var openChecklistId by remember { mutableStateOf<String?>(null) }
    var isEditingChecklist by remember(openChecklistId) { mutableStateOf(false) }
    var createOpen by remember { mutableStateOf(false) }
    var newTitle by remember { mutableStateOf("") }
    var editingChecklist by remember { mutableStateOf<NotebookChecklist?>(null) }
    var renameTitle by remember { mutableStateOf("") }
    var editingItem by remember { mutableStateOf<NotebookChecklistItem?>(null) }
    var editingItemText by remember { mutableStateOf("") }
    var editingItemTimeLimit by remember { mutableStateOf(ChecklistTaskTimeLimit.None) }
    var newItemTimeLimit by remember(openChecklistId) { mutableStateOf(ChecklistTaskTimeLimit.None) }
    var showNewItemTimeLimitDialog by remember { mutableStateOf(false) }
    var showEditingItemTimeLimitDialog by remember { mutableStateOf(false) }
    var pendingDeleteChecklist by remember { mutableStateOf<NotebookChecklist?>(null) }
    val openChecklist = checklists.firstOrNull { it.checklist.id == openChecklistId }

    BackHandler(enabled = openChecklistId != null) {
        if (isEditingChecklist) isEditingChecklist = false else openChecklistId = null
    }
    LaunchedEffect(openChecklistId, checklists) {
        if (openChecklistId != null && openChecklist == null) openChecklistId = null
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = openChecklist?.checklist?.title ?: uiText("Checklists"),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        when {
                            openChecklist == null -> onBack()
                            isEditingChecklist -> isEditingChecklist = false
                            else -> openChecklistId = null
                        }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = if (openChecklist == null) uiText("Back to summary") else uiText("Back to checklists"))
                    }
                },
                actions = {
                    if (openChecklist != null) {
                        if (isEditingChecklist) {
                            TextButton(onClick = {
                                renameTitle = openChecklist.checklist.title
                                editingChecklist = openChecklist.checklist
                            }) { Text(uiText("Rename")) }
                            IconButton(onClick = { pendingDeleteChecklist = openChecklist.checklist }) {
                                Icon(Icons.Filled.DeleteOutline, contentDescription = uiText("Delete checklist"))
                            }
                            IconButton(onClick = { isEditingChecklist = false }) {
                                Icon(Icons.Filled.Done, contentDescription = uiText("Finish editing"))
                            }
                        } else {
                            IconButton(onClick = { isEditingChecklist = true }) {
                                Icon(Icons.Filled.Edit, contentDescription = uiText("Edit checklist"))
                            }
                        }
                    }
                },
            )
        },
        floatingActionButton = {
            if (openChecklist == null) {
                ExtendedFloatingActionButton(
                    onClick = { newTitle = ""; createOpen = true },
                    icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                    text = { Text(uiText("New checklist")) },
                )
            }
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        when {
            openChecklist == null && checklists.isEmpty() -> Column(
                Modifier.fillMaxSize().padding(padding).padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(Icons.Filled.Checklist, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(56.dp))
                Text(uiText("Make a list you can check off"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 12.dp))
                Text(uiText("Your checklists are saved on this device."), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                Button(onClick = { createOpen = true }, modifier = Modifier.padding(top = 16.dp)) { Text(uiText("Create first checklist")) }
            }
            openChecklist == null -> LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 100.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item { Text(uiText("Your checklist folders"), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold) }
                items(checklists, key = { it.checklist.id }) { checklist ->
                    ChecklistFolderCard(
                        checklist = checklist,
                        onOpen = { openChecklistId = checklist.checklist.id },
                        onEdit = { renameTitle = checklist.checklist.title; editingChecklist = checklist.checklist },
                        onDelete = { pendingDeleteChecklist = checklist.checklist },
                    )
                }
            }
            else -> {
                val currentChecklist = openChecklist
                if (currentChecklist == null) {
                    Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                        Text(uiText("This checklist no longer exists."), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                } else {
                    val list = currentChecklist
                    var newItem by remember(list.checklist.id) { mutableStateOf("") }
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(padding),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 28.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item {
                            Text(
                                if (NotebookLanguageSettings.current == NotebookLanguage.BANGLA) "${list.items.size}টির মধ্যে ${list.completedCount}টি সম্পন্ন" else "${list.completedCount} of ${list.items.size} complete",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        if (list.items.isEmpty()) {
                            item {
                                Text(
                                    uiText(if (isEditingChecklist) "No tasks yet. Add your first task below." else "No tasks yet. Choose Edit to add your first task."),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(vertical = 12.dp),
                                )
                            }
                        }
                        items(list.items, key = { it.id }) { task ->
                            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                                Row(Modifier.fillMaxWidth().padding(start = 8.dp, end = 4.dp, top = 5.dp, bottom = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Checkbox(checked = task.isChecked, onCheckedChange = { checked -> scope.launch { repository.setChecklistItemChecked(list.checklist.id, task.id, checked) } })
                                    Column(
                                        modifier = Modifier.weight(1f).clickable { scope.launch { repository.setChecklistItemChecked(list.checklist.id, task.id, !task.isChecked) } },
                                    ) {
                                        Text(
                                            task.text,
                                            style = MaterialTheme.typography.bodyLarge,
                                            color = if (task.isChecked) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                        ChecklistTaskTimeLimitStatus(task)
                                    }
                                    if (!task.isChecked && task.countdownDurationMillis != null && task.countdownStartedAt == null) {
                                        TextButton(onClick = {
                                            scope.launch {
                                                when (val result = repository.startChecklistItemCountdown(list.checklist.id, task.id)) {
                                                    ContentResult.Success -> Unit
                                                    is ContentResult.Error -> snackbar.showSnackbar(uiText(result.message))
                                                }
                                            }
                                        }) { Text(uiText("Start")) }
                                    }
                                    if (isEditingChecklist) {
                                        IconButton(onClick = {
                                            editingItemText = task.text
                                            editingItemTimeLimit = ChecklistTaskTimeLimit.from(task)
                                            editingItem = task
                                        }) {
                                            Icon(Icons.Filled.Edit, contentDescription = uiText("Edit task"))
                                        }
                                        IconButton(onClick = { scope.launch { repository.deleteChecklistItem(list.checklist.id, task.id) } }) {
                                            Icon(Icons.Filled.DeleteOutline, contentDescription = uiText("Delete checklist item"))
                                        }
                                    }
                                }
                            }
                        }
                        if (isEditingChecklist) item {
                            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                                Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        OutlinedTextField(
                                            value = newItem,
                                            onValueChange = { newItem = it },
                                            label = { Text(uiText("Add an item")) },
                                            singleLine = true,
                                            modifier = Modifier.weight(1f),
                                        )
                                        TextButton(onClick = {
                                            val value = newItem
                                            if (value.isNotBlank()) scope.launch {
                                                when (val result = repository.addChecklistItem(list.checklist.id, value, newItemTimeLimit)) {
                                                    ContentResult.Success -> {
                                                        newItem = ""
                                                        newItemTimeLimit = ChecklistTaskTimeLimit.None
                                                    }
                                                    is ContentResult.Error -> snackbar.showSnackbar(uiText(result.message))
                                                }
                                            }
                                        }) { Text(uiText("Add")) }
                                    }
                                    TextButton(onClick = { showNewItemTimeLimitDialog = true }) {
                                        Text("${uiText("Task time limit")}: ${taskTimeLimitDescription(newItemTimeLimit)}")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (createOpen) {
        AlertDialog(
            onDismissRequest = { createOpen = false },
            title = { Text(uiText("New checklist")) },
            text = { OutlinedTextField(value = newTitle, onValueChange = { newTitle = it }, label = { Text(uiText("Checklist name")) }, singleLine = true) },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        when (val result = repository.createChecklist(newTitle)) {
                            ContentResult.Success -> createOpen = false
                            is ContentResult.Error -> snackbar.showSnackbar(uiText(result.message))
                        }
                    }
                }) { Text(uiText("Create")) }
            },
            dismissButton = { TextButton(onClick = { createOpen = false }) { Text(uiText("Cancel")) } },
        )
    }

    editingChecklist?.let { checklist ->
        AlertDialog(
            onDismissRequest = { editingChecklist = null },
            title = { Text(uiText("Edit checklist")) },
            text = { OutlinedTextField(value = renameTitle, onValueChange = { renameTitle = it }, label = { Text(uiText("Checklist name")) }, singleLine = true) },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        when (val result = repository.renameChecklist(checklist.id, renameTitle)) {
                            ContentResult.Success -> editingChecklist = null
                            is ContentResult.Error -> snackbar.showSnackbar(uiText(result.message))
                        }
                    }
                }) { Text(uiText("Save")) }
            },
            dismissButton = { TextButton(onClick = { editingChecklist = null }) { Text(uiText("Cancel")) } },
        )
    }

    editingItem?.takeUnless { showEditingItemTimeLimitDialog }?.let { task ->
        AlertDialog(
            onDismissRequest = { editingItem = null },
            title = { Text(uiText("Edit task")) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = editingItemText, onValueChange = { editingItemText = it }, label = { Text(uiText("Task")) })
                    TextButton(onClick = { showEditingItemTimeLimitDialog = true }) {
                        Text("${uiText("Task time limit")}: ${taskTimeLimitDescription(editingItemTimeLimit)}")
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    val currentListId = openChecklist?.checklist?.id
                    if (currentListId != null) scope.launch {
                        when (val result = repository.updateChecklistItem(currentListId, task.id, editingItemText, editingItemTimeLimit)) {
                            ContentResult.Success -> editingItem = null
                            is ContentResult.Error -> snackbar.showSnackbar(uiText(result.message))
                        }
                    }
                }) { Text(uiText("Save")) }
            },
            dismissButton = { TextButton(onClick = { editingItem = null }) { Text(uiText("Cancel")) } },
        )
    }

    if (showNewItemTimeLimitDialog) {
        ChecklistTaskTimeLimitDialog(
            initialLimit = newItemTimeLimit,
            onDismiss = { showNewItemTimeLimitDialog = false },
            onSave = { newItemTimeLimit = it; showNewItemTimeLimitDialog = false },
        )
    }
    if (showEditingItemTimeLimitDialog) {
        ChecklistTaskTimeLimitDialog(
            initialLimit = editingItemTimeLimit,
            onDismiss = { showEditingItemTimeLimitDialog = false },
            onSave = { editingItemTimeLimit = it; showEditingItemTimeLimitDialog = false },
        )
    }

    pendingDeleteChecklist?.let { checklist ->
        AlertDialog(
            onDismissRequest = { pendingDeleteChecklist = null },
            title = { Text(uiText("Delete checklist?")) },
            text = { Text(uiText("The list and its items will be removed from this device.")) },
            confirmButton = {
                Button(onClick = {
                    pendingDeleteChecklist = null
                    if (openChecklistId == checklist.id) openChecklistId = null
                    scope.launch { repository.deleteChecklist(checklist.id) }
                }) { Text(uiText("Delete")) }
            },
            dismissButton = { TextButton(onClick = { pendingDeleteChecklist = null }) { Text(uiText("Cancel")) } },
        )
    }
}

@Composable
private fun ChecklistFolderCard(
    checklist: ChecklistWithItems,
    onOpen: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Row(Modifier.fillMaxWidth().padding(start = 14.dp, end = 4.dp, top = 10.dp, bottom = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(14.dp), modifier = Modifier.size(44.dp).clickable(onClick = onOpen)) {
                Box(contentAlignment = Alignment.Center) { Icon(Icons.Filled.FolderOpen, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer) }
            }
            Column(Modifier.weight(1f).clickable(onClick = onOpen).padding(start = 12.dp)) {
                Text(checklist.checklist.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    if (NotebookLanguageSettings.current == NotebookLanguage.BANGLA) "${checklist.remainingCount}টি কাজ বাকি · ${checklist.completedCount}টি সম্পন্ন" else "${checklist.remainingCount} tasks left · ${checklist.completedCount} complete",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            IconButton(onClick = onEdit) { Icon(Icons.Filled.Edit, contentDescription = uiText("Edit checklist")) }
            IconButton(onClick = onDelete) { Icon(Icons.Filled.DeleteOutline, contentDescription = uiText("Delete checklist")) }
        }
    }
}
