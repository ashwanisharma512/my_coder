/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: 'var(--vscode-editor-background)',
          fg: 'var(--vscode-foreground)',
          sidebg: 'var(--vscode-sideBar-background)',
          sidefg: 'var(--vscode-sideBar-foreground)',
          inputBg: 'var(--vscode-input-background)',
          inputFg: 'var(--vscode-input-foreground)',
          inputBorder: 'var(--vscode-input-border, transparent)',
          btnBg: 'var(--vscode-button-background)',
          btnFg: 'var(--vscode-button-foreground)',
          btnHover: 'var(--vscode-button-hoverBackground)',
          btnSecondaryBg: 'var(--vscode-button-secondaryBackground)',
          btnSecondaryFg: 'var(--vscode-button-secondaryForeground)',
          border: 'var(--vscode-editorWidget-border, var(--vscode-widget-border, #333))',
          badgeBg: 'var(--vscode-badge-background)',
          badgeFg: 'var(--vscode-badge-foreground)',
        },
      },
    },
  },
  plugins: [],
};
