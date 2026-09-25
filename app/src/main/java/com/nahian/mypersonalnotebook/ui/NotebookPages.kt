package com.nahian.mypersonalnotebook.ui

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.activity.compose.BackHandler
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Edit
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.nahian.mypersonalnotebook.data.ChecklistWithItems
import com.nahian.mypersonalnotebook.data.ContentResult
import com.nahian.mypersonalnotebook.data.NotebookChecklist
import com.nahian.mypersonalnotebook.data.NotebookContentRepository
import com.nahian.mypersonalnotebook.data.NotebookNote
import com.nahian.mypersonalnotebook.data.TimeReminderRepository
import com.nahian.mypersonalnotebook.domain.NotebookVoiceCommands
import com.nahian.mypersonalnotebook.domain.NotebookVoiceDestination
import com.nahian.mypersonalnotebook.widget.NotebookWidgetProvider
import kotlinx.coroutines.launch

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
    var pendingReminderId by remember(initialReminderId) { mutableStateOf(initialReminderId) }
    var locationNavigationVisible by remember { mutableStateOf(true) }
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

    fun startVoiceCommand() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, if (language == NotebookLanguage.BANGLA) "bn-BD" else "en-US")
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            putExtra(RecognizerIntent.EXTRA_PROMPT, uiText("Say a command like open notes."))
        }
        try {
            voiceLauncher.launch(intent)
        } catch (_: ActivityNotFoundException) {
            scope.launch { voiceSnackbar.showSnackbar(uiText("Voice recognition is unavailable on this device.")) }
        }
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
                        )
                        NotebookSection.SETTINGS -> NotebookSettingsScreen(
                            profileName = profileName,
                            themeMode = themeMode,
                            language = language,
                            onSaveProfile = { name ->
                                NotebookAppSettingsStore.saveProfileName(context, name)
                                profileName = NotebookAppSettingsStore.profileName
                            },
                            onThemeModeChange = onThemeModeChange,
                            onToggleLanguage = ::toggleLanguage,
                            onVoiceCommand = ::startVoiceCommand,
                        )
                    }
                }
            }
            SnackbarHost(
                hostState = voiceSnackbar,
                modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 8.dp),
            )
        }
        if (locationNavigationVisible || section != NotebookSection.LOCATION_REMINDERS) {
            NotebookNavigationBar(
                section = section,
                onSelect = { section = it },
            )
        }
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
                        Text(uiText("NAHIAN'S NOTEBOOK"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text(welcomeText, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                            Text(if (note.title.isBlank()) uiText("Untitled note") else note.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            if (note.body.isNotBlank()) {
                                Text(
                                    note.body,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.padding(top = 5.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
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
                Text(uiText(title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(uiText(subtitle), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NotebookNotesScreen(repository: NotebookContentRepository, onBack: () -> Unit) {
    val notes by repository.observeNotes().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var editorOpen by remember { mutableStateOf(false) }
    var editingNote by remember { mutableStateOf<NotebookNote?>(null) }
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var pendingDelete by remember { mutableStateOf<NotebookNote?>(null) }

    fun openEditor(note: NotebookNote?) {
        editingNote = note
        title = note?.title.orEmpty()
        body = note?.body.orEmpty()
        editorOpen = true
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiText("Notebook")) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back to summary") }
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
                        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.Top) {
                            Column(Modifier.weight(1f).clickable { openEditor(note) }) {
                                Text(if (note.title.isBlank()) uiText("Untitled note") else note.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                if (note.body.isNotBlank()) {
                                    Text(note.body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 4, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 5.dp))
                                }
                            }
                            IconButton(onClick = { openEditor(note) }) { Icon(Icons.Filled.Edit, contentDescription = "Edit note") }
                            IconButton(onClick = { pendingDelete = note }) { Icon(Icons.Filled.DeleteOutline, contentDescription = "Delete note") }
                        }
                    }
                }
            }
        }
    }

    if (editorOpen) {
        AlertDialog(
            onDismissRequest = { editorOpen = false },
            title = { Text(uiText(if (editingNote == null) "New note" else "Edit note")) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text(uiText("Title")) }, singleLine = true)
                    OutlinedTextField(value = body, onValueChange = { body = it }, label = { Text(uiText("Write your note")) }, minLines = 4)
                }
            },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        when (val result = repository.saveNote(editingNote?.id, title, body)) {
                            ContentResult.Success -> editorOpen = false
                            is ContentResult.Error -> snackbar.showSnackbar(uiText(result.message))
                        }
                    }
                }) { Text(uiText("Save")) }
            },
            dismissButton = { TextButton(onClick = { editorOpen = false }) { Text(uiText("Cancel")) } },
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NotebookChecklistsScreen(repository: NotebookContentRepository, onBack: () -> Unit) {
    val checklists by repository.observeChecklists().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var createOpen by remember { mutableStateOf(false) }
    var newTitle by remember { mutableStateOf("") }
    var pendingDelete by remember { mutableStateOf<NotebookChecklist?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiText("Checklists")) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back to summary") }
                },
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(onClick = { newTitle = ""; createOpen = true }, icon = { Icon(Icons.Filled.Add, contentDescription = null) }, text = { Text(uiText("New checklist")) })
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        if (checklists.isEmpty()) {
            Column(
                Modifier.fillMaxSize().padding(padding).padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(Icons.Filled.Checklist, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(56.dp))
                Text(uiText("Make a list you can check off"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 12.dp))
                Text(uiText("Your checklists are saved on this device."), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                Button(onClick = { createOpen = true }, modifier = Modifier.padding(top = 16.dp)) { Text(uiText("Create first checklist")) }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 100.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(checklists, key = { it.checklist.id }) { checklist ->
                    ChecklistCard(
                        checklist = checklist,
                        onCheck = { item, checked -> scope.launch { repository.setChecklistItemChecked(checklist.checklist.id, item.id, checked) } },
                        onAddItem = { text ->
                            scope.launch {
                                when (val result = repository.addChecklistItem(checklist.checklist.id, text)) {
                                    ContentResult.Success -> Unit
                                    is ContentResult.Error -> snackbar.showSnackbar(uiText(result.message))
                                }
                            }
                        },
                        onDeleteItem = { item -> scope.launch { repository.deleteChecklistItem(checklist.checklist.id, item.id) } },
                        onDeleteList = { pendingDelete = checklist.checklist },
                    )
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

    pendingDelete?.let { checklist ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text(uiText("Delete checklist?")) },
            text = { Text(uiText("The list and its items will be removed from this device.")) },
            confirmButton = {
                Button(onClick = {
                    pendingDelete = null
                    scope.launch { repository.deleteChecklist(checklist.id) }
                }) { Text(uiText("Delete")) }
            },
            dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text(uiText("Cancel")) } },
        )
    }
}

