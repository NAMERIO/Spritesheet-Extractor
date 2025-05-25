import React from 'react';
import { GithubIcon, MoonIcon, SunIcon } from 'lucide-react';
import { SpritesheetExtractor } from './components/SpritesheetExtractor';
import { ThemeProvider } from './components/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <header className="border-b border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400">Spritesheet Extractor</h1>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a 
                href="https://github.com/NAMERIO" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                aria-label="View source on GitHub"
              >
                <GithubIcon size={20} />
              </a>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-8">
          <SpritesheetExtractor />
        </main>
        
        <footer className="border-t border-gray-200 dark:border-gray-800 mt-12">
          <div className="container mx-auto px-4 py-6 text-sm text-center text-gray-600 dark:text-gray-400">
           <p>© {new Date().getFullYear()} Spritesheet Extractor. All rights reserved. Built by NAMERIO.</p>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
    </button>
  );
}

export default App;