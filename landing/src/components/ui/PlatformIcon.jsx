const iconPaths = {
  windows: '/assets/os-windows.svg',
  macos: '/assets/os-apple.svg',
  linux: '/assets/os-linux.svg',
};

export const platforms = [
  { key: 'windows', label: 'Windows' },
  { key: 'macos', label: 'macOS' },
  { key: 'linux', label: 'Linux' },
];

export function PlatformIcon({ platform, className = '' }) {
  return <img className={`platform-icon h-5 w-5 object-contain ${className}`} src={iconPaths[platform.key]} alt="" />;
}
