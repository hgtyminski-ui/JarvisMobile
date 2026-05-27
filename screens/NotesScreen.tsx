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
        <HudButton title="Odśwież" variant="secondary" onPress={onRefresh} style={styles.toolbarButton} />
      </View>

      {isNewNoteOpen ? (
        <HudPanel style={styles.noteEditor}>
          <Text style={styles.sectionTitle}>NOWA NOTATKA</Text>
          <TextInput
            value={newNoteTitle}
            onChangeText={onNewNoteTitleChange}
            placeholder="Tytuł"
            placeholderTextColor="#6f829b"
            style={styles.input}
          />
          <TextInput
            value={newNoteContent}
            onChangeText={onNewNoteContentChange}
            multiline
            placeholder="Treść"
            placeholderTextColor="#6f829b"
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

      {notesLoading ? <ActivityIndicator color="#35e7f5" /> : null}

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
          <Text selectable style={styles.sectionTitle}>
            {selectedNote.title}
          </Text>
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
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  notesToolbar: {
    flexDirection: 'row',
    gap: 10,
  },
  toolbarPrimary: {
    flex: 1,
  },
  toolbarButton: {
    minWidth: 112,
  },
  noteEditor: {
    gap: 10,
  },
  sectionTitle: {
    color: '#35e7f5',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: 'rgba(21, 223, 255, 0.32)',
    borderRadius: 10,
    backgroundColor: 'rgba(6, 18, 36, 0.62)',
    color: '#e9fbff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  noteContentInput: {
    minHeight: 108,
    textAlignVertical: 'top',
  },
  notesStatus: {
    color: '#9cb2c9',
    fontSize: 14,
    lineHeight: 21,
  },
  noteList: {
    gap: 10,
  },
  noteRow: {
    minHeight: 62,
    alignItems: 'flex-start',
    borderColor: 'rgba(21, 223, 255, 0.24)',
  },
  notePreview: {
    gap: 10,
    borderColor: 'rgba(161, 125, 255, 0.42)',
    backgroundColor: 'rgba(13, 10, 34, 0.62)',
  },
  noteDate: {
    color: '#9cb2c9',
    fontSize: 12,
    lineHeight: 18,
  },
  noteBody: {
    color: '#d8edf4',
    fontSize: 15,
    lineHeight: 23,
  },
});
