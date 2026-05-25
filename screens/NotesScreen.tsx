import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { HudButton } from '@/components/HudButton';
import { HudPanel } from '@/components/HudPanel';
import type { NoteDetail, NoteSummary } from '@/services/api';

type NotesScreenProps = {
  notes: NoteSummary[];
  selectedNote: NoteDetail | null;
  selectedNoteId: string | null;
  notesStatus: string;
  notesLoading: boolean;
  newNoteTitle: string;
  newNoteContent: string;
  isNewNoteOpen: boolean;
  onRefresh: () => void;
  onSelectNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onCreateNote: () => void;
  onNewNoteTitleChange: (value: string) => void;
  onNewNoteContentChange: (value: string) => void;
  onToggleNewNote: () => void;
};

export function NotesScreen({
  notes,
  selectedNote,
  selectedNoteId,
  notesStatus,
  notesLoading,
  newNoteTitle,
  newNoteContent,
  isNewNoteOpen,
  onRefresh,
  onSelectNote,
  onDeleteNote,
  onCreateNote,
  onNewNoteTitleChange,
  onNewNoteContentChange,
  onToggleNewNote,
}: NotesScreenProps) {
  return (
    <ScrollView style={styles.panelScroll} contentContainerStyle={styles.notesContent}>
      <View style={styles.notesToolbar}>
        <HudButton title="Nowa notatka" onPress={onToggleNewNote} style={styles.toolbarPrimary} />
        <HudButton title="Odśwież" variant="secondary" onPress={onRefresh} />
      </View>

      {isNewNoteOpen ? (
        <HudPanel style={styles.noteEditor}>
          <Text style={styles.sectionTitle}>Nowa notatka</Text>
          <TextInput
            value={newNoteTitle}
            onChangeText={onNewNoteTitleChange}
            placeholder="Tytuł"
            placeholderTextColor="#6e8397"
            style={styles.input}
          />
          <TextInput
            value={newNoteContent}
            onChangeText={onNewNoteContentChange}
            multiline
            placeholder="Treść"
            placeholderTextColor="#6e8397"
            style={[styles.input, styles.noteContentInput]}
          />
          <HudButton title="Zapisz notatkę" onPress={onCreateNote} disabled={notesLoading} />
        </HudPanel>
      ) : null}

      {notesStatus ? (
        <Text selectable style={styles.notesStatus}>
          {notesStatus}
        </Text>
      ) : null}

      {notesLoading ? <ActivityIndicator color="#22f2ff" /> : null}

      <View style={styles.noteList}>
        {notes.map((note) => (
          <HudButton
            key={note.id}
            title={`${note.title}\n${note.createdAt}`}
            variant="ghost"
            active={selectedNoteId === note.id}
            onPress={() => onSelectNote(note.id)}
            style={styles.noteRow}
          />
        ))}
      </View>

      {selectedNote ? (
        <HudPanel style={styles.notePreview}>
          <Text style={styles.sectionTitle}>{selectedNote.title}</Text>
          <Text selectable style={styles.noteDate}>
            {selectedNote.createdAt}
          </Text>
          <Text selectable style={styles.noteBody}>
            {selectedNote.content}
          </Text>
          <HudButton
            title="Usuń"
            variant="danger"
            onPress={() => onDeleteNote(selectedNote.id)}
            disabled={notesLoading}
          />
        </HudPanel>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panelScroll: {
    flex: 1,
  },
  notesContent: {
    gap: 18,
    padding: 18,
    paddingBottom: 26,
  },
  notesToolbar: {
    flexDirection: 'row',
    gap: 12,
  },
  toolbarPrimary: {
    flex: 1,
  },
  noteEditor: {
    gap: 12,
  },
  sectionTitle: {
    color: '#f2fbff',
    fontSize: 22,
    fontWeight: '900',
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#1e6f9b',
    borderRadius: 8,
    backgroundColor: '#081322',
    color: '#f2fbff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
  },
  noteContentInput: {
    minHeight: 132,
    textAlignVertical: 'top',
  },
  notesStatus: {
    color: '#9ab2ca',
    fontSize: 16,
    lineHeight: 24,
  },
  noteList: {
    gap: 12,
  },
  noteRow: {
    minHeight: 72,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#1e3569',
    backgroundColor: '#081322',
  },
  notePreview: {
    gap: 12,
    borderColor: '#2c1f70',
    backgroundColor: '#0d0a22',
  },
  noteDate: {
    color: '#9ab2ca',
    fontSize: 14,
    lineHeight: 20,
  },
  noteBody: {
    color: '#d8edf4',
    fontSize: 17,
    lineHeight: 26,
  },
});
