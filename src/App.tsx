import React from 'react';
import { RouterProvider, useRouter } from './website/router';
import { Navbar } from './website/components/Navbar';
import { Footer } from './website/components/Footer';
import { CommandPalette } from './website/components/CommandPalette';
import { HomePage } from './website/pages/HomePage';
import { FeaturesPage } from './website/pages/FeaturesPage';
import { DownloadPage } from './website/pages/DownloadPage';
import { ChromeExtensionPage } from './website/pages/ChromeExtensionPage';
import { GalleryPage } from './website/pages/GalleryPage';
import { ChangelogPage } from './website/pages/ChangelogPage';
import { FAQPage } from './website/pages/FAQPage';
import { SupportPage } from './website/pages/SupportPage';
import { PrivacyPolicyPage } from './website/pages/PrivacyPolicyPage';
import { TermsPage } from './website/pages/TermsPage';
import { PlaygroundPage } from './website/pages/PlaygroundPage';

const AppContent: React.FC = () => {
  const { currentRoute } = useRouter();

  const renderPage = () => {
    switch (currentRoute) {
      case 'home':
        return <HomePage />;
      case 'features':
        return <FeaturesPage />;
      case 'download':
        return <DownloadPage />;
      case 'chrome-extension':
        return <ChromeExtensionPage />;
      case 'gallery':
        return <GalleryPage />;
      case 'changelog':
        return <ChangelogPage />;
      case 'faq':
        return <FAQPage />;
      case 'support':
        return <SupportPage />;
      case 'privacy':
        return <PrivacyPolicyPage />;
      case 'terms':
        return <TermsPage />;
      case 'playground':
        return <PlaygroundPage />;
      default:
        return <HomePage />;
    }
  };

  const isPlayground = currentRoute === 'playground';

  return (
    <div className={`site-shell min-h-screen flex flex-col selection:bg-blue-600 selection:text-white relative${isPlayground ? ' site-shell--playground' : ''}`}>
      <Navbar />

      <main className="flex-1 flex flex-col">
        {renderPage()}
      </main>

      {!isPlayground && <Footer />}

      <CommandPalette />
    </div>
  );
};

export default function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}