@Composable
private fun ChecklistCard(
    checklist: ChecklistWithItems,
    onCheck: (com.nahian.mypersonalnotebook.data.NotebookChecklistItem, Boolean) -> Unit,
    onAddItem: (String) -> Unit,
    onDeleteItem: (com.nahian.mypersonalnotebook.data.NotebookChecklistItem) -> Unit,
    onDeleteList: () -> Unit,
) {
    var newItem by remember(checklist.checklist.id) { mutableStateOf("") }
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.fillMaxWidth().padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(checklist.checklist.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text(if (NotebookLanguageSettings.current == NotebookLanguage.BANGLA) "${checklist.items.size}টির মধ্যে ${checklist.completedCount}টি সম্পন্ন" else "${checklist.completedCount} of ${checklist.items.size} complete", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onDeleteList) { Icon(Icons.Filled.DeleteOutline, contentDescription = "Delete checklist") }
            }
            if (checklist.items.isNotEmpty()) Spacer(Modifier.height(4.dp))
            checklist.items.forEach { item ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = item.isChecked, onCheckedChange = { onCheck(item, it) })
                    Text(
                        item.text,
                        modifier = Modifier.weight(1f).clickable { onCheck(item, !item.isChecked) },
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (item.isChecked) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                    )
                    IconButton(onClick = { onDeleteItem(item) }) { Icon(Icons.Filled.DeleteOutline, contentDescription = "Delete checklist item") }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = newItem,
                    onValueChange = { newItem = it },
                    label = { Text(uiText("Add an item")) },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                TextButton(
                    onClick = {
                        val value = newItem
                        onAddItem(value)
                        if (value.isNotBlank()) newItem = ""
                    },
                ) { Text(uiText("Add")) }
            }
        }
    }
}
