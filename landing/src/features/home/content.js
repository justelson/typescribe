export const capabilities = ['Timed Rows', 'Cara documents', 'Playback sync', 'Markers', 'Find and replace', 'Speaker cleanup', 'Controlled exports'];

export const tools = [
  { number: '01', tone: 'item-pink', rotate: '-2deg', image: 'tool-headphones.webp', alt: 'Retro headphones.', title: 'Playback sync', copy: 'Hear the line and keep the active text in view.', note: 'Space', noteType: 'key' },
  { number: '02', tone: 'item-yellow', rotate: '2deg', image: 'tool-recorder.webp', alt: 'Retro cassette recorder.', title: 'Timed Rows', copy: 'Work directly against speaker segments and timecodes.', note: 'Ctrl 1', noteType: 'key' },
  { number: '03', tone: 'item-cream', rotate: '-1deg', image: 'tool-typewriter.webp', alt: 'Retro typewriter feeding a page.', title: 'Cara documents', copy: 'Read and edit the same transcript as clean paragraphs.', note: 'Ctrl 2', noteType: 'key' },
  { number: '04', tone: 'item-yellow', rotate: '1deg', image: 'tool-folders.webp', alt: 'Tabbed office folders.', title: 'Local project desk', copy: 'Project edits, layout, markers, and playback position save on this device.', note: 'Media transcription is the network step.', noteType: 'small' },
  { number: '05', tone: 'item-pink', rotate: '-2deg', image: 'tool-highlighter.webp', alt: 'Highlighter beside a marked page.', title: 'Markers + find', copy: 'Bookmark a moment, search the active view, and repair repeated text.', note: 'Ctrl M · Ctrl F', noteType: 'key' },
  { number: '06', tone: 'item-cream', rotate: '2deg', image: 'tool-reels.webp', alt: 'Reel-to-reel tape machine.', title: 'Controlled exports', copy: 'Choose a time or marker range, then export Cara MD, timed TXT, SRT, or DOC.', note: 'Audio clips work when configured.', noteType: 'small' },
];

export const workflow = [
  ['01', 'Import local media', 'Open an audio or video file and start a project.', 'ON DEVICE'],
  ['02', 'Run Deepgram when you choose', 'The selected media leaves the device for transcription and returns as timed speaker rows.', 'NETWORK STEP'],
  ['03', 'Clean Rows against the audio', 'Fix text, speakers, splits, and the moments that need another listen.', 'PRECISE'],
  ['04', 'Shape the Cara document', 'Turn the same segments into readable speaker paragraphs.', 'READABLE'],
  ['05', 'Mark the range and send it', 'Choose the section and format needed for the handoff.', 'CONTROLLED'],
];

export const roles = [
  ['Secretaries', 'Move from recording to minutes without losing the source.'],
  ['Executive assistants', 'Find decisions, names, and follow-ups while the audio stays close.'],
  ['Researchers', 'Review interviews in Rows, then clean the readable document.'],
  ['Transcriptionists', 'Use keyboard shortcuts, markers, speakers, and range exports all day.'],
];
