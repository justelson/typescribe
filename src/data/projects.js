export const seedProjects = [
  {
    id: 'demo-interview',
    title: 'Demo interview',
    mediaName: 'Import audio to begin',
    mediaUrl: '',
    duration: '03:20',
    updatedAt: 'Demo project',
    status: 'Ready to edit',
    notes: 'A tiny local demo showing Rows view, Cara view, speaker labels, markers, and exports. Import your own audio to create a real project.',
    speakers: [
      { id: 'speaker_1', name: 'I' },
      { id: 'speaker_2', name: 'P1' },
      { id: 'speaker_3', name: 'P2' },
    ],
    segments: [
      {
        id: 'seg_1',
        startMs: 0,
        endMs: 8500,
        speakerId: 'speaker_1',
        text: 'Thanks for joining. I want to understand what changed after the workshop.',
      },
      {
        id: 'seg_2',
        startMs: 9000,
        endMs: 24500,
        speakerId: 'speaker_2',
        text: 'The biggest change is confidence. Before, I would hesitate and ask someone else to handle difficult moments.',
      },
      {
        id: 'seg_3',
        startMs: 25000,
        endMs: 39800,
        speakerId: 'speaker_2',
        text: 'Now I can slow down, explain the process, and keep the person involved instead of rushing through it.',
      },
      {
        id: 'seg_4',
        startMs: 41000,
        endMs: 49800,
        speakerId: 'speaker_1',
        text: 'Was there anything that still felt hard in practice?',
      },
      {
        id: 'seg_5',
        startMs: 50500,
        endMs: 67200,
        speakerId: 'speaker_3',
        text: 'Time pressure is still hard. The training helped, but busy days make it easy to fall back into old habits.',
      },
      {
        id: 'seg_6',
        startMs: 68000,
        endMs: 81500,
        speakerId: 'speaker_1',
        text: 'That is useful. I am going to mark that as something to follow up on in the next session.',
      },
    ],
    markers: [
      {
        id: 'marker_demo_1',
        segmentId: 'seg_5',
        ratio: 0.2,
        caretIndex: 22,
        color: '#ffd166',
        label: 'Time pressure follow-up',
      },
    ],
  },
];

export const settingDefaults = {
  model: 'whisper-large',
  language: 'Detect automatically',
  diarization: true,
  exportFormat: 'Cara MD + SRT',
  wordFollow: false,
};
