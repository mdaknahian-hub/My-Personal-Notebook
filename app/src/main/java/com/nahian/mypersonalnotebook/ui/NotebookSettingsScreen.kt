package com.nahian.mypersonalnotebook.ui

import androidx.compose.animation.animateContentSize
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun NotebookSettingsScreen(
    profileName: String,
    themeMode: NotebookThemeMode,
    language: NotebookLanguage,
    onSaveProfile: (String) -> Unit,
    onThemeModeChange: (NotebookThemeMode) -> Unit,
    onToggleLanguage: () -> Unit,
    onVoiceCommand: () -> Unit,
) {
    var name by remember(profileName) { mutableStateOf(profileName) }
    var savedName by remember(profileName) { mutableStateOf(profileName) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

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
                                    if (name.isBlank()) {
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
                            uiText("Profile details stay on this device; no account or cloud sync."),
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
